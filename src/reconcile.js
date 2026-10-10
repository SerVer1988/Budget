import { computeBalances } from "./finance.js";

/* Сверка остатков с банком.
   Любое уведомление (SMS или push) с «Баланс / Доступно / Остаток» запоминается как последний известный остаток банка.
   Дальше он сравнивается с остатком в приложении с учётом операций, которые ещё лежат в листе ожидания и уже
   учтены банком. Если разница не меньше 1 ₽ — в листе ожидания появляется строка «Корректировка баланса». */

const CARDS = ["sber", "alfa", "ozon"];
const REC_KEY = "budget:lastbal:"; // + банк → { b, at }
const IGN_KEY = "budget:balcheck-ign"; // { банк: время остатка, который пользователь убрал }
const OFF_KEY = "budget:balcheck-off"; // [банки, которые не сверяем]
const OK_KEY = "budget:balcheck-ok"; // { банк: время остатка, о совпадении которого уже сказали }
const FRESH_MS = 30 * 24 * 3600 * 1000;
const OK_TOAST_MS = 5 * 60 * 1000;

const BANK = { sber: "Сбер", alfa: "Альфа", ozon: "Озон" };
export const bankName = (card) => BANK[card] || card;

function lsGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch { /* хранилище недоступно */ }
}
function lsJson(k, fallback) {
  try { return JSON.parse(lsGet(k) || "") ?? fallback; } catch { return fallback; }
}

function localDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* Запомнить остаток из уведомления, если оно новее уже известного. */
export function recordBalance(card, balance, atIso) {
  if (!CARDS.includes(card) || typeof balance !== "number" || !Number.isFinite(balance)) return;
  const at = Date.parse(atIso);
  if (!at) return;
  const cur = lsJson(REC_KEY + card, null);
  if (cur && Date.parse(cur.at) > at) return;
  lsSet(REC_KEY + card, JSON.stringify({ b: balance, at: new Date(at).toISOString() }));
}

/* Убрать расхождение: не показывать его, пока не придёт более новый остаток. */
export function ignoreMismatch(card, atIso) {
  const m = lsJson(IGN_KEY, {});
  m[card] = atIso;
  lsSet(IGN_KEY, JSON.stringify(m));
}

/* Совсем не сверять этот банк (например, если у вас несколько карт в одном банке). */
export function disableBank(card) {
  const list = lsJson(OFF_KEY, []);
  if (!list.includes(card)) list.push(card);
  lsSet(OFF_KEY, JSON.stringify(list));
}

/* Сказать «остаток сошёлся» один раз и только про свежий остаток. */
export function markOkNotified(card, atIso, now = Date.now()) {
  const at = Date.parse(atIso);
  if (!at || now - at > OK_TOAST_MS) return false;
  const m = lsJson(OK_KEY, {});
  if (m[card] && Date.parse(m[card]) >= at) return false;
  m[card] = atIso;
  lsSet(OK_KEY, JSON.stringify(m));
  return true;
}

/* rows — записи листа ожидания без служебных и повторов: [{ row, parsed }].
   Возвращает { mismatches, matched }: по каждому банку либо расхождение, либо «сошлось». */
export function findMismatches({ rows, transactions, settings, now = Date.now() }) {
  const off = lsJson(OFF_KEY, []);
  const ign = lsJson(IGN_KEY, {});
  const mismatches = [];
  const matched = [];

  CARDS.forEach((card) => {
    if (off.includes(card)) return;
    const rec = lsJson(REC_KEY + card, null);
    if (!rec) return;
    const t = Date.parse(rec.at);
    if (!t || now - t > FRESH_MS) return;

    const bankRows = rows.filter((r) => r.parsed.card === card && Date.parse(r.row.received_at) <= t);
    // есть неразобранное уведомление этого банка — сначала разберите его, иначе расхождение будет ложным
    if (bankRows.some((r) => !r.parsed.understood)) return;

    const delta = bankRows.reduce((s, r) => s + (r.parsed.type === "income" ? r.parsed.amount : -r.parsed.amount), 0);
    const app = computeBalances(transactions, settings, localDate(t))[card];
    const expected = app + delta;
    const diff = Math.round((rec.b - expected) * 100) / 100;

    if (Math.abs(diff) < 1) {
      matched.push({ card, at: rec.at });
      return;
    }
    if (ign[card] && Date.parse(ign[card]) >= t) return;
    mismatches.push({ card, at: rec.at, bank: rec.b, expected, diff });
  });

  return { mismatches, matched };
}
