import { buildSampleData, hasSample, removeSample } from "../src/sampleData.js";
import { computeBalances } from "../src/finance.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

describe("пример данных", () => {
  const days = ["2026-10-01", "2026-10-03", "2026-10-15", "2026-10-31", "2026-01-02"];

  it("все записи помечены как пример и имеют обязательные поля", () => {
    const list = buildSampleData("2026-10-20");
    expect(list.length).toBeGreaterThan(20);
    list.forEach((t) => {
      expect(t.sample).toBe(true);
      expect(t.id).toBeTruthy();
      expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.amount).toBeGreaterThan(0);
      if (t.type === "expense") {
        expect(["sber", "alfa", "ozon"]).toContain(t.card);
        expect(["needs", "wants"]).toContain(t.bucket);
        expect(t.category).toBeTruthy();
      }
      if (t.type === "transfer") {
        expect(t.fromCard).not.toBe(t.toCard);
      }
    });
  });

  it("не бывает записей из будущего, в любой день месяца", () => {
    days.forEach((today) => {
      buildSampleData(today).forEach((t) => expect(t.date <= today).toBe(true));
    });
  });

  it("идентификаторы не повторяются", () => {
    const ids = buildSampleData("2026-10-20").map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ни на одной карте нет отрицательного остатка", () => {
    days.forEach((today) => {
      const b = computeBalances(buildSampleData(today), DEFAULT_SETTINGS);
      expect(b.sber).toBeGreaterThanOrEqual(0);
      expect(b.alfa).toBeGreaterThanOrEqual(0);
      expect(b.ozon).toBeGreaterThanOrEqual(0);
    });
  });

  it("зарплата распределена 50/30/20", () => {
    const b = computeBalances(buildSampleData("2026-10-01").filter((t) => t.type !== "expense"), DEFAULT_SETTINGS);
    // два месяца по 90 000 → «Нужды» 90 000, «Желания» 54 000, «Подушка» 36 000
    expect(b).toEqual({ sber: 90000, alfa: 54000, ozon: 36000 });
  });

  it("пример удаляется, а настоящие операции остаются", () => {
    const real = { id: "mine", type: "expense", amount: 500, date: "2026-10-01", card: "sber", bucket: "needs", category: "Продукты" };
    const all = [...buildSampleData("2026-10-20"), real];
    expect(hasSample(all)).toBe(true);
    const cleaned = removeSample(all);
    expect(cleaned).toEqual([real]);
    expect(hasSample(cleaned)).toBe(false);
  });

  it("январь: прошлый месяц — декабрь предыдущего года", () => {
    const list = buildSampleData("2026-01-10");
    expect(list.some((t) => t.date.startsWith("2025-12"))).toBe(true);
  });
});
