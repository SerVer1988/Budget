import { MONTHS_SHORT } from "./constants.js";
import { computeBalances } from "./finance.js";
import { bucketName, bucketOf, dayOfMonth, monthKeyOf, ruPlural, shiftMonth, todayMonthKey, todayStr } from "./format.js";

/* Ближайший день выплаты из settings.reminderDays, начиная строго после сегодня,
   и сколько до него календарных дней (с учётом смены месяца и его длины). */
export function nextPaydayInfo(settings) {
  const days = (settings.reminderDays && settings.reminderDays.length ? settings.reminderDays : [5, 15, 30])
    .slice()
    .sort((a, b) => a - b);
  if (!days.length) return null;

  const now = new Date();
  const todayDay = now.getDate();

  let nextDay = days.find((d) => d > todayDay);
  let year = now.getFullYear();
  let month = now.getMonth();

  if (nextDay == null) {
    nextDay = days[0];
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(nextDay, lastDayOfMonth);

  const payDate = new Date(year, month, clampedDay);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((payDate - todayMidnight) / 86400000);

  return { day: clampedDay, daysLeft };
}

/* ---------- маленькие помощники по датам ---------- */
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDaysStr(dateStr, n) {
  const d = new Date(parseDate(dateStr) + n * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

/* «11 окт» */
export function shortDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/* ---------- прогноз: хватит ли денег до следующей выплаты ---------- */
const FORECAST_WINDOW = 14; // темп трат считаем по последним 14 дням

export function computeForecast(transactions, settings) {
  const info = nextPaydayInfo(settings);
  if (!info || info.daysLeft < 1) return [];

  const today = todayStr();
  const balances = computeBalances(transactions, settings, null);
  const result = [];

  [["sber", "needs"], ["alfa", "wants"]].forEach(([card, bucket]) => {
    const expenses = transactions.filter((t) => t.type === "expense" && t.card === card);
    if (!expenses.length) return;

    const first = expenses.reduce((m, t) => (t.date < m ? t.date : m), expenses[0].date);
    const spanDays = Math.min(FORECAST_WINDOW, daysBetween(first, today) + 1);
    if (spanDays < 1) return;
    const from = addDaysStr(today, -(spanDays - 1));
    const inWindow = expenses.filter((t) => t.date >= from && t.date <= today);
    if (inWindow.length < 3) return; // мало данных — прогноз был бы случайным

    const rate = inWindow.reduce((s, t) => s + t.amount, 0) / spanDays;
    if (rate <= 0) return;

    const balance = balances[card];
    const base = { card, bucket, name: bucketName(settings, bucket), balance, rate, daysLeft: info.daysLeft, payDay: info.day };

    if (balance <= 0) {
      result.push({ ...base, status: "empty" });
      return;
    }

    const fullDays = Math.floor(balance / rate);
    if (fullDays >= info.daysLeft) {
      result.push({ ...base, status: "ok", left: balance - rate * info.daysLeft });
    } else {
      const runOutIn = fullDays + 1; // через сколько дней от сегодня деньги кончатся
      result.push({
        ...base,
        status: "short",
        runOutDate: addDaysStr(today, runOutIn),
        shortDays: info.daysLeft - runOutIn,
        shortfall: rate * info.daysLeft - balance,
        safeDaily: Math.floor(balance / info.daysLeft),
      });
    }
  });

  return result;
}

/* ---------- сравнение текущего месяца с предыдущими (к тому же дню) ---------- */
function spendByCategory(transactions, monthKey, uptoDay) {
  const cats = {};
  let total = 0;
  transactions.forEach((t) => {
    if (t.type !== "expense" || monthKeyOf(t.date) !== monthKey || dayOfMonth(t.date) > uptoDay) return;
    const bucket = t.bucket || bucketOf(t.card);
    const key = `${bucket}:${t.category}`;
    if (!cats[key]) cats[key] = { name: t.category, bucket, sum: 0 };
    cats[key].sum += t.amount;
    total += t.amount;
  });
  return { total, cats };
}

export function comparisonPeriodText(months) {
  return months === 1 ? "в прошлом месяце" : `в среднем за ${months} ${ruPlural(months, "месяц", "месяца", "месяцев")}`;
}

export function computeMonthComparison(transactions) {
  const today = todayStr();
  const day = dayOfMonth(today);
  if (day < 5) return null; // в первые дни месяца сравнивать рано

  const mk = todayMonthKey();
  const prevKeys = [];
  let k = mk;
  for (let i = 0; i < 6 && prevKeys.length < 3; i++) {
    k = shiftMonth(k, -1);
    if (transactions.some((t) => t.type === "expense" && monthKeyOf(t.date) === k)) prevKeys.push(k);
  }
  if (!prevKeys.length) return null;

  const n = prevKeys.length;
  const cur = spendByCategory(transactions, mk, day);
  const prev = prevKeys.map((key) => spendByCategory(transactions, key, day));

  const keys = new Set(Object.keys(cur.cats));
  prev.forEach((p) => Object.keys(p.cats).forEach((key) => keys.add(key)));

  const rows = [];
  keys.forEach((key) => {
    const c = cur.cats[key];
    const ref = prev.map((p) => p.cats[key]).find(Boolean);
    const curSum = c ? c.sum : 0;
    const avg = prev.reduce((s, p) => s + (p.cats[key]?.sum || 0), 0) / n;
    const diff = curSum - avg;
    rows.push({
      name: (c || ref).name,
      bucket: (c || ref).bucket,
      cur: curSum,
      avg,
      diff,
      pct: avg > 0 ? Math.round((diff / avg) * 100) : null,
    });
  });

  const totalAvg = prev.reduce((s, p) => s + p.total, 0) / n;
  const totalDiff = cur.total - totalAvg;
  const total = {
    cur: cur.total,
    avg: totalAvg,
    diff: totalDiff,
    pct: totalAvg > 0 ? Math.round((totalDiff / totalAvg) * 100) : null,
  };

  return {
    today,
    day,
    months: n,
    total,
    rows: rows.filter((r) => r.avg > 0 && Math.abs(r.diff) >= 200).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
  };
}
