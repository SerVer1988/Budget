import { C } from "./constants.js";
import { computeBalances } from "./finance.js";
import { computeIncomeSplit } from "./debts.js";
import { addDaysStr, shortDate } from "./forecast.js";
import { bucketOf, dayOfMonth, daysInMonth, formatMoney, monthKeyOf, ruPlural, shiftMonth, todayStr } from "./format.js";

/* План до выплаты.
   Выплаты приходят в дни из settings.reminderDays (например 5, 15, 30), суммы берём из истории доходов.
   Для «Нужд» считаем: сколько денег на карте, какие обязательные платежи (ЖКХ, алименты…) и регулярные
   платежи наступят до следующей выплаты, сколько в день вы обычно тратите на остальное — и хватит ли.
   Если не хватит — сколько можно тратить в день и по каким категориям; плюс подсказка, сколько из ближайшей
   выплаты отправить в «Нужды», чтобы хватило до следующей. */

const MANDATORY_RE = /(жкх|коммунал|квартплат|алимент|аренд|ипотек|кредит|налог)/i;
const VAR_WINDOW = 30; // темп «обычных» трат считаем по последним 30 дням
const MIN_SPAN = 7; // меньше недели истории — план был бы случайным

const pad = (n) => String(n).padStart(2, "0");
function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
function median(list) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const ceil100 = (n) => Math.ceil(n / 100) * 100;
const round10 = (n) => Math.round(n / 10) * 10;

/* Обязательная ли категория: отметка пользователя (cat.mandatory) или обычное название (ЖКХ, алименты…). */
export function isMandatory(cat) {
  if (!cat) return false;
  if (typeof cat.mandatory === "boolean") return cat.mandatory;
  return MANDATORY_RE.test(cat.name || "");
}

/* Обязательные категории «Нужд»: из настроек + категории из операций с «обязательными» названиями
   (на случай, если у категории нет отметки, а название очевидное — «Алименты», «ЖКХ»). */
function mandatoryNames(settings, transactions) {
  const out = new Set();
  const explicit = new Map((settings.needCats || []).map((c) => [c.name, c]));
  explicit.forEach((c, name) => { if (isMandatory(c)) out.add(name); });
  (transactions || []).forEach((t) => {
    if (t.type !== "expense" || !t.category || explicit.has(t.category)) return;
    if ((t.bucket || bucketOf(t.card)) === "needs" && MANDATORY_RE.test(t.category)) out.add(t.category);
  });
  return out;
}

/* Ближайшие даты выплат строго после today: [{ date, day }] */
export function paydayDates(settings, today, count) {
  const days = [...new Set((settings.reminderDays && settings.reminderDays.length ? settings.reminderDays : [5, 15, 30]))]
    .filter((d) => d >= 1 && d <= 31)
    .sort((a, b) => a - b);
  if (!days.length) return [];
  const out = [];
  let mk = monthKeyOf(today);
  for (let i = 0; i < 24 && out.length < count; i++) {
    const dim = daysInMonth(mk);
    const dates = days.map((d) => ({ day: d, date: `${mk}-${pad(Math.min(d, dim))}` })).sort((a, b) => (a.date < b.date ? -1 : 1));
    dates.forEach((x) => { if (x.date > today && out.length < count && !out.some((o) => o.date === x.date)) out.push(x); });
    mk = shiftMonth(mk, 1);
  }
  return out;
}

/* Обычный размер выплаты для каждого дня выплаты — медиана по доходам за последние ~3 месяца. */
export function typicalPayouts(transactions, settings, today) {
  const days = settings.reminderDays && settings.reminderDays.length ? settings.reminderDays : [5, 15, 30];
  const from = addDaysStr(today, -100);
  const buckets = {}; // `${месяц}:${день выплаты}` → сумма
  transactions.forEach((t) => {
    if (t.type !== "income" || t.date < from || t.date > today) return;
    const mk = monthKeyOf(t.date);
    const dim = daysInMonth(mk);
    const d = dayOfMonth(t.date);
    let best = null;
    days.forEach((p) => {
      const diff = Math.abs(d - Math.min(p, dim));
      if (diff <= 3 && (!best || diff < best.diff)) best = { p, diff };
    });
    if (!best) return;
    const key = `${mk}:${best.p}`;
    buckets[key] = (buckets[key] || 0) + t.amount;
  });
  const byDay = {};
  Object.entries(buckets).forEach(([k, sum]) => {
    const p = Number(k.split(":")[1]);
    (byDay[p] = byDay[p] || []).push(sum);
  });
  const out = {};
  Object.entries(byDay).forEach(([p, arr]) => { out[p] = Math.round(median(arr)); });
  return out;
}

