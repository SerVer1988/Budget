/* «Частые места»: названия магазинов и заметок, которые человек вносил чаще всего за последние месяцы.
   Показываются быстрыми кнопками в форме траты: одно нажатие подставляет место, а категория подбирается сама. */

const DAYS = 120;

export function topPlaces(transactions, today = new Date(), limit = 6) {
  const since = new Date(today.getTime() - DAYS * 86400000).toISOString().slice(0, 10);
  const stats = new Map(); // ключ -> { name, count, last }
  for (const t of transactions || []) {
    if (t.type !== "expense" || t.sample || !t.note || String(t.date || "") < since) continue;
    const name = String(t.note).trim();
    const letters = name.replace(/[^a-zа-яё]/gi, "");
    if (letters.length < 3 || name.length > 28) continue;
    const key = name.toLowerCase().replace(/ё/g, "е");
    const cur = stats.get(key) || { name, count: 0, last: "" };
    cur.count += 1;
    if (String(t.date) >= cur.last) { cur.last = String(t.date); cur.name = name; } // показываем последнее написание
    stats.set(key, cur);
  }
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1))
    .slice(0, limit)
    .map((s) => s.name);
}
