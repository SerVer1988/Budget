import { balanceFor, guessSharedCat, itemsOfMonth, monthSummary } from "../src/shared.js";

describe("общая книга пары", () => {
  const me = "A";
  const items = [
    { id: 1, date: "2026-10-02", amount: 1000, paidBy: "A", catId: "groceries" },          // партнёр должен мне 500
    { id: 2, date: "2026-10-05", amount: 600, paidBy: "B", catId: "utilities" },            // я должен 300
    { id: 3, date: "2026-10-06", amount: 200, paidBy: "A", split: 0, catId: "kids" },       // всё на партнёре: +200
    { id: 4, date: "2026-10-09", kind: "settle", amount: 100, paidBy: "B" },                // партнёр отдал мне 100
    { id: 5, date: "2026-10-10", amount: 5000, paidBy: "A", pool: true, catId: "rent" },    // с общей карты: долгов нет
  ];

  it("баланс: кто кому должен", () => {
    expect(balanceFor(items, me)).toBe(500 - 300 + 200 - 100);
    expect(balanceFor(items, "B")).toBe(-(500 - 300 + 200 - 100));
  });

  it("траты с общей карты не создают долга", () => {
    expect(balanceFor([items[4]], me)).toBe(0);
  });

  it("итоги месяца: всего, кто сколько заплатил, с общих карт", () => {
    const s = monthSummary(itemsOfMonth(items, "2026-10"), me);
    expect(s.total).toBe(1000 + 600 + 200 + 5000);
    expect(s.pool).toBe(5000);
    expect(s.mine).toBe(1200);
    expect(s.theirs).toBe(600);
    expect(s.byCat.rent).toBe(5000);
  });

  it("расчёт не считается тратой", () => {
    expect(monthSummary([items[3]], me).total).toBe(0);
  });

  it("общая категория подбирается по названию личной", () => {
    expect(guessSharedCat([], "Продукты")).toBe("groceries");
    expect(guessSharedCat([], "что-то непонятное")).toBe("other");
  });
});