/* Обычные траты «Нужд» в день, без обязательных категорий и без проведённых регулярных платежей. */
function variableSpending(transactions, settings, today, mandatory) {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (!expenses.length) return null;
  const first = expenses.reduce((m, t) => (t.date < m ? t.date : m), expenses[0].date);
  const span = Math.min(VAR_WINDOW, daysBetween(first, today) + 1);
  if (span < MIN_SPAN) return null;
  const from = addDaysStr(today, -(span - 1));
  const cats = {};
  let total = 0;
  expenses.forEach((t) => {
    if (t.date < from || t.date > today) return;
    if ((t.bucket || bucketOf(t.card)) !== "needs") return;
    if (mandatory.has(t.category) || t.recurringId) return;
    cats[t.category] = (cats[t.category] || 0) + t.amount;
    total += t.amount;
  });
  const list = Object.entries(cats)
    .map(([name, sum]) => ({ name, daily: sum / span }))
    .sort((a, b) => b.daily - a.daily);
  return { span, rate: total / span, list };
}

/* Платежи «Нужд», которые наступят в окне [start, end): регулярные платежи из настроек и обязательные
   категории по их обычному размеру и дню месяца. */
function obligationsIn(transactions, settings, start, end, mandatory, today, includeOverdue) {
  const items = [];
  const startMk = monthKeyOf(start);
  const lastMk = monthKeyOf(addDaysStr(end, -1));
  const monthsInWindow = startMk === lastMk ? [startMk] : [startMk, lastMk];
  const currentMk = monthKeyOf(today);

  // 1) регулярные платежи
  const coveredCats = new Set();
  (settings.recurring || []).forEach((r) => {
    if (!r.active || r.bucket !== "needs") return;
    if (r.category) coveredCats.add(r.category);
    monthsInWindow.forEach((mk) => {
      if (r.lastPosted === mk) return;
      const date = `${mk}-${pad(Math.min(r.day, daysInMonth(mk)))}`;
      if (date >= start && date < end) items.push({ name: r.name, amount: r.amount, date, kind: "recurring" });
      else if (includeOverdue && mk === currentMk && date < start) items.push({ name: r.name, amount: r.amount, date: start, kind: "recurring", overdue: true });
    });
  });

  // 2) обязательные категории (ЖКХ, алименты…) по истории прошлых месяцев
  mandatory.forEach((name) => {
    if (coveredCats.has(name)) return;
    const perMonth = [];
    for (let i = 1; i <= 3; i++) {
      const mk = shiftMonth(currentMk, -i);
      const txs = transactions.filter((t) => t.type === "expense" && t.category === name && monthKeyOf(t.date) === mk);
      if (!txs.length) continue;
      const biggest = txs.reduce((m, t) => (t.amount > m.amount ? t : m), txs[0]);
      perMonth.push({ sum: txs.reduce((s, t) => s + t.amount, 0), day: dayOfMonth(biggest.date) });
    }
    if (!perMonth.length) return;
    const typical = perMonth.reduce((s, m) => s + m.sum, 0) / perMonth.length;
    const day = Math.round(median(perMonth.map((m) => m.day)));
    monthsInWindow.forEach((mk) => {
      const date = `${mk}-${pad(Math.min(day, daysInMonth(mk)))}`;
      let amount = typical;
      if (mk === currentMk) {
        const paid = transactions
          .filter((t) => t.type === "expense" && t.category === name && monthKeyOf(t.date) === mk)
          .reduce((s, t) => s + t.amount, 0);
        amount = typical - paid;
        if (amount < typical * 0.25) return; // в этом месяце уже оплачено
      }
      if (date >= start && date < end) items.push({ name, amount, date, kind: "category" });
      else if (includeOverdue && mk === currentMk && date < start) items.push({ name, amount, date: start, kind: "category", overdue: true });
    });
  });

  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
}

/* Что больше всего ушло в «Нуждах» в прошлом месяце. */
function lastMonthTop(transactions, settings, today, mandatory) {
  const mk = shiftMonth(monthKeyOf(today), -1);
  const cats = {};
  let total = 0;
  transactions.forEach((t) => {
    if (t.type !== "expense" || monthKeyOf(t.date) !== mk) return;
    if ((t.bucket || bucketOf(t.card)) !== "needs") return;
    cats[t.category] = (cats[t.category] || 0) + t.amount;
    total += t.amount;
  });
  const list = Object.entries(cats)
    .map(([name, sum]) => ({ name, sum, mandatory: mandatory.has(name) }))
    .sort((a, b) => b.sum - a.sum);
  return { monthKey: mk, total, top: list.slice(0, 4) };
}

