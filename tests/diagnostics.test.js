import { createLog, formatLog, scrub } from "../src/diagnostics.js";

const fakeStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

describe("scrub: из журнала убирается всё личное", () => {
  it("прячет адреса почты", () => {
    expect(scrub("ошибка для user@mail.ru и admin@gmail.com")).toBe("ошибка для [почта] и [почта]");
  });
  it("прячет токены и ключи", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk";
    expect(scrub(`Bearer ${jwt}`)).not.toContain("eyJ");
    expect(scrub("url?access_token=SECRET123&x=1")).toBe("url?access_token=[скрыто]&x=1");
  });
  it("заменяет длинные числа, но не трогает короткие", () => {
    expect(scrub("сумма 1234567 ₽, код 500, строка 42")).toBe("сумма # ₽, код 500, строка 42");
  });
  it("обрезает очень длинный текст", () => {
    expect(scrub("а".repeat(2000)).length).toBeLessThanOrEqual(400);
  });
  it("переживает пустые значения", () => {
    expect(scrub(undefined)).toBe("");
    expect(scrub(null)).toBe("");
  });
});

describe("журнал ошибок", () => {
  it("хранит записи и чистит их", () => {
    const log = createLog(fakeStore());
    log.add("error", "первая", new Date("2026-10-25T10:00:00Z"));
    log.add("promise", "вторая", new Date("2026-10-25T10:01:00Z"));
    expect(log.read().map((e) => e.m)).toEqual(["первая", "вторая"]);
    log.clear();
    expect(log.read()).toEqual([]);
  });
  it("не растёт бесконечно: хранит только последние записи", () => {
    const log = createLog(fakeStore(), "k", 5);
    for (let i = 0; i < 12; i++) log.add("error", `ошибка ${i}`);
    const msgs = log.read().map((e) => e.m);
    expect(msgs).toHaveLength(5);
    expect(msgs[4]).toBe("ошибка 11");
  });
  it("повреждённое хранилище не ломает чтение", () => {
    const s = fakeStore();
    s.setItem("k", "{не json");
    expect(createLog(s, "k").read()).toEqual([]);
  });
  it("форматируется читаемо", () => {
    const text = formatLog([{ t: "2026-10-25T10:00:00.000Z", k: "error", m: "сбой" }]);
    expect(text).toBe("2026-10-25 10:00:00 [error] сбой");
    expect(formatLog([])).toBe("(ошибок не было)");
  });
});
