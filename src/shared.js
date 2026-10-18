/* «Общая» книга пары: чистые функции (без интерфейса).
   Запись: { id, kind: "expense" | "settle", date, amount, catId, note, paidBy, split }
   paidBy — id аккаунта, который заплатил (для расчёта — кто отдаёт деньги); split — доля платившего в процентах (по умолчанию 50). */

export const DEFAULT_SHARED_CATS = [
  { id: "rent", name: "Аренда / ипотека", color: "#1268C9" },
  { id: "utilities", name: "ЖКХ", color: "#C97A1E" },
  { id: "groceries", name: "Продукты", color: "#1E8E4F" },
  { id: "kids", name: "Дети", color: "#D6559B" },
  { id: "trip", name: "Отпуск", color: "#2AA6A0" },
  { id: "other", name: "Прочее", color: "#7B8794" },
];

export const SHARED_CAT_COLORS = ["#1268C9", "#C97A1E", "#1E8E4F", "#D6559B", "#2AA6A0", "#7B8794", "#8A5CD6", "#C0392B"];

export const sharedCatsOf = (cats) => (Array.isArray(cats) && cats.length ? cats : DEFAULT_SHARED_CATS);

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const isSettle = (i) => i && i.kind === "settle";
const payerShare = (i) => {
  const s = i.split === undefined || i.split === null || i.split === "" ? 50 : num(i.split);
  return Math.min(100, Math.max(0, s)) / 100;
};

/* Сколько партнёр должен мне (плюс) или я ему (минус) по всем записям. */
export function balanceFor(items, myId) {
  let net = 0;
  (items || []).forEach((i) => {
    const amount = num(i.amount);
    const mine = i.paidBy === myId;
    if (isSettle(i)) net += mine ? amount : -amount;
    else {
      const otherPart = amount * (1 - payerShare(i));
      net += mine ? otherPart : -otherPart;
    }
  });
  return Math.round(net * 100) / 100;
}

export const itemsOfMonth = (items, monthKey) => (items || []).filter((i) => String(i.date || "").slice(0, 7) === monthKey);

/* Траты (без расчётов) за период: всего, кто сколько заплатил, по категориям. */
export function monthSummary(items, myId) {
  let total = 0, mine = 0, theirs = 0;
  const byCat = {};
  (items || []).forEach((i) => {
    if (isSettle(i)) return;
    const a = num(i.amount);
    total += a;
    if (i.paidBy === myId) mine += a; else theirs += a;
    const k = i.catId || "other";
    byCat[k] = (byCat[k] || 0) + a;
  });
  return { total, mine, theirs, byCat };
}

export { isSettle };