export function computePayPlan(transactions, settings, today = todayStr()) {
  const upcoming = paydayDates(settings, today, 2);
  if (!upcoming.length) return null;
  const mandatory = mandatoryNames(settings, transactions);
  const v = variableSpending(transactions, settings, today, mandatory);
  if (!v) return { status: "nodata" };

  const next = upcoming[0];
  const daysLeft = daysBetween(today, next.date);
  const have = computeBalances(transactions, settings, null).sber;

  const obl = obligationsIn(transactions, settings, today, next.date, mandatory, today, true);
  const need = obl.total + v.rate * daysLeft;
  const gap = need - have; // > 0 — не хватит
  const free = Math.max(0, have - obl.total);
  const safeDaily = Math.floor(free / daysLeft);

  // лимиты по самым крупным категориям, чтобы уложиться в безопасный дневной расход
  const k = v.rate > 0 ? Math.min(1, safeDaily / v.rate) : 1;
  const limits = v.list.slice(0, 3).map((c) => ({ name: c.name, daily: Math.round(c.daily), limit: Math.max(0, round10(c.daily * k)) }));

  const plan = {
    status: gap > 0 ? "short" : "ok",
    today,
    next: { date: next.date, day: next.day, daysLeft },
    have,
    obligations: obl.items,
    obligationsTotal: obl.total,
    rate: v.rate,
    span: v.span,
    need,
    gap,
    surplus: -gap,
    free,
    safeDaily,
    limits,
    lastMonth: lastMonthTop(transactions, settings, today, mandatory),
    after: null,
  };

  // что делать с ближайшей выплатой, чтобы хватило до следующей
  const following = upcoming[1];
  if (following) {
    const payouts = typicalPayouts(transactions, settings, today);
    const expected = payouts[next.day] || null;
    const daysNext = daysBetween(next.date, following.date);
    const oblNext = obligationsIn(transactions, settings, next.date, following.date, mandatory, today, false);
    const needNext = oblNext.total + v.rate * daysNext;
    const carry = have - need; // что перейдёт с этого периода (минус — придётся покрыть из выплаты)
    const after = { date: following.date, day: following.day, daysNext, obligations: oblNext.items, obligationsTotal: oblNext.total, needNext, expected, carry };
    if (expected) {
      const toNeeds = Math.min(expected, Math.max(0, ceil100(needNext - carry)));
      const rest = Math.max(0, expected - toNeeds);
      const wantPct = settings.wantPct || 0;
      const savePct = settings.savePct || 0;
      const sum = wantPct + savePct;
      const toWants = sum > 0 ? Math.round((rest * wantPct) / sum / 100) * 100 : rest;
      const toSavings = Math.max(0, rest - toWants);
      const rule = computeIncomeSplit(expected, settings);
      Object.assign(after, { toNeeds, toWants, toSavings, byRule: { needs: Math.round(rule.toSber), wants: Math.round(rule.toAlfa), savings: Math.round(rule.toOzon) } });
    }
    plan.after = after;
  }
  return plan;
}

/* Заметки для уведомлений и ленты подсказок. */
export function computePayPlanInsights(transactions, settings) {
  const plan = computePayPlan(transactions, settings);
  if (!plan || plan.status === "nodata") return [];
  const out = [];
  const nd = `${plan.next.day}-го`;

  if (plan.status === "short") {
    const limitText = plan.limits.length
      ? ` Ориентиры на день: ${plan.limits.map((l) => `${l.name} до ${formatMoney(l.limit)}`).join(", ")}.`
      : "";
    const oblText = plan.obligationsTotal > 0 ? ` Обязательные платежи до выплаты: ${formatMoney(plan.obligationsTotal)}.` : "";
    out.push({
      id: "plan-gap",
      color: C.danger,
      soft: C.dangerSoft,
      text: `До выплаты ${nd} (${plan.next.daysLeft} ${ruPlural(plan.next.daysLeft, "день", "дня", "дней")}) на «Нужды» не хватает около ${formatMoney(Math.round(plan.gap))}: на карте ${formatMoney(Math.round(plan.have))}.${oblText} Чтобы дотянуть, тратьте не больше ${formatMoney(plan.safeDaily)} в день (обычно уходит ${formatMoney(Math.round(plan.rate))}).${limitText}`,
    });
  }

  const a = plan.after;
  if (a && a.expected && plan.next.daysLeft <= 2) {
    out.push({
      id: "plan-split",
      color: C.amber,
      soft: C.amberSoft,
      text: `Выплата ${nd} (~${formatMoney(a.expected)}). Чтобы хватило до ${a.day}-го, в «Нужды» лучше отправить около ${formatMoney(a.toNeeds)}, в «Желания» ${formatMoney(a.toWants)}, в «Подушку» ${formatMoney(a.toSavings)}. По правилу 50/30/20 в «Нужды» пошло бы ${formatMoney(a.byRule.needs)}.`,
    });
  }
  return out;
}

export { shortDate };
