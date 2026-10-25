// Минимальная «браузерная» среда для проверки компонентов без настоящего браузера.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
globalThis.window = globalThis.window || {
  location: { hash: "", pathname: "/", search: "", origin: "https://example.test" },
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  matchMedia: () => ({ matches: false }),
  innerWidth: 390,
  innerHeight: 800,
};
// В новых версиях Node navigator уже есть и только для чтения: заменяем его через defineProperty.
if (typeof globalThis.navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "test", language: "ru-RU" }, configurable: true });
}
