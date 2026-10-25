import { aggregateMonth, computeBalances } from "../src/finance.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

const tx = (o) => ({ id: Math.random().toString(36).slice(2), ...o });

describe("остатки по картам", () => {
  it("доход, расход и перевод считаются правильно", () => {
    const list = [
      tx({ type: "income", amount: 1000, date: "2026-10-01", card: "sber" }),
      tx({ type: "expense", amount: 300, date: "2026-10-02", card: "sber", bucket: "needs", category: "Продукты" }),
      tx({ type: "transfer", amount: 200, date: "2026-10-03", fromCard: "sber", toCard: "ozon" }),
    ];
    expect(computeBalances(list, DEFAULT_SETTINGS)).toEqual({ sber: 500, alfa: 0, ozon: 200 });
  });

  it("начальные остатки учитываются", () => {
    const settings = { ...DEFAULT_SETTINGS, openingBalance: { sber: 100, alfa: 50, ozon: 0 } };
    expect(computeBalances([], settings)).toEqual({ sber: 100, alfa: 50, ozon: 0 });
  });

  it("корректировка меняет остаток на свою сумму", () => {
    const list = [tx({ type: "adjustment", amount: -250, date: "2026-10-01", card: "alfa" })];
    expect(computeBalances(list, DEFAULT_SETTINGS).alfa).toBe(-250);
  });

  it("операции позже указанной даты не учитываются", () => {
    const list = [
      tx({ type: "income", amount: 100, date: "2026-10-01", card: "sber" }),
      tx({ type: "income", amount: 900, date: "2026-10-20", card: "sber" }),
    ];
    expect(computeBalances(list, DEFAULT_SETTINGS, "2026-10-10").sber).toBe(100);
  });
});

describe("итоги месяца", () => {
  it("«не заработок» лежит на карте, но доходом месяца не считается", () => {
    const list = [
      tx({ type: "income", amount: 1000, date: "2026-10-01", card: "sber" }),
      tx({ type: "income", amount: 400, date: "2026-10-02", card: "sber", excludeIncome: true }),
    ];
    const m = aggregateMonth("2026-10", list, DEFAULT_SETTINGS);
    expect(m.incomeTotal).toBe(1000);
    expect(computeBalances(list, DEFAULT_SETTINGS).sber).toBe(1400);
  });

  it("траты месяца попадают в свои категории", () => {
    const list = [
      tx({ type: "expense", amount: 100, date: "2026-10-02", card: "sber", bucket: "needs", category: "Продукты" }),
      tx({ type: "expense", amount: 50, date: "2026-10-03", card: "sber", bucket: "needs", category: "Продукты" }),
      tx({ type: "expense", amount: 70, date: "2026-10-04", card: "alfa", bucket: "wants", category: "Подписки" }),
      tx({ type: "expense", amount: 999, date: "2026-09-04", card: "alfa", bucket: "wants", category: "Подписки" }),
    ];
    const m = aggregateMonth("2026-10", list, DEFAULT_SETTINGS);
    expect(m.needCatTotals["Продукты"]).toBe(150);
    expect(m.wantCatTotals["Подписки"]).toBe(70);
  });
});
