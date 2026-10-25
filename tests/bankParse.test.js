import { parseBankText, refineDirection } from "../src/bankParse.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

const parse = (text, source = "sber") => parseBankText(text, source, DEFAULT_SETTINGS);

describe("разбор банковских уведомлений", () => {
  it("покупка Сбера: сумма, направление и остаток", () => {
    const p = parse("MIR-3104 13:26 Покупка 635р MAGNIT Баланс: 12345р");
    expect(p.understood).toBe(true);
    expect(p.type).toBe("expense");
    expect(p.amount).toBe(635);
    expect(p.balance).toBe(12345);
  });

  it("зачисление: доход", () => {
    const p = parse("Зачисление 50000р Зарплата Баланс: 62000р");
    expect(p.type).toBe("income");
    expect(p.amount).toBe(50000);
  });

  it("знак «+» делает доходом, «-» расходом", () => {
    expect(parse("Альфа-Банк: +17 744 ₽ Баланс 20 000 ₽", "alfa").type).toBe("income");
    expect(parse("Альфа-Банк: -1 730 ₽ Баланс 18 270 ₽", "alfa").type).toBe("expense");
  });

  it("остаток, а не сумма операции, не принимается за сумму", () => {
    const p = parse("Покупка 100р MAGNIT Баланс: 900р");
    expect(p.amount).toBe(100);
    expect(p.balance).toBe(900);
  });

  it("текст без суммы не считается понятым", () => {
    expect(parse("Привет! Ваша карта готова к выдаче.").understood).toBe(false);
  });
});

describe("направление по остатку (исправление «+100 ₽ вместо траты»)", () => {
  it("если остаток упал на сумму, это расход, даже при «+» в тексте", () => {
    const p = refineDirection(parse("СберБанк +100 ₽ Оплата. Баланс: 900р"), 1000);
    expect(p.type).toBe("expense");
  });

  it("если остаток вырос на сумму, это доход", () => {
    const p = refineDirection(parse("Покупка 100р MAGNIT Баланс: 1100р"), 1000);
    expect(p.type).toBe("income");
  });

  it("без прежнего остатка текст не переопределяется", () => {
    const p = refineDirection(parse("Покупка 100р MAGNIT Баланс: 900р"), undefined);
    expect(p.type).toBe("expense");
  });

  it("настоящее зачисление остаётся доходом", () => {
    const p = refineDirection(parse("Поступление +100 ₽ Баланс: 1100р"), 1000);
    expect(p.type).toBe("income");
  });
});
