import { MONTHS_RU, MONTHS_SHORT } from "./constants.js";
import { computeBalances, estimateMonthlyRate, getAllMonthKeys } from "./finance.js";
import { endOfMonthStr, monthLabelShort, shiftMonth, todayMonthKey } from "./format.js";

/* ---------- динамика сбережений и дата достижения цели ---------- */
const MONTHS_PREP = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const HISTORY_MONTHS = 12;   // сколько месяцев истории показываем
const PROJECTION_MONTHS = 12; // на сколько месяцев вперёд рисуем прогноз

export function computeSavingsSeries(transactions, settings) {
  const nowKey = todayMonthKey();
  const keys = getAllMonthKeys(transactions).filter((k) => k <= nowKey).slice(-HISTORY_MONTHS);
  const balanceNow = computeBalances(transactions, settings, null).ozon || 0;

  const points = keys.map((k) => ({
    key: k,
    label: monthLabelShort(k),
    fact: k === nowKey ? balanceNow : computeBalances(transactions, settings, endOfMonthStr(k)).ozon || 0,
  }));

  const goal = Number(settings.goal) || 0;
  const left = goal - balanceNow;
  const rate = estimateMonthlyRate(transactions, settings, nowKey);

  let monthsLeft = null; // null — не достижима при текущем темпе
  if (left <= 0) monthsLeft = 0;
  else if (rate > 0) monthsLeft = Math.ceil(left / rate);

  let eta = null;
  if (monthsLeft != null && monthsLeft > 0) {
    const [y, m] = shiftMonth(nowKey, monthsLeft).split("-").map(Number);
    eta = { month: MONTHS_RU[m - 1], monthPrep: MONTHS_PREP[m - 1], short: `${MONTHS_SHORT[m - 1]} ${y}`, year: y };
  }

  // прогноз: пунктир от текущей точки вперёд (только если цель ещё не достигнута и темп положительный)
  let reachesGoalInWindow = false;
  if (monthsLeft != null && monthsLeft > 0) {
    const last = points[points.length - 1];
    last.plan = balanceNow;
    const steps = Math.min(monthsLeft, PROJECTION_MONTHS);
    for (let i = 1; i <= steps; i++) {
      const k = shiftMonth(nowKey, i);
      const value = i === monthsLeft ? goal : Math.min(goal, balanceNow + rate * i);
      points.push({ key: k, label: monthLabelShort(k), plan: Math.round(value) });
    }
    reachesGoalInWindow = monthsLeft <= PROJECTION_MONTHS;
  }

  return { points, goal, left, rate, monthsLeft, eta, reachesGoalInWindow, balanceNow };
}

/* ---------- цели внутри «Сбережений» (виртуальные копилки) ---------- */
export function totalAllocated(goals) {
  return (goals || []).reduce((s, g) => s + (Number(g.saved) || 0), 0);
}

/* Деньги на карте, не закреплённые ни за одной целью. */
export function freeFunds(settings, savingsBalance) {
  return (savingsBalance || 0) - totalAllocated(settings.goals);
}

export function normalizeGoals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g === "object" && g.id && typeof g.name === "string")
    .map((g) => ({
      id: String(g.id),
      name: g.name,
      target: Math.max(0, Number(g.target) || 0),
      saved: Math.max(0, Number(g.saved) || 0),
      deadline: typeof g.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) ? g.deadline : "",
    }));
}

/* Изменить сумму цели на delta (+ пополнить, − снять). Возвращает { goals } или { error }. */
export function changeGoalSaved(settings, savingsBalance, goalId, delta) {
  const goals = settings.goals || [];
  const g = goals.find((x) => x.id === goalId);
  if (!g) return { error: "Цель не найдена" };
  if (!(Math.abs(delta) > 0)) return { error: "Введите сумму" };

  if (delta > 0) {
    const free = freeFunds(settings, savingsBalance);
    if (delta > free + 0.5) {
      return { error: free > 0 ? `Свободно только ${Math.floor(free)} ₽` : "Нет свободных денег в сбережениях" };
    }
  } else if (-delta > g.saved + 0.5) {
    return { error: `В цели только ${Math.floor(g.saved)} ₽` };
  }
  return { goals: goals.map((x) => (x.id === goalId ? { ...x, saved: Math.max(0, x.saved + delta) } : x)) };
}

/* Сколько откладывать в месяц, чтобы успеть к сроку. null — срока нет или цель уже собрана. */
export function monthlyNeed(goal, todayDateStr) {
  const rest = goal.target - goal.saved;
  if (!goal.deadline || rest <= 0) return null;
  const [ty, tm, td] = todayDateStr.split("-").map(Number);
  const [dy, dm, dd] = goal.deadline.split("-").map(Number);
  const days = (Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86400000;
  if (days <= 0) return { overdue: true, rest };
  const months = Math.max(1, Math.round(days / 30.44));
  return { overdue: false, rest, months, perMonth: Math.ceil(rest / months) };
}

export function deadlineLabel(dateStr, todayDateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const sameYear = todayDateStr && Number(todayDateStr.slice(0, 4)) === y;
  return `${d} ${MONTHS_SHORT[m - 1]}${sameYear ? "" : " " + y}`;
}
