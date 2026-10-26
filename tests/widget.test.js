import { buildWidgetSummary, parseLaunchAction, summarySignature } from "../src/widgetSummary.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

const tx = (o) => ({ id: Math.random().toString(36).slice(2), ...o });

describe("сводка для виджета", () => {
  const today = "2026-10-26";
  const list = [
    tx({ type: "income", amount: 90000, date: "2026-10-05", card: "sber" }),
    tx({ type: "transfer", amount: 27000, date: "2026-10-05", fromCard: "sber", toCard: "alfa" }),
    tx({ type: "transfer", amount: 18000, date: "2026-10-05", fromCard: "sber", toCard: "ozon" }),
    tx({ type: "expense", amount: 1200.4, date: today, card: "sber", bucket: "needs", category: "Продукты" }),
    tx({ type: "expense", amount: 800, date: today, card: "alfa", bucket: "wants", category: "Подписки" }),
    tx({ type: "expense", amount: 5000, date: "2026-10-10", card: "sber", bucket: "needs", category: "ЖКХ" }),
  ];

  it("остатки, траты за сегодня и за месяц", () => {
    const s = buildWidgetSummary(list, DEFAULT_SETTINGS, today, new Date("2026-10-26T10:00:00Z"));
    expect(s.v).toBe(1);
    expect(s.bal).toEqual({ sber: 45000 - 1200 - 5000, alfa: 27000 - 800, ozon: 18000 });
    expect(s.today).toBe(2000);
    expect(s.income).toBe(90000);
    expect(s.spent).toBe(7000);
    expect(s.names).toEqual({ sber: "Нужды", alfa: "Желания", ozon: "Подушка" });
    expect(s.av).toEqual({ sber: 45000, alfa: 27000 });   // поступило за месяц: доход минус переводы, плюс полученные переводы
    expect(typeof s.goal).toBe("number");
    expect(s.at).toBe("2026-10-26T10:00:00.000Z");
  });

  it("суммы округляются до рублей, а сводка маленькая (сервер принимает до 4 КБ)", () => {
    const s = buildWidgetSummary(list, DEFAULT_SETTINGS, today);
    Object.values(s.bal).forEach((v) => expect(Number.isInteger(v)).toBe(true));
    expect(JSON.stringify(s).length).toBeLessThan(500);
  });

  it("без операций получаются нули, без ошибок", () => {
    const s = buildWidgetSummary([], DEFAULT_SETTINGS, today);
    expect(s.bal).toEqual({ sber: 0, alfa: 0, ozon: 0 });
    expect(s.today).toBe(0);
  });

  it("подпись не зависит от времени отправки (чтобы не слать одно и то же)", () => {
    const a = buildWidgetSummary(list, DEFAULT_SETTINGS, today, new Date("2026-10-26T10:00:00Z"));
    const b = buildWidgetSummary(list, DEFAULT_SETTINGS, today, new Date("2026-10-26T11:00:00Z"));
    expect(summarySignature(a)).toBe(summarySignature(b));
    const c = buildWidgetSummary([...list, tx({ type: "expense", amount: 1, date: today, card: "sber", bucket: "needs", category: "Продукты" })], DEFAULT_SETTINGS, today);
    expect(summarySignature(c)).not.toBe(summarySignature(a));
  });
});

describe("запуск по ярлыку и кнопкам виджета", () => {
  it("понимает три действия", () => {
    expect(parseLaunchAction("?add=expense")).toEqual({ type: "expense" });
    expect(parseLaunchAction("?add=income")).toEqual({ type: "income" });
    expect(parseLaunchAction("?add=scan")).toEqual({ type: "expense", autoScan: true });
  });

  it("обычный запуск и посторонние значения ничего не открывают", () => {
    expect(parseLaunchAction("")).toBeNull();
    expect(parseLaunchAction("?add=hack")).toBeNull();
    expect(parseLaunchAction("?code=abc&state=x")).toBeNull();
  });
});
