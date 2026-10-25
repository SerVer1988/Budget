/* Технический журнал для отчётов о проблемах.
   В журнал попадают только сообщения об ошибках (тексты исключений, сетевые сбои), без операций, сумм и заметок;
   на всякий случай из них вычищаются почты, ключи и длинные числа. Журнал хранится на устройстве и уходит
   разработчику только если пользователь сам нажал «Сообщить о проблеме» и согласился. */

const KEY = "budget-app:diag";
const MAX_ENTRIES = 60;
const MAX_TEXT = 400;

/* Убирает из текста всё, что похоже на личные данные или секреты. */
export function scrub(input) {
  let s = String(input ?? "");
  s = s.replace(/eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g, "[jwt]");                                   // токены входа
  s = s.replace(/(access_token|refresh_token|token|apikey|api_key|key|password|pass)=([^&\s"']+)/gi, "$1=[скрыто]");
  s = s.replace(/Bearer\s+[\w.~+/=-]+/gi, "Bearer [скрыто]");
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[почта]");                                          // адреса почты
  s = s.replace(/\d{5,}/g, "#");                                                                    // длинные числа (суммы, номера)
  s = s.replace(/\s+/g, " ").trim();
  return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT - 1) + "…" : s;
}

/* Журнал-кольцо с подменяемым хранилищем (так его можно проверить автотестом). */
export function createLog(store, key = KEY, max = MAX_ENTRIES) {
  const read = () => {
    try {
      const v = JSON.parse(store.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    add(kind, text, now = new Date()) {
      const entries = read();
      entries.push({ t: now.toISOString(), k: String(kind).slice(0, 20), m: scrub(text) });
      try {
        store.setItem(key, JSON.stringify(entries.slice(-max)));
      } catch { /* хранилище переполнено — журнал не критичен */ }
    },
    read,
    clear() {
      try { store.removeItem(key); } catch { /* ignore */ }
    },
  };
}

export function formatLog(entries) {
  if (!entries.length) return "(ошибок не было)";
  return entries.map((e) => `${e.t.replace("T", " ").slice(0, 19)} [${e.k}] ${e.m}`).join("\n");
}

const hasStorage = typeof localStorage !== "undefined";
const log = hasStorage ? createLog(localStorage) : createLog({ getItem: () => null, setItem() {}, removeItem() {} });

export const diag = {
  add: (kind, text) => log.add(kind, text),
  read: () => log.read(),
  clear: () => log.clear(),
  text: () => formatLog(log.read()),
};

let installed = false;
/* Подключает перехват ошибок: окно, необработанные промисы и console.error (поведение консоли не меняется). */
export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    diag.add("error", `${e.message || "ошибка"} (${(e.filename || "").split("/").pop()}:${e.lineno || 0})`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    diag.add("promise", r && r.message ? r.message : String(r));
  });
  const original = console.error;
  console.error = function (...args) {
    try { diag.add("console", args.map((a) => (a && a.message) || String(a)).join(" ")); } catch { /* ignore */ }
    original.apply(console, args);
  };
}
