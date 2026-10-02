import { BUCKET_CARD } from "./constants.js";
import { dayOfMonth, daysInMonth, monthKeyOf, uid } from "./format.js";

/* Регулярные платежи (аренда, подписки): хранятся в settings.recurring.
   Платёж «созревает» в свой день месяца и ждёт, пока вы нажмёте «Провести» —
   сам по себе трата не создаётся, чтобы цифры не менялись без вашего ведома. */

export function normalizeRecurring(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object" && r.id && typeof r.name === "string")
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      amount: Math.max(0, Number(r.amount) || 0),
      day: Math.min(31, Math.max(1, Math.round(Number(r.day) || 1))),
      bucket: r.bucket === "wants" ? "wants" : "needs",
      category: typeof r.category === "string" ? r.category : "",
      active: r.active !== false,
      lastPosted: typeof r.lastPosted === "string" ? r.lastPosted : "",
    }));
}

/* Новый платёж. Если день этого месяца уже прошёл, считаем его закрытым за текущий месяц,
   чтобы он сразу не показался «просроченным»: первый раз сработает в следующем месяце. */
export function newRecurring({ name, amount, day, bucket, category }, todayDateStr) {
  const passed = day < dayOfMonth(todayDateStr);
  return {
    id: uid(),
    name: name.trim(),
    amount,
    day,
    bucket: bucket === "wants" ? "wants" : "needs",
    category: category || "",
    active: true,
    lastPosted: passed ? monthKeyOf(todayDateStr) : "",
  };
}

const pad = (n) => String(n).padStart(2, "0");

/* Платежи, которые пора провести (daysUntil ≤ 0) или наступят в ближайшие 7 дней. */
export function computeRecurring(settings, todayDateStr) {
  const mk = monthKeyOf(todayDateStr);
  const today = dayOfMonth(todayDateStr);
  const dim = daysInMonth(mk);
  const out = [];
  (settings.recurring || []).forEach((item) => {
    if (!item.active || item.lastPosted === mk) return;
    const day = Math.min(item.day, dim);
    const daysUntil = day - today;
    if (daysUntil > 7) return;
    out.push({ ...item, dueDate: `${mk}-${pad(day)}`, daysUntil, status: daysUntil <= 0 ? "due" : "upcoming" });
  });
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function buildRecurringExpense(item, todayDateStr) {
  return {
    type: "expense",
    date: todayDateStr,
    amount: item.amount,
    card: BUCKET_CARD[item.bucket],
    bucket: item.bucket,
    category: item.category,
    note: item.name,
    recurringId: item.id,
  };
}

export function markPosted(list, id, monthKey) {
  return (list || []).map((r) => (r.id === id ? { ...r, lastPosted: monthKey } : r));
}
