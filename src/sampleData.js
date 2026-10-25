/* Пример данных для знакомства с приложением: зарплата, её распределение 50/30/20 и обычные траты за два месяца.
   Все записи помечены sample: true, поэтому их можно удалить одним нажатием, не затронув ваши настоящие операции. */
import { uid } from "./format.js";

const pad = (n) => String(n).padStart(2, "0");

function prevMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

// Расходы по расписанию месяца: [день, карта, бюджет, категория, сумма, заметка]
const PLAN = [
  [6, "sber", "needs", "Аренда/ипотека", 25000, "Аренда"],
  [11, "sber", "needs", "ЖКХ", 4200, "Коммунальные платежи"],
  [3, "sber", "needs", "Продукты", 3000, "Супермаркет"],
  [9, "sber", "needs", "Продукты", 3800, "Супермаркет"],
  [16, "sber", "needs", "Продукты", 3400, "Рынок"],
  [8, "sber", "needs", "Транспорт", 1800, "Проездной"],
  [14, "sber", "needs", "Связь", 600, "Мобильная связь"],
  [18, "sber", "needs", "Лекарства/здоровье", 900, "Аптека"],
  [7, "alfa", "wants", "Кафе/рестораны", 1800, "Обед с друзьями"],
  [19, "alfa", "wants", "Кафе/рестораны", 2400, "Ужин"],
  [13, "alfa", "wants", "Кино/развлечения", 1500, "Кино"],
  [15, "alfa", "wants", "Шоппинг", 4900, "Одежда"],
  [10, "alfa", "wants", "Подписки", 899, "Онлайн-кинотеатр"],
  [21, "alfa", "wants", "Подарки", 2500, "Подарок другу"],
];

/* today — строка «ГГГГ-ММ-ДД». Возвращает записи за прошлый месяц целиком и за текущий (только до сегодняшнего дня). */
export function buildSampleData(today, makeId = uid) {
  const mk = today.slice(0, 7);
  const todayDay = parseInt(today.slice(8, 10), 10);
  const out = [];

  const base = (extra) => ({ id: makeId(), sample: true, ...extra });

  [prevMonthKey(mk), mk].forEach((month) => {
    const current = month === mk;
    const dayOf = (d) => `${month}-${pad(current ? Math.min(d, todayDay) : d)}`;

    // Зарплата и её распределение (в текущем месяце дата не позже сегодняшней)
    const payDate = dayOf(5);
    out.push(base({ type: "income", amount: 90000, date: payDate, card: "sber", note: "Зарплата" }));
    out.push(base({ type: "transfer", amount: 27000, date: payDate, fromCard: "sber", toCard: "alfa", note: "Желания 30%" }));
    out.push(base({ type: "transfer", amount: 18000, date: payDate, fromCard: "sber", toCard: "ozon", note: "Подушка 20%" }));

    PLAN.forEach(([day, card, bucket, category, amount, note]) => {
      if (current && day > todayDay) return; // будущих трат в примере нет
      out.push(base({ type: "expense", amount, date: dayOf(day), card, bucket, category, note }));
    });
  });

  return out;
}

export const isSample = (t) => !!(t && t.sample);
export const hasSample = (list) => (list || []).some(isSample);
export const removeSample = (list) => (list || []).filter((t) => !isSample(t));
