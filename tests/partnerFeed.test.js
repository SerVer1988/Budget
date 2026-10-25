import { planPartnerNotices } from "../src/partnerFeed.js";

const names = { me: "С", partner: "Катя", shared: "Общая" };
const catNameOf = () => "Продукты";
const today = "2026-10-18";
const plan = (state, personal, shared) => planPartnerNotices({ state, personal, shared, partnerId: "B", names, catNameOf, today });

describe("уведомления о тратах партнёра", () => {
  it("при первом запуске молчит и запоминает всё как увиденное", () => {
    const r = plan({ personal: null, shared: null }, [{ id: "a", type: "expense", date: "2026-10-17", amount: 300 }], []);
    expect(r.lines).toEqual([]);
    expect(r.state.personal).toEqual(["a"]);
  });

  it("новая личная трата попадает в уведомление, а скрытые, чужие и старые нет", () => {
    const state = { personal: ["a"], shared: [] };
    const personal = [
      { id: "a", type: "expense", date: "2026-10-17", amount: 300 },
      { id: "b", type: "expense", date: "2026-10-18", amount: 500, category: "Кафе" },
      { id: "c", type: "expense", date: "2026-10-18", amount: 90, sharedId: "s1" },              // идёт через общую книгу
      { id: "d", type: "adjustment", date: "2026-10-18", amount: 5, hidden: true },               // служебная
      { id: "old", type: "expense", date: "2026-01-01", amount: 7 },                              // старше 14 дней
    ];
    const r = plan(state, personal, null);
    expect(r.lines).toEqual(["Катя: Кафе 500 ₽"]);
  });

  it("общая трата партнёра уведомляет, а моя собственная нет", () => {
    const state = { personal: [], shared: [] };
    const shared = [
      { id: "s1", date: "2026-10-18", amount: 90, catId: "x", createdBy: "B" },
      { id: "s2", date: "2026-10-18", amount: 10, catId: "x", createdBy: "A" },
    ];
    const r = plan(state, null, shared);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toContain("Катя");
  });

  it("одно и то же уведомление не приходит дважды", () => {
    const personal = [{ id: "b", type: "expense", date: "2026-10-18", amount: 500 }];
    const first = plan({ personal: [], shared: [] }, personal, null);
    const second = plan(first.state, personal, null);
    expect(first.lines).toHaveLength(1);
    expect(second.lines).toHaveLength(0);
  });

  it("пример данных партнёра не вызывает потока уведомлений", () => {
    const personal = [{ id: "z", type: "expense", date: "2026-10-18", amount: 500, sample: true }];
    expect(plan({ personal: [], shared: [] }, personal, null).lines).toEqual([]);
  });
});
