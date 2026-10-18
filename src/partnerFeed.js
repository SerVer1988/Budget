import { formatMoney } from "./format.js";

/* Уведомления о тратах партнёра. Что считается новой тратой:
   • личный расход партнёра (если он открыл вам свой бюджет), без скрытых и без тех, что он пометил «общей»;
   • общая трата, которую внёс партнёр в «Общую».
   Первый запуск ничего не показывает: всё, что уже есть, считается увиденным. Старше 14 дней — тоже не новость
   (например, партнёр загрузил резервную копию). */

const KEY = (uid, partnerId) => `budget-app:partner-seen:${uid}:${partnerId}`;
const MAX_IDS = 3000;
const MAX_LINES = 5;

export function readFeedState(uid, partnerId) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(uid, partnerId)) || "null");
    return { personal: Array.isArray(v?.personal) ? v.personal : null, shared: Array.isArray(v?.shared) ? v.shared : null };
  } catch {
    return { personal: null, shared: null };
  }
}

export function writeFeedState(uid, partnerId, state) {
  try { localStorage.setItem(KEY(uid, partnerId), JSON.stringify(state)); } catch { /* ignore */ }
}

const daysAgo = (today, n) => {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() - n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* personal — массив операций партнёра или null; shared — записи «Общей» или null (нет данных — состояние не трогаем).
   Возвращает { lines: [текст...], state }. */
export function planPartnerNotices({ state, personal, shared, partnerId, names, catNameOf, today }) {
  const next = { personal: state.personal, shared: state.shared };
  const lines = [];
  const cutoff = daysAgo(today, 14);

  if (Array.isArray(personal)) {
    const allIds = personal.map((t) => t.id).filter(Boolean);
    if (state.personal === null) {
      next.personal = allIds.slice(-MAX_IDS);
    } else {
      const seen = new Set(state.personal);
      personal
        .filter((t) => t.id && !seen.has(t.id) && t.type === "expense" && !t.hidden && !t.sharedId && String(t.date || "") >= cutoff)
        .forEach((t) => lines.push(`${names.partner}: ${t.category || "Расход"} ${formatMoney(Math.abs(t.amount || 0))}`));
      next.personal = [...state.personal, ...allIds.filter((id) => !seen.has(id))].slice(-MAX_IDS);
    }
  }

  if (Array.isArray(shared)) {
    const allIds = shared.map((i) => i.id).filter(Boolean);
    if (state.shared === null) {
      next.shared = allIds.slice(-MAX_IDS);
    } else {
      const seen = new Set(state.shared);
      shared
        .filter((i) => i.id && !seen.has(i.id) && i.kind !== "settle" && i.createdBy === partnerId && String(i.date || "") >= cutoff)
        .forEach((i) => lines.push(`${names.partner} добавил(а) общую трату: ${catNameOf(i.catId)} ${formatMoney(i.amount)}`));
      next.shared = [...state.shared, ...allIds.filter((id) => !seen.has(id))].slice(-MAX_IDS);
    }
  }

  return { lines: lines.slice(0, MAX_LINES), extra: Math.max(0, lines.length - MAX_LINES), state: next };
}
