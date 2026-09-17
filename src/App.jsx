import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Plus, PiggyBank, BarChart3, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Wallet, X, ArrowUp, ArrowDown, Pencil,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { storage } from "./storage.js";

/* ============================================================ design tokens */
const C = {
  bg: "#F1F4F2",
  surface: "#FFFFFF",
  surface2: "#FAFBF7",
  ink: "#16201B",
  inkMuted: "#5B6B62",
  border: "#DCE3DD",
  sber: "#1E8E4F",
  sberSoft: "#E7F5EC",
  alfa: "#D6362B",
  alfaSoft: "#FBEAE8",
  ozon: "#1268C9",
  ozonSoft: "#E7F1FC",
  amber: "#C97A1E",
  amberSoft: "#FBF0DF",
  danger: "#C0392B",
  dangerSoft: "#FBEAE8",
};

const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

/* ============================================================ category icons & colors */
const ICON_MAP = {
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Home, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
};
const ICON_KEYS = Object.keys(ICON_MAP);
function getIcon(key) { return ICON_MAP[key] || HelpCircle; }

const CATEGORY_COLORS = ["#E8935C", "#2D8C6F", "#D46A93", "#D4A537", "#7C6FC4", "#3B82C4", "#C4573B", "#4F7CAC", "#8A6D4F", "#6B7280"];

const DEFAULT_NEED_CATS = [
  { name: "Аренда/ипотека", icon: "Home", color: "#7C6FC4" },
  { name: "ЖКХ", icon: "Zap", color: "#D4A537" },
  { name: "Продукты", icon: "ShoppingCart", color: "#E8935C" },
  { name: "Транспорт", icon: "Bus", color: "#3B82C4" },
  { name: "Связь", icon: "Wifi", color: "#2D8C6F" },
  { name: "Лекарства/здоровье", icon: "HeartPulse", color: "#D46A93" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#6B7280" },
];

const DEFAULT_WANT_CATS = [
  { name: "Кафе/рестораны", icon: "UtensilsCrossed", color: "#C4573B" },
  { name: "Кино/развлечения", icon: "Film", color: "#7C6FC4" },
  { name: "Шоппинг", icon: "ShoppingBag", color: "#D46A93" },
  { name: "Подписки", icon: "Tv", color: "#3B82C4" },
  { name: "Подарки", icon: "Gift", color: "#2D8C6F" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#6B7280" },
];

const DEFAULT_SETTINGS = {
  wantPct: 30,
  savePct: 20,
  reminderDays: [5, 15, 30],
  goal: 540000,
  openingBalance: { sber: 0, alfa: 0, ozon: 0 },
  includeInTotal: { sber: true, alfa: true, ozon: true },
  needCats: DEFAULT_NEED_CATS,
  wantCats: DEFAULT_WANT_CATS,
  closedMonths: [],
  needsWantsResetDate: null,
};

/* ============================================================ helpers */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayOfMonth(dateStr) { return parseInt(dateStr.slice(8, 10), 10); }
function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }
function todayMonthKey() { return todayStr().slice(0, 7); }

function shiftMonth(mk, delta) {
  let [y, m] = mk.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
function endOfMonthStr(mk) {
  const [y, m] = mk.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
function monthLabel(mk) {
  const [y, m] = mk.split("-").map(Number);
  const name = MONTHS_RU[m - 1];
  return name.charAt(0).toUpperCase() + name.slice(1) + " " + y;
}
function monthLabelShort(mk) {
  const [y, m] = mk.split("-").map(Number);
  return MONTHS_SHORT[m - 1] + " " + String(y).slice(2);
}
function formatMoney(n) {
  const v = Math.round(n || 0);
  return v.toLocaleString("ru-RU") + " ₽";
}

/* Safe calculator: lets the amount field accept expressions like "500+230" or "1200*2-100" */
function evalMoneyExpr(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim().replace(/,/g, ".");
  if (s === "") return NaN;
  if (!/^[0-9+\-*/().\s]+$/.test(s)) return NaN;

  let i = 0;

  function skipSpace() { while (s[i] === " ") i++; }

  function parseNumber() {
    skipSpace();
    const start = i;
    let hasDigits = false;
    while (i < s.length && /[0-9]/.test(s[i])) { i++; hasDigits = true; }
    if (s[i] === ".") {
      i++;
      while (i < s.length && /[0-9]/.test(s[i])) { i++; hasDigits = true; }
    }
    if (!hasDigits) throw new Error("bad number");
    return Number(s.slice(start, i));
  }

  function parseFactor() {
    skipSpace();
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      skipSpace();
      if (s[i] !== ")") throw new Error("expected )");
      i++;
      return v;
    }
    if (s[i] === "-") { i++; return -parseFactor(); }
    if (s[i] === "+") { i++; return parseFactor(); }
    return parseNumber();
  }

  function parseTerm() {
    let v = parseFactor();
    skipSpace();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i]; i++;
      const rhs = parseFactor();
      v = op === "*" ? v * rhs : v / rhs;
      skipSpace();
    }
    return v;
  }

  function parseExpr() {
    let v = parseTerm();
    skipSpace();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i]; i++;
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
      skipSpace();
    }
    return v;
  }

  try {
    const result = parseExpr();
    skipSpace();
    if (i !== s.length) return NaN;
    return Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function moneyNum(raw) {
  const v = evalMoneyExpr(raw);
  return Number.isFinite(v) ? v : 0;
}
function clampPct(p) { return Math.max(0, Math.min(1, p || 0)); }
function cardLabel(card) {
  return card === "sber" ? "Сбер" : card === "alfa" ? "Альфа" : card === "ozon" ? "Озон" : card;
}
function formatDateRu(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}
function needPctOf(settings) { return 100 - (settings.wantPct || 0) - (settings.savePct || 0); }

function computeIncomeSplit(amount, settings) {
  const toOzon = amount * (settings.savePct / 100);
  const toAlfa = amount * (settings.wantPct / 100);
  const toSber = amount - toOzon - toAlfa;
  return { toSber, toAlfa, toOzon };
}

function computeBalances(transactions, settings, uptoDateInclusive) {
  let sber = settings.openingBalance?.sber || 0;
  let alfa = settings.openingBalance?.alfa || 0;
  let ozon = settings.openingBalance?.ozon || 0;
  const list = uptoDateInclusive ? transactions.filter((t) => t.date <= uptoDateInclusive) : transactions;

  const add = (card, amt) => {
    if (card === "sber") sber += amt;
    else if (card === "alfa") alfa += amt;
    else if (card === "ozon") ozon += amt;
  };

  list.forEach((t) => {
    if (t.type === "income") add(t.card, t.amount);
    else if (t.type === "expense") add(t.card, -t.amount);
    else if (t.type === "adjustment") add(t.card, t.amount);
    else if (t.type === "transfer") {
      add(t.fromCard, -t.amount);
      add(t.toCard, t.amount);
    }
  });

  return { sber, alfa, ozon };
}

function aggregateMonth(mk, transactions, settings) {
  const inMonth = transactions.filter((t) => monthKeyOf(t.date) === mk);

  const acc = {
    sber: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
    alfa: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
    ozon: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
  };

  let incomeTotal = 0;
  const needCatTotals = {};
  const wantCatTotals = {};
  settings.needCats.forEach((c) => { needCatTotals[c.name] = 0; });
  settings.wantCats.forEach((c) => { wantCatTotals[c.name] = 0; });

  inMonth.forEach((t) => {
    if (t.type === "income") {
      acc[t.card].income += t.amount;
      incomeTotal += t.amount;
    } else if (t.type === "expense") {
      acc[t.card].spent += t.amount;
      const bucket = t.bucket || (t.card === "alfa" ? "wants" : "needs");
      if (bucket === "needs") needCatTotals[t.category] = (needCatTotals[t.category] || 0) + t.amount;
      else if (bucket === "wants") wantCatTotals[t.category] = (wantCatTotals[t.category] || 0) + t.amount;
    } else if (t.type === "adjustment") {
      acc[t.card].adj += t.amount;
    } else if (t.type === "transfer") {
      acc[t.fromCard].transferOut += t.amount;
      acc[t.toCard].transferIn += t.amount;
    }
  });

  function derive(x) {
    const adjIn = x.adj > 0 ? x.adj : 0;
    const adjOut = x.adj < 0 ? -x.adj : 0;
    const avail = x.income + x.transferIn - x.transferOut;
    const inflow = x.income + x.transferIn + adjIn;
    const outflow = x.spent + x.transferOut + adjOut;
    const net = avail - x.spent + x.adj;
    return { avail, inflow, outflow, net, spent: x.spent };
  }

  const sberD = derive(acc.sber);
  const alfaD = derive(acc.alfa);
  const ozonD = derive(acc.ozon);

  const items = inMonth.filter((t) => !t.hidden).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return {
    incomeTotal,
    sberAvail: sberD.avail,
    alfaAvail: alfaD.avail,
    ozonAvail: ozonD.avail,
    sberInflow: sberD.inflow,
    alfaInflow: alfaD.inflow,
    ozonInflow: ozonD.inflow,
    sberOutflow: sberD.outflow,
    alfaOutflow: alfaD.outflow,
    ozonOutflow: ozonD.outflow,
    sberSpent: sberD.spent,
    alfaSpent: alfaD.spent,
    ozonSpent: ozonD.spent,
    sberNet: sberD.net,
    alfaNet: alfaD.net,
    ozonNet: ozonD.net,
    needCatTotals,
    wantCatTotals,
    needsSpent: Object.values(needCatTotals).reduce((a, b) => a + b, 0),
    wantsSpent: Object.values(wantCatTotals).reduce((a, b) => a + b, 0),
    needsLimit: incomeTotal * (needPctOf(settings) / 100),
    wantsLimit: incomeTotal * (settings.wantPct / 100),
    items,
  };
}

/* ============================================================ Smart Notes engine (50/30/20 cross-card control) */
function computeCumulativeAllocation(transactions, settings) {
  // Needs/Wants track since the last reconciliation point (set when the user closes a
  // month, or manually reset in Settings) instead of since the beginning of time — this
  // stops long-unclosed surpluses/deficits from piling up into unrealistic numbers.
  // null = never reconciled yet = behaves exactly as before (full history).
  const sinceDate = settings.needsWantsResetDate || null;
  const recent = sinceDate ? transactions.filter((t) => t.date > sinceDate) : transactions;

  let recentIncome = 0;
  recent.forEach((t) => { if (t.type === "income") recentIncome += t.amount; });

  let needsSpent = 0;
  let wantsSpent = 0;
  recent.forEach((t) => {
    if (t.type !== "expense") return;
    const bucket = t.bucket || (t.card === "alfa" ? "wants" : "needs");
    if (bucket === "needs") needsSpent += t.amount;
    else if (bucket === "wants") wantsSpent += t.amount;
  });

  const needPct = needPctOf(settings);
  const needsAllocated = recentIncome * (needPct / 100);
  const wantsAllocated = recentIncome * (settings.wantPct / 100);

  // Savings intentionally stays fully cumulative, all-time — a "подушка" is meant to
  // keep growing across months, unlike Needs/Wants which should roughly zero out.
  let allTimeIncome = 0;
  transactions.forEach((t) => { if (t.type === "income") allTimeIncome += t.amount; });
  let saveSpent = 0;
  transactions.forEach((t) => {
    if (t.type === "adjustment" && t.card === "ozon" && t.amount < 0) saveSpent += -t.amount;
    if (t.type === "transfer" && t.fromCard === "ozon") saveSpent += t.amount;
  });
  const saveAllocated = allTimeIncome * (settings.savePct / 100);

  const baseline = sinceDate ? computeBalances(transactions, settings, sinceDate) : { sber: 0, alfa: 0 };

  return {
    needsTarget: needsAllocated - needsSpent,
    wantsTarget: wantsAllocated - wantsSpent,
    saveTarget: saveAllocated - saveSpent,
    baselineSber: baseline.sber,
    baselineAlfa: baseline.alfa,
    sinceDate,
  };
}

const SMART_NOTE_THRESHOLD = 50;

function smartNoteFor(bucketLabel, card, balance, target, overspend, sinceLabel) {
  const suffix = sinceLabel ? ` (с ${sinceLabel})` : "";

  if (overspend > 0) {
    return {
      type: "over",
      color: C.danger,
      soft: C.dangerSoft,
      text: `Внимание! По категории «${bucketLabel}» расходы превышают план на ${formatMoney(overspend)}${suffix}. Сократите траты или компенсируйте из другой категории.`,
    };
  }

  const diff = balance - Math.max(0, target);

  if (diff < -SMART_NOTE_THRESHOLD) {
    return {
      type: "under",
      color: C.amber,
      soft: C.amberSoft,
      text: `Вы забыли перевести деньги! На карте ${cardLabel(card)} на ${formatMoney(-diff)} меньше, чем запланировано по бюджету «${bucketLabel}»${suffix}.`,
    };
  }

  if (diff > SMART_NOTE_THRESHOLD) {
    return {
      type: "excess",
      color: "#2D8C6F",
      soft: "#E4F2EC",
      text: `Баланс карты ${cardLabel(card)} выше плана «${bucketLabel}» на ${formatMoney(diff)}${suffix}. Возможно, вы забыли распределить эти деньги по другим картам.`,
    };
  }

  return {
    type: "ok",
    color: C.inkMuted,
    soft: C.surface2,
    text: `Баланс ${cardLabel(card)} соответствует плану «${bucketLabel}».`,
  };
}

function computeSmartNotes(transactions, settings) {
  const alloc = computeCumulativeAllocation(transactions, settings);
  const balances = computeBalances(transactions, settings, null);
  const sinceLabel = alloc.sinceDate ? formatDateRu(alloc.sinceDate) : null;

  const needsOver = alloc.needsTarget < 0 ? -alloc.needsTarget : 0;
  const wantsOver = alloc.wantsTarget < 0 ? -alloc.wantsTarget : 0;
  const saveOver = alloc.saveTarget < 0 ? -alloc.saveTarget : 0;

  return {
    sber: smartNoteFor("Нужды", "sber", balances.sber - alloc.baselineSber, alloc.needsTarget, needsOver, sinceLabel),
    alfa: smartNoteFor("Желания", "alfa", balances.alfa - alloc.baselineAlfa, alloc.wantsTarget, wantsOver, sinceLabel),
    ozon: smartNoteFor("Сбережения", "ozon", balances.ozon, alloc.saveTarget, saveOver, null),
  };
}

/* Derives a per-category monthly limit: each category's historical share (last 3
   completed months, i.e. excluding the current in-progress one) of its bucket's total
   spend, applied to this month's bucket plan. Cold start (no history yet) splits the
   bucket plan evenly across the bucket's configured categories. */
function computeCategoryLimits(transactions, settings, categories, bucket, currentMonthKey, bucketLimitThisMonth) {
  const limits = {};
  if (!categories.length || bucketLimitThisMonth <= 0) {
    categories.forEach((c) => { limits[c.name] = 0; });
    return limits;
  }

  const catTotals = {};
  categories.forEach((c) => { catTotals[c.name] = 0; });
  let bucketHistTotal = 0;

  let mk = shiftMonth(currentMonthKey, -1);
  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    const totals = bucket === "wants" ? agg.wantCatTotals : agg.needCatTotals;
    categories.forEach((c) => {
      const v = totals[c.name] || 0;
      catTotals[c.name] += v;
      bucketHistTotal += v;
    });
    mk = shiftMonth(mk, -1);
  }

  if (bucketHistTotal > 0) {
    categories.forEach((c) => {
      limits[c.name] = bucketLimitThisMonth * (catTotals[c.name] / bucketHistTotal);
    });
  } else {
    const evenShare = bucketLimitThisMonth / categories.length;
    categories.forEach((c) => { limits[c.name] = evenShare; });
  }

  // Займы между категориями (в этом же месяце) двигают лимит, а не сами деньги на карте
  transactions.forEach((t) => {
    if (t.type !== "loan" || monthKeyOf(t.date) !== currentMonthKey) return;
    if (t.toCategory in limits) limits[t.toCategory] += t.amount;
    if (t.fromCategory in limits) limits[t.fromCategory] -= t.amount;
  });

  return limits;
}

function categoryStats(transactions, bucket) {
  const byName = {};
  transactions.filter((t) => t.type === "expense" && (t.bucket || bucketOf(t.card)) === bucket).forEach((t) => {
    if (!byName[t.category]) byName[t.category] = {};
    byName[t.category][t.amount] = (byName[t.category][t.amount] || 0) + 1;
  });

  const stats = {};
  Object.entries(byName).forEach(([name, amounts]) => {
    let count = 0;
    let modalAmount = null;
    let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) {
        modalCount = c;
        modalAmount = Number(amtStr);
      }
    });
    stats[name] = { count, modalAmount };
  });

  return stats;
}

function ozonDayStats(transactions) {
  const byDay = {};
  transactions.forEach((t) => {
    let amt = null;
    if (t.type === "transfer" && t.toCard === "ozon") amt = t.amount;
    else if (t.type === "adjustment" && t.card === "ozon" && t.amount > 0) amt = t.amount;
    if (amt == null) return;

    const day = dayOfMonth(t.date);
    if (!byDay[day]) byDay[day] = {};
    byDay[day][amt] = (byDay[day][amt] || 0) + 1;
  });

  const result = {};
  Object.entries(byDay).forEach(([day, amounts]) => {
    let count = 0;
    let modalAmount = null;
    let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) {
        modalCount = c;
        modalAmount = Number(amtStr);
      }
    });
    result[day] = { count, modalAmount };
  });

  return result;
}

function estimateMonthlyRate(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    if (agg.ozonNet !== 0) {
      sum += agg.ozonNet;
      count += 1;
    }
    mk = shiftMonth(mk, -1);
  }

  return count > 0 ? sum / count : 0;
}

function estimateAvgMonthlyNeeds(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    if (agg.needsSpent > 0) {
      sum += agg.needsSpent;
      count += 1;
    }
    mk = shiftMonth(mk, -1);
  }

  return count > 0 ? sum / count : 0;
}

function ruPlural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function runwayText(balance, avgMonthlyNeeds) {
  if (avgMonthlyNeeds <= 0) {
    return "Добавьте несколько трат по «Нуждам» — тогда посчитаем, на сколько хватит подушки.";
  }

  const totalMonths = Math.max(0, balance) / avgMonthlyNeeds;
  const months = Math.floor(totalMonths);
  const days = Math.round((totalMonths - months) * 30);

  if (months === 0 && days === 0) {
    return "Подушка пока не покрывает даже дня обязательных расходов.";
  }

  const parts = [];
  if (months > 0) parts.push(`${months} ${ruPlural(months, "месяц", "месяца", "месяцев")}`);
  if (days > 0) parts.push(`${days} ${ruPlural(days, "день", "дня", "дней")}`);

  return `Ваша подушка безопасности позволит вам полностью не работать ${parts.join(" и ")}.`;
}

function getAllMonthKeys(transactions) {
  const set = new Set(transactions.map((t) => monthKeyOf(t.date)));
  set.add(todayMonthKey());
  return Array.from(set).sort();
}

/* ============================================================ migration (old data shapes) */
function migrateCategoryList(list, defaults) {
  if (!Array.isArray(list) || list.length === 0) return defaults;
  return list.map((item, i) => {
    if (typeof item === "string") {
      const found = defaults.find((d) => d.name === item);
      return found || { name: item, icon: "HelpCircle", color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    }
    return {
      name: item.name || defaults[i]?.name || "Категория",
      icon: item.icon || defaults[i]?.icon || "HelpCircle",
      color: item.color || defaults[i]?.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    };
  });
}

function migrateSettings(raw) {
  if (!raw) return DEFAULT_SETTINGS;

  const looksOld = "salary" in raw || !("savePct" in raw);
  if (looksOld) {
    return {
      ...DEFAULT_SETTINGS,
      goal: raw.goal ?? DEFAULT_SETTINGS.goal,
      openingBalance: { sber: 0, alfa: 0, ozon: raw.savedBefore || 0 },
      needCats: migrateCategoryList(raw.needCats, DEFAULT_NEED_CATS),
      wantCats: migrateCategoryList(raw.wantCats, DEFAULT_WANT_CATS),
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    needCats: migrateCategoryList(raw.needCats, DEFAULT_NEED_CATS),
    wantCats: migrateCategoryList(raw.wantCats, DEFAULT_WANT_CATS),
    openingBalance: { ...DEFAULT_SETTINGS.openingBalance, ...(raw.openingBalance || {}) },
    includeInTotal: { ...DEFAULT_SETTINGS.includeInTotal, ...(raw.includeInTotal || {}) },
    closedMonths: Array.isArray(raw.closedMonths) ? raw.closedMonths : [],
    needsWantsResetDate: raw.needsWantsResetDate || null,
  };
}

function migrateTransactions(list, settings) {
  const out = [];

  (list || []).forEach((t) => {
    if (t.type === "saving") {
      out.push({ ...t, type: "adjustment", card: "ozon" });
      return;
    }

    if (t.type === "income" && !t.card) {
      const s = computeIncomeSplit(t.amount, settings);
      out.push({ ...t, card: "sber" });

      const alfaAmt = Math.round(s.toAlfa);
      const ozonAmt = Math.round(s.toOzon);

      if (alfaAmt > 0) {
        out.push({
          id: uid(),
          type: "transfer",
          date: t.date,
          amount: alfaAmt,
          fromCard: "sber",
          toCard: "alfa",
          note: "Авто-перенос при обновлении приложения",
        });
      }

      if (ozonAmt > 0) {
        out.push({
          id: uid(),
          type: "transfer",
          date: t.date,
          amount: ozonAmt,
          fromCard: "sber",
          toCard: "ozon",
          note: "Авто-перенос при обновлении приложения",
        });
      }

      return;
    }

    if (t.type === "expense" && !t.bucket) {
      out.push({ ...t, bucket: t.card === "alfa" ? "wants" : "needs" });
      return;
    }

    out.push(t);
  });

  return out;
}

/* ============================================================ CSS */
function AppStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html, body, #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        overflow-x: hidden;
        background: ${C.bg};
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: ${C.ink};
      }

      button, input, select, textarea {
        font: inherit;
        max-width: 100%;
      }

      button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .app-viewport {
        width: 100%;
        min-height: 100svh;
        background: ${C.bg};
        color: ${C.ink};
        overflow-x: hidden;
      }

      .app-shell {
        width: 100%;
        max-width: 430px;
        min-height: 100svh;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-x: hidden;
      }

      .app-header {
        flex: 0 0 auto;
        padding: calc(10px + env(safe-area-inset-top)) 14px 6px;
      }

      .app-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .app-title {
        font-size: 18px;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .app-date {
        font-size: 12px;
        color: ${C.inkMuted};
        white-space: nowrap;
      }

      .app-main {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        padding: 8px 12px calc(94px + env(safe-area-inset-bottom));
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }

      .app-main::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      .screen-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        min-width: 0;
      }

      .soft-card {
        width: 100%;
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 18px;
        box-shadow: 0 8px 20px rgba(22, 32, 27, 0.05);
      }

      .panel {
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 18px;
        padding: 14px;
        width: 100%;
        min-width: 0;
      }

      .muted {
        color: ${C.inkMuted};
      }

      .mono {
        font-variant-numeric: tabular-nums;
      }

      .section-title {
        font-size: 12px;
        font-weight: 700;
        color: ${C.ink};
        margin: 12px 2px 8px;
      }

      .month-nav {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 42px;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .month-nav button {
        width: 42px;
        height: 40px;
        border-radius: 13px;
        border: 1px solid ${C.border};
        background: ${C.surface};
        color: ${C.ink};
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .month-label {
        text-align: center;
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .add-panel {
        width: 100%;
        min-width: 0;
        border: 1px solid ${C.border};
        border-radius: 24px;
        padding: 14px 7px 14px;
        overflow: hidden;
        background:
          radial-gradient(circle at 0% 18%, color-mix(in srgb, var(--soft) 65%, transparent) 0, transparent 34%),
          radial-gradient(circle at 100% 82%, color-mix(in srgb, var(--soft) 65%, transparent) 0, transparent 32%),
          linear-gradient(180deg, color-mix(in srgb, var(--soft) 74%, #fff) 0%, ${C.bg} 100%);
      }

      .add-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 50px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }

      .amount-mini {
        min-width: 0;
        text-align: left;
      }

      .amount-mini.right {
        text-align: right;
      }

      .amount-mini span {
        display: block;
        font-size: 10px;
        line-height: 1.1;
        font-weight: 700;
        color: ${C.ink};
        margin-bottom: 2px;
      }

      .amount-mini b {
        display: block;
        font-size: 12px;
        line-height: 1.15;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bank-badge {
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: var(--accent);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        line-height: 1;
        font-weight: 900;
        text-align: center;
        border: 3px solid rgba(255,255,255,0.88);
        box-shadow: 0 4px 12px rgba(22, 32, 27, 0.14);
      }

      .carousel-heading {
        text-align: center;
        margin: 4px 0 10px;
      }

      .carousel-heading h2 {
        margin: 0;
        font-size: 28px;
        line-height: 1.02;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: ${C.ink};
      }

      .carousel-heading .sum {
        margin-top: 3px;
        font-size: 20px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: ${C.ink};
      }

      .limit-status {
        font-size: 12px;
        margin-top: 4px;
        font-weight: 600;
      }

      .hero-row {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 34px;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .side-arrow {
        width: 34px;
        height: 48px;
        border: 0;
        background: transparent;
        color: ${C.inkMuted};
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .side-arrow:disabled {
        opacity: 0.22;
      }

      .big-add {
        width: 100%;
        min-width: 0;
        height: 58px;
        border-radius: 16px;
        border: 1px solid color-mix(in srgb, var(--accent) 35%, ${C.border});
        background: rgba(255,255,255,0.88);
        color: var(--accent);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 14px rgba(22, 32, 27, 0.06);
      }

      .big-add .plus-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--soft) 78%, #fff);
        border: 1px dashed color-mix(in srgb, var(--accent) 40%, ${C.border});
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .big-add span {
        font-size: 13px;
        font-weight: 700;
      }

      .quick-grid {
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .cat-list {
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }

      .cat-row {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border: 1px solid color-mix(in srgb, var(--accent) 16%, ${C.border});
        background: rgba(255,255,255,0.92);
        border-radius: 14px;
        padding: 8px 8px;
        color: ${C.ink};
        box-shadow: 0 3px 8px rgba(22, 32, 27, 0.03);
      }

      .cat-row-top {
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .cat-row-borrow {
        align-self: flex-start;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        color: ${C.danger};
        text-decoration: underline;
        cursor: pointer;
      }

      .cat-row-bar {
        width: 100%;
        height: 5px;
        border-radius: 999px;
        overflow: hidden;
        background: ${C.border};
        display: flex;
      }

      .cat-row-bar-green {
        height: 100%;
        background: ${C.sber};
      }

      .cat-row-bar-red {
        height: 100%;
        background: ${C.danger};
      }

      .cat-row-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cat-row-main {
        flex: 1;
        min-width: 0;
        text-align: left;
      }

      .cat-row-name {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-row-amount {
        font-size: 11px;
        color: ${C.inkMuted};
        font-variant-numeric: tabular-nums;
        margin-top: 1px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-row-chevron {
        flex: 0 0 auto;
        color: ${C.inkMuted};
      }

      .quick-tile {
        min-width: 0;
        min-height: 104px;
        border: 1px solid color-mix(in srgb, var(--accent) 20%, ${C.border});
        background: rgba(255,255,255,0.9);
        border-radius: 17px;
        padding: 9px 7px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: ${C.ink};
        box-shadow: 0 5px 12px rgba(22, 32, 27, 0.04);
      }

      .quick-tile.empty {
        opacity: 0.55;
        border-style: dashed;
      }

      .quick-amount {
        max-width: 100%;
        font-size: 11px;
        line-height: 1.1;
        color: ${C.inkMuted};
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .quick-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--soft) 72%, #fff);
      }

      .quick-icon svg {
        width: 20px;
        height: 20px;
      }

      .quick-name {
        max-width: 100%;
        min-height: 28px;
        font-size: 12px;
        line-height: 1.15;
        font-weight: 700;
        text-align: center;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 12px 0 0;
      }

      .dot {
        width: 7px;
        height: 7px;
        border: 0;
        border-radius: 999px;
        background: ${C.border};
        padding: 0;
      }

      .dot.active {
        background: var(--accent);
      }

      .ozon-detail {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .progress {
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: ${C.ozonSoft};
      }

      .progress div {
        height: 100%;
        border-radius: 999px;
        background: ${C.ozon};
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .stat-box {
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 16px;
        padding: 12px;
      }

      .stat-box .label {
        font-size: 11px;
        color: ${C.inkMuted};
        margin-bottom: 5px;
      }

      .stat-box .value {
        font-size: 15px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .form-card {
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 20px;
        padding: 14px;
        width: 100%;
        min-width: 0;
      }

      .form-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .form-title-row h2 {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
        font-weight: 800;
      }

      .icon-button {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${C.inkMuted};
      }

      .operation-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 5px;
        padding: 4px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 15px;
        margin-bottom: 12px;
      }

      .operation-tabs button {
        min-width: 0;
        height: 34px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: ${C.inkMuted};
        font-size: 11px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .operation-tabs button.active {
        background: ${C.ink};
        color: #fff;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 11px;
        min-width: 0;
      }

      .field label {
        font-size: 11px;
        line-height: 1.1;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: ${C.inkMuted};
      }

      .field input,
      .field select {
        width: 100%;
        height: 44px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 14px;
        color: ${C.ink};
        padding: 0 12px;
        outline: none;
      }

      .field input.amount-input {
        height: 54px;
        font-size: 28px;
        line-height: 1;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .form-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .card-picker {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 11px;
      }

      .card-picker-item {
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 15px;
        padding: 9px 6px;
        text-align: center;
        color: ${C.ink};
      }

      .card-picker-item.active {
        border-color: var(--pick-color);
        background: var(--pick-soft);
      }

      .card-picker-item .main {
        font-size: 12px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .card-picker-item .sub {
        font-size: 10px;
        margin-top: 2px;
        color: ${C.inkMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .button-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 4px;
      }

      .btn {
        height: 44px;
        border-radius: 14px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        color: ${C.ink};
        font-weight: 800;
        cursor: pointer;
      }

      .btn.primary {
        background: ${C.ink};
        border-color: ${C.ink};
        color: #fff;
      }

      .total-balance {
        text-align: center;
        padding: 16px 12px;
      }

      .total-balance .label {
        font-size: 12px;
        color: ${C.inkMuted};
        margin-bottom: 4px;
      }

      .total-balance .value {
        font-size: 27px;
        line-height: 1.12;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        margin-bottom: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .check-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .check-row label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        cursor: pointer;
      }

      .bank-card {
        width: 100%;
        min-width: 0;
        display: flex;
        overflow: hidden;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 18px;
      }

      .bank-stripe {
        width: 5px;
        flex: 0 0 auto;
      }

      .bank-body {
        min-width: 0;
        flex: 1;
        padding: 13px;
      }

      .bank-row {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .bank-name {
        min-width: 0;
        font-size: 14px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bank-value {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 54%;
        text-align: right;
        font-size: 15px;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bank-subrow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 2px;
        margin-bottom: 9px;
        font-size: 11px;
        color: ${C.inkMuted};
      }

      .bank-progress {
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 7px;
      }

      .bank-progress div {
        height: 100%;
        border-radius: 999px;
      }

      .small-note {
        font-size: 11px;
        line-height: 1.35;
        color: ${C.inkMuted};
      }

      .chart-box {
        width: 100%;
        height: 220px;
        min-width: 0;
        overflow: hidden;
      }

      .tx-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 10px 0;
        border-bottom: 1px solid ${C.border};
      }

      .tx-row:last-child {
        border-bottom: 0;
      }

      .tx-day {
        width: 24px;
        flex: 0 0 24px;
        text-align: center;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: ${C.inkMuted};
      }

      .tx-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        flex: 0 0 auto;
      }

      .tx-main {
        min-width: 0;
        flex: 1;
      }

      .tx-label {
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tx-sub {
        font-size: 11px;
        color: ${C.inkMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tx-amount {
        max-width: 112px;
        flex: 0 1 auto;
        font-size: 12px;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
      }

      .delete-btn {
        width: 30px;
        height: 30px;
        border: 0;
        background: transparent;
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        cursor: pointer;
      }

      .empty-state {
        text-align: center;
        padding: 34px 12px;
      }

      .empty-state svg {
        margin: 0 auto 10px;
        color: ${C.inkMuted};
      }

      .bottom-nav {
        position: fixed;
        left: 50%;
        bottom: max(10px, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: min(calc(100vw - 24px), 406px);
        z-index: 30;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 8px;
        border: 1px solid ${C.border};
        border-radius: 22px;
        background: rgba(255,255,255,0.94);
        box-shadow: 0 12px 28px rgba(22, 32, 27, 0.13);
        backdrop-filter: blur(10px);
      }

      .nav-btn {
        min-width: 0;
        height: 54px;
        border: 1px solid ${C.border};
        border-radius: 16px;
        background: ${C.surface};
        color: ${C.inkMuted};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .nav-btn svg {
        width: 20px;
        height: 20px;
      }

      .nav-btn.active {
        background: ${C.sberSoft};
        color: ${C.ink};
        border-color: ${C.border};
      }

      .nav-btn.add.active svg {
        color: ${C.sber};
      }

      .toast {
        position: fixed;
        left: 50%;
        bottom: calc(84px + env(safe-area-inset-bottom));
        transform: translateX(-50%);
        max-width: min(360px, calc(100vw - 32px));
        z-index: 60;
        border-radius: 999px;
        padding: 10px 14px;
        background: ${C.ink};
        color: #fff;
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 800;
        box-shadow: 0 12px 26px rgba(22,32,27,0.2);
      }

      .notice {
        border-radius: 16px;
        padding: 12px;
        font-size: 12px;
        line-height: 1.4;
        border: 1px solid ${C.amber};
        background: ${C.amberSoft};
        color: #8A5A15;
      }

      .history-list {
        border: 1px solid ${C.border};
        border-radius: 18px;
        background: ${C.surface};
        padding: 4px 12px;
      }

      .type-filter {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0 0 10px;
      }

      .type-filter-chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid ${C.border};
        background: ${C.surface};
        color: ${C.inkMuted};
        font-size: 12px;
        font-weight: 700;
      }

      .type-filter-chip.active {
        background: ${C.ink};
        color: #fff;
        border-color: ${C.ink};
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(22, 32, 27, 0.6);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        backdrop-filter: blur(4px);
      }
      
      .modal-card {
        background: ${C.surface};
        border-radius: 28px;
        padding: 24px;
        width: 100%;
        max-width: 360px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
        animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @media (max-width: 360px) {
        .app-main {
          padding-left: 9px;
          padding-right: 9px;
        }

        .add-panel {
          border-radius: 20px;
          padding: 12px 6px;
        }

        .carousel-heading h2 {
          font-size: 25px;
        }

        .carousel-heading .sum {
          font-size: 18px;
        }

        .hero-row {
          grid-template-columns: 28px minmax(0, 1fr) 28px;
          gap: 5px;
        }

        .side-arrow {
          width: 28px;
        }

        .big-add {
          height: 52px;
        }

        .quick-grid {
          gap: 7px;
        }

        .quick-tile {
          min-height: 96px;
          padding: 8px 5px;
        }

        .quick-icon {
          width: 38px;
          height: 38px;
        }

        .cat-list {
          gap: 6px;
        }

        .cat-row {
          padding: 7px 8px;
          gap: 8px;
        }

        .cat-row-icon {
          width: 34px;
          height: 34px;
        }

        .cat-row-name {
          font-size: 12px;
        }

        .cat-row-amount {
          font-size: 10px;
        }

        .operation-tabs button {
          font-size: 10px;
        }

        .field input.amount-input {
          font-size: 24px;
        }

        .bottom-nav {
          width: calc(100vw - 16px);
          gap: 6px;
          padding: 7px;
        }

        .nav-btn {
          height: 50px;
          font-size: 10px;
        }
      }

      @media (max-height: 720px) {
        .app-header {
          padding-top: calc(7px + env(safe-area-inset-top));
          padding-bottom: 3px;
        }

        .app-main {
          padding-top: 6px;
        }

        .add-panel {
          padding-top: 11px;
          padding-bottom: 11px;
        }

        .add-top {
          margin-bottom: 7px;
        }

        .bank-badge {
          width: 42px;
          height: 42px;
        }

        .carousel-heading {
          margin-bottom: 8px;
        }

        .hero-row {
          margin-bottom: 9px;
        }

        .big-add {
          height: 50px;
        }

        .quick-tile {
          min-height: 92px;
        }

        .quick-name {
          min-height: 24px;
        }
      }
    `}</style>
  );
}

/* ============================================================ small UI parts */
function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

function MonthNav({ value, onChange }) {
  return (
    <div className="month-nav">
      <button onClick={() => onChange(shiftMonth(value, -1))} type="button">
        <ChevronLeft size={17} />
      </button>
      <div className="month-label">{monthLabel(value)}</div>
      <button onClick={() => onChange(shiftMonth(value, 1))} type="button">
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function PaydayReminder({ settings, transactions }) {
  const today = todayStr();
  const day = dayOfMonth(today);

  if (!settings.reminderDays.includes(day)) return null;

  const todayIncome = transactions
    .filter((t) => t.type === "income" && t.date === today)
    .reduce((sum, t) => sum + t.amount, 0);

  if (todayIncome <= 0) {
    return (
      <div className="notice">
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Сегодня день выплаты</div>
        <div>
          Не забудьте занести доход на вкладке «Добавить» — после этого приложение подскажет, сколько перевести в Альфа и Озон.
        </div>
      </div>
    );
  }

  // При наличии авто-распределения это напоминание можно оставить для информативности
  const split = computeIncomeSplit(todayIncome, settings);
  const needPct = needPctOf(settings);
  
  return (
    <div className="notice">
      <div style={{ fontWeight: 800, marginBottom: 4 }}>Не забудьте сделать переводы</div>
      <div>
        Из сегодняшнего дохода ({formatMoney(todayIncome)}): {formatMoney(split.toAlfa)} в Альфа,
        {" "}{formatMoney(split.toOzon)} в Озон. Остальное ({needPct}%) остаётся на карте зачисления.
      </div>
    </div>
  );
}

function TotalBalanceCard({ total, settings, onToggle }) {
  const items = [
    { key: "sber", label: "Сбер", color: C.sber },
    { key: "alfa", label: "Альфа", color: C.alfa },
    { key: "ozon", label: "Озон", color: C.ozon },
  ];

  return (
    <div className="soft-card total-balance">
      <div className="label">Общий баланс</div>
      <div className="value">{formatMoney(total)}</div>
      <div className="check-row">
        {items.map((it) => (
          <label key={it.key}>
            <input
              type="checkbox"
              checked={!!settings.includeInTotal?.[it.key]}
              onChange={() => onToggle(it.key)}
            />
            <span style={{ color: it.color }}>{it.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BankCard({ stripe, soft, name, role, bigLabel, bigValue, pct, sub, footnote, note }) {
  return (
    <div className="bank-card">
      <div className="bank-stripe" style={{ background: stripe }} />
      <div className="bank-body">
        <div className="bank-row">
          <span className="bank-name">{name}</span>
          <span className="bank-value">{formatMoney(bigValue)}</span>
        </div>
        <div className="bank-subrow">
          <span>{role}</span>
          <span>{bigLabel}</span>
        </div>
        <div className="bank-progress" style={{ background: soft }}>
          <div style={{ width: `${clampPct(pct) * 100}%`, background: stripe }} />
        </div>
        <div className="small-note mono">{sub}</div>
        {footnote && <div className="small-note" style={{ marginTop: 4 }}>{footnote}</div>}
        {note && note.type !== "ok" && (
          <div className="small-note" style={{ marginTop: 4, fontWeight: 700, color: note.color }}>
            {note.type === "over" ? "🔴" : note.type === "under" ? "🟡" : "🟢"} {note.text}
          </div>
        )}
      </div>
    </div>
  );
}

function TxRow({ tx, onDelete, onEdit }) {
  const color = tx.type === "income" ? C.sber
    : tx.type === "expense" ? (tx.card === "sber" ? C.sber : C.alfa)
    : tx.type === "transfer" ? C.amber
    : tx.type === "loan" ? C.amber
    : (tx.card === "sber" ? C.sber : tx.card === "alfa" ? C.alfa : (tx.amount < 0 ? C.danger : C.ozon));

  const sign = tx.type === "expense" ? "−"
    : tx.type === "transfer" ? ""
    : tx.type === "loan" ? ""
    : (tx.type === "adjustment" && tx.amount < 0) ? "−" : "+";

  const label = tx.type === "income" ? (tx.note || `Доход (${cardLabel(tx.card)})`)
    : tx.type === "expense" ? (tx.note || tx.category)
    : tx.type === "transfer" ? (tx.note || `${cardLabel(tx.fromCard)} → ${cardLabel(tx.toCard)}`)
    : tx.type === "loan" ? (tx.note || `«${tx.toCategory}» одолжили у «${tx.fromCategory}»${tx.repaid ? " · возвращено" : ""}`)
    : (tx.note || `Корректировка (${cardLabel(tx.card)})`);

  const day = tx.date.slice(8, 10);
  const editable = tx.type !== "loan";

  return (
    <div
      className="tx-row"
      style={{ cursor: editable ? "pointer" : "default" }}
      onClick={() => editable && onEdit(tx)}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
    >
      <div className="tx-day">{day}</div>
      <div className="tx-dot" style={{ background: color }} />
      <div className="tx-main">
        <div className="tx-label">{label}</div>
        {tx.type === "expense" && <div className="tx-sub">{tx.category}</div>}
      </div>
      <div className="tx-amount" style={{ color }}>
        {sign}{formatMoney(Math.abs(tx.amount))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
        className="delete-btn"
        type="button"
        aria-label="Удалить"
      >
        <Trash2 size={14} />
      </button>

    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="stat-box">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="soft-card empty-state">
      <Wallet size={34} />
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 14 }}>
        Пока нет операций.<br />Добавьте первый доход или трату.
      </div>
      <button onClick={onAdd} className="btn primary" type="button" style={{ width: "100%" }}>
        Добавить операцию
      </button>
    </div>
  );
}

function Toast({ text }) {
  if (!text) return null;
  return (
    <div className="toast">
      <Check size={15} /> {text}
    </div>
  );
}

/* ============================================================ NEW: Income Modal & Limit Status */
function IncomeDistributionModal({ incomeTx, settings, onDistribute, onClose }) {
  if (!incomeTx) return null;
  
  const split = computeIncomeSplit(incomeTx.amount, settings);
  const needPct = needPctOf(settings);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, background: C.sberSoft, color: C.sber, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <ArrowUp size={24} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: C.ink }}>
            Поступило {formatMoney(incomeTx.amount)}
          </h3>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: 0 }}>Рекомендуем распределить:</p>
        </div>

        <div style={{ background: C.bg, borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Нужды ({needPct}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.sber }}>{formatMoney(split.toSber)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Желания ({settings.wantPct}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.alfa }}>{formatMoney(split.toAlfa)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Сбережения ({settings.savePct}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ozon }}>{formatMoney(split.toOzon)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn primary" onClick={onDistribute}>Распределить автоматически</button>
          <button className="btn" style={{ background: "transparent", border: "none" }} onClick={onClose}>Сделаю сам</button>
        </div>
      </div>
    </div>
  );
}

function BorrowModal({ settings, transactions, request, onSubmit, onClose }) {
  const { bucket, toCategory, suggestedAmount } = request;

  const lenderOptions = catListOf(settings, bucket).filter((c) => c.name !== toCategory);
  const [fromCategory, setFromCategory] = useState(lenderOptions[0]?.name || "");
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [date, setDate] = useState(todayStr());

  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const bucketLimitThisMonth = bucket === "wants" ? agg.wantsLimit : agg.needsLimit;
  const limits = useMemo(
    () => computeCategoryLimits(transactions, settings, catListOf(settings, bucket), bucket, todayMonthKey(), bucketLimitThisMonth),
    [transactions, settings, bucket, bucketLimitThisMonth]
  );
  const spentTotals = bucket === "wants" ? agg.wantCatTotals : agg.needCatTotals;
  const amountNum = moneyNum(amount);

  function submit() {
    if (!fromCategory) {
      window.alert("Выберите, у кого одолжить");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      window.alert("Введите сумму больше 0");
      return;
    }
    onSubmit({
      type: "loan",
      date,
      amount: amountNum,
      fromCategory,
      toCategory,
      repaid: false,
      note: "",
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, background: C.amberSoft, color: C.amber, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Coins size={22} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", color: C.ink }}>
            Одолжить для «{toCategory}»
          </h3>
          <p style={{ fontSize: 12, color: C.inkMuted, margin: 0 }}>
            Лимит просто переедет от одной категории к другой — карту менять не нужно.
          </p>
        </div>

        <div className="field">
          <label>У какой категории занять</label>
          <select value={fromCategory} onChange={(e) => setFromCategory(e.target.value)}>
            {lenderOptions.map((c) => {
              const remaining = Math.round((limits[c.name] || 0) - (spentTotals[c.name] || 0));
              return (
                <option key={c.name} value={c.name}>
                  {c.name} (остаток {formatMoney(remaining)})
                </option>
              );
            })}
          </select>
        </div>

        <AmountField label="Сумма займа" value={amount} onChange={setAmount} big />

        <div className="field">
          <label>Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="button-row">
          <button type="button" className="btn" onClick={onClose}>Отмена</button>
          <button type="button" className="btn primary" onClick={submit}>Одолжить</button>
        </div>
      </div>
    </div>
  );
}

function LimitStatus({ target, avail }) {
  // Больше не используется в интерфейсе: заменён единым индикатором SmartNoteBanner
  // (LimitStatus считал по притоку текущего месяца, SmartNoteBanner — по факту на карте
  // с учётом всей истории, и одновременный показ обоих вводил в заблуждение).
  const diff = Math.round(target - avail);
  if (diff === 0) return null;
  return diff > 0
    ? <div className="limit-status" style={{ color: C.inkMuted }}>Можно доложить: {formatMoney(diff)}</div>
    : <div className="limit-status" style={{ color: C.danger }}>Перебор: {formatMoney(Math.abs(diff))}</div>;
}

function SmartNoteBanner({ note, compact }) {
  if (!note || note.type === "ok") return null;

  const icon = note.type === "over" ? "🔴" : note.type === "under" ? "🟡" : "🟢";

  return (
    <div
      style={{
        borderRadius: compact ? 14 : 16,
        padding: compact ? "9px 11px" : 12,
        fontSize: compact ? 11 : 12,
        lineHeight: 1.4,
        border: `1px solid ${note.color}`,
        background: note.soft,
        color: note.type === "over" ? "#7A241C" : note.type === "under" ? "#8A5A15" : "#1F5C46",
        display: "flex",
        gap: 7,
        alignItems: "flex-start",
      }}
    >
      <span>{icon}</span>
      <span>{note.text}</span>
    </div>
  );
}

/* ============================================================ Add carousel parts */
function BankBadge({ label, accentColor }) {
  return (
    <div className="bank-badge" style={{ background: accentColor }}>
      {label === "check" ? <Check size={23} /> : <span>{label}</span>}
    </div>
  );
}

function TopAmounts({ inflow, outflow, logo, accentColor }) {
  return (
    <div className="add-top">
      <div className="amount-mini">
        <span>Пришло:</span>
        <b style={{ color: C.sber }}>+{formatMoney(Math.abs(inflow))}</b>
      </div>
      <BankBadge label={logo} accentColor={accentColor} />
      <div className="amount-mini right">
        <span>Ушло:</span>
        <b style={{ color: C.danger }}>−{formatMoney(Math.abs(outflow))}</b>
      </div>
    </div>
  );
}

function AddBigButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="big-add" type="button">
      <div className="plus-circle">
        <Plus size={20} />
      </div>
      {label && <span>{label}</span>}
    </button>
  );
}

function ListTile({ icon: Icon, color, name, amount, onClick, empty }) {
  if (empty) {
    return (
      <div className="quick-tile empty">
        <div className="quick-amount">—</div>
        <div className="quick-icon" />
        <div className="quick-name">Свободно</div>
      </div>
    );
  }

  return (
    <button onClick={onClick} className="quick-tile" type="button">
      <div className="quick-amount">{amount != null ? formatMoney(amount) : "—"}</div>
      <div className="quick-icon">
        <Icon size={20} style={{ color }} />
      </div>
      <div className="quick-name">{name}</div>
    </button>
  );
}

function CategoryQuickRow({ icon: Icon, color, name, spent, limit, fallbackAmount, onClick, onBorrow }) {
  const hasLimit = limit > 0;
  const over = hasLimit && spent > limit;

  let greenPct = 0;
  let redPct = 0;
  if (hasLimit) {
    const total = Math.max(spent, limit, 1);
    greenPct = (Math.min(spent, limit) / total) * 100;
    redPct = over ? ((spent - limit) / total) * 100 : 0;
  }

  return (
    <div className="cat-row">
      <button onClick={onClick} className="cat-row-top" type="button">
        <div className="cat-row-icon" style={{ background: color + "22" }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="cat-row-main">
          <div className="cat-row-name">{name}</div>
          <div className="cat-row-amount">
            {hasLimit ? (
              <>
                <span style={over ? { color: C.danger, fontWeight: 800 } : undefined}>
                  {formatMoney(spent)}
                </span>
                {" из "}
                {formatMoney(limit)}
              </>
            ) : fallbackAmount != null ? (
              formatMoney(fallbackAmount)
            ) : (
              "Нет трат"
            )}
          </div>
        </div>
      </button>
      {hasLimit && (
        <div className="cat-row-bar">
          <div className="cat-row-bar-green" style={{ width: `${greenPct}%` }} />
          {redPct > 0 && <div className="cat-row-bar-red" style={{ width: `${redPct}%` }} />}
        </div>
      )}
      {over && onBorrow && (
        <button type="button" className="cat-row-borrow" onClick={onBorrow}>
          Одолжить у другой категории →
        </button>
      )}
    </div>
  );
}

function CategoryDonut({ categories, totals, bucketLabel }) {
  const data = useMemo(
    () =>
      categories
        .map((c) => ({ name: c.name, value: totals[c.name] || 0, color: c.color }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [categories, totals]
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="soft-card" style={{ padding: 16, textAlign: "center", marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          В этом месяце трат по категориям ещё нет — здесь появится диаграмма.
        </div>
      </div>
    );
  }

  return (
    <div className="soft-card" style={{ padding: 14, marginTop: 12 }}>
      <div className="section-title" style={{ margin: "0 0 8px" }}>Структура расходов за месяц</div>
      <div className="chart-box" style={{ height: 190, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(v)} />
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {bucketLabel && (
            <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 2 }}>{bucketLabel}</div>
          )}
          <div className="mono" style={{ fontSize: 16, fontWeight: 900, color: C.ink, lineHeight: 1.1 }}>
            {formatMoney(total)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color, flex: "0 0 auto" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            </span>
            <span className="mono" style={{ fontWeight: 700, flex: "0 0 auto" }}>
              {formatMoney(d.value)} · {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryPanel({
  title,
  accentColor,
  softColor,
  logo,
  card,
  categories,
  transactions,
  settings,
  balances,
  note,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
  onRequestBorrow,
}) {
  const stats = useMemo(() => categoryStats(transactions, bucketOf(card)), [transactions, card]);
  const ordered = useMemo(
    () => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)),
    [categories, stats]
  );

  const balance = balances[card] || 0;
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const outflow = card === "sber" ? agg.sberOutflow : agg.alfaOutflow;
  const monthlyTotals = card === "sber" ? agg.needCatTotals : agg.wantCatTotals;

  const bucketLimitThisMonth = card === "sber" ? agg.needsLimit : agg.wantsLimit;
  const categoryLimits = useMemo(
    () => computeCategoryLimits(transactions, settings, categories, bucketOf(card), todayMonthKey(), bucketLimitThisMonth),
    [transactions, settings, categories, card, bucketLimitThisMonth]
  );

  return (
    <div className="add-panel" style={{ "--accent": accentColor, "--soft": softColor }}>
      <TopAmounts inflow={inflow} outflow={outflow} logo={logo} accentColor={accentColor} />

      <div className="carousel-heading">
        <h2>{title}</h2>
        {/* Баланс вместо потраченного */}
        <div className="sum">{formatMoney(balance)}</div>
      </div>

      <SmartNoteBanner note={note} compact />

      <div className="hero-row">
        <button className="side-arrow" disabled={!canPrev} onClick={onPrev} type="button">
          <ChevronLeft size={30} />
        </button>

        <AddBigButton onClick={() => onOpenFull({ type: "expense", card, bucket: bucketOf(card) })} />

        <button className="side-arrow" disabled={!canNext} onClick={onNext} type="button">
          <ChevronRight size={30} />
        </button>
      </div>

      <div className="cat-list">
        {ordered.map((cat) => {
          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);
          const monthAmount = monthlyTotals[cat.name] || 0;
          const limit = categoryLimits[cat.name] || 0;

          return (
            <CategoryQuickRow
              key={cat.name}
              icon={Icon}
              color={cat.color}
              name={cat.name}
              spent={monthAmount}
              limit={limit}
              fallbackAmount={s?.modalAmount ?? null}
              onClick={() => {
                onOpenFull({
                  type: "expense",
                  card,
                  bucket: bucketOf(card),
                  category: cat.name,
                  amount: s?.modalAmount ?? "",
                });
              }}
              onBorrow={() => onRequestBorrow({
                bucket: bucketOf(card),
                toCategory: cat.name,
                suggestedAmount: Math.max(0, Math.round(monthAmount - limit)),
              })}
            />
          );
        })}
      </div>

      <CategoryDonut categories={categories} totals={monthlyTotals} bucketLabel={title} />
    </div>
  );
}

function OzonPanel({
  settings,
  transactions,
  balances,
  note,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
}) {
  const dayStats = useMemo(() => ozonDayStats(transactions), [transactions]);
  const days = settings.reminderDays.length ? settings.reminderDays : [5, 15, 30];
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);

  const balance = balances.ozon || 0;

  const pct = settings.goal > 0 ? balance / settings.goal : 0;
  const left = settings.goal - balance;
  const rate = useMemo(() => estimateMonthlyRate(transactions, settings, todayMonthKey()), [transactions, settings]);
  const monthsLeft = left <= 0 ? 0 : (rate > 0 ? Math.ceil(left / rate) : null);
  const thisMonth = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const avgMonthlyNeeds = useMemo(() => estimateAvgMonthlyNeeds(transactions, settings, todayMonthKey()), [transactions, settings]);
  const runwayMessage = useMemo(() => runwayText(balance, avgMonthlyNeeds), [balance, avgMonthlyNeeds]);

  const ozonEntries = useMemo(() => {
    const list = transactions.filter((t) =>
      (t.type === "adjustment" && t.card === "ozon") ||
      (t.type === "transfer" && (t.fromCard === "ozon" || t.toCard === "ozon"))
    );
    return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions]);

  const visibleDays = days.slice(0, 4);
  while (visibleDays.length < 4) visibleDays.push(null);

  return (
    <div className="add-panel" style={{ "--accent": C.ozon, "--soft": C.ozonSoft }}>
      <TopAmounts inflow={agg.ozonInflow} outflow={agg.ozonOutflow} logo="ozon" accentColor={C.ozon} />

      <div className="carousel-heading">
        <h2>Подушка</h2>
        <div className="sum">{formatMoney(balance)}</div>
      </div>

      <SmartNoteBanner note={note} compact />

      <div className="hero-row">
        <button className="side-arrow" disabled={!canPrev} onClick={onPrev} type="button">
          <ChevronLeft size={30} />
        </button>

        <AddBigButton
          label="Добавить перевод"
          onClick={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon" })}
        />

        <button className="side-arrow" disabled={!canNext} onClick={onNext} type="button">
          <ChevronRight size={30} />
        </button>
      </div>

      <div className="quick-grid">
        {visibleDays.map((d, i) => {
          if (!d) return <ListTile key={`empty-day-${i}`} empty />;

          const s = dayStats[d];

          return (
            <ListTile
              key={d}
              icon={PiggyBank}
              color={C.ozon}
              name={`${d} числа`}
              amount={s?.modalAmount ?? null}
              onClick={() => {
                onOpenFull({
                  type: "transfer",
                  fromCard: "sber",
                  toCard: "ozon",
                  amount: s?.modalAmount ?? "",
                });
              }}
            />
          );
        })}
      </div>

      <div className="ozon-detail">
        <div className="soft-card" style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 4 }}>Баланс на Озон</div>
          <div className="mono" style={{ fontSize: 27, lineHeight: 1.1, fontWeight: 900, color: C.ozon }}>
            {formatMoney(balance)}
          </div>
          <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4, marginBottom: 11 }}>
            из цели {formatMoney(settings.goal)}
          </div>
          <div className="progress">
            <div style={{ width: `${clampPct(pct) * 100}%` }} />
          </div>
          <div className="small-note" style={{ marginTop: 8, lineHeight: 1.4 }}>
            {runwayMessage}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 9,
            fontSize: 11,
            color: C.inkMuted,
          }}>
            <span className="mono">{Math.round(clampPct(pct) * 100)}%</span>
            <span className="mono" style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {left > 0 ? `осталось ${formatMoney(left)}` : "цель достигнута"}
            </span>
          </div>
        </div>

        <div className="stat-grid">
          <StatBox
            label="В этом месяце"
            value={`${thisMonth.ozonNet >= 0 ? "+" : ""}${formatMoney(thisMonth.ozonNet)}`}
            color={C.ozon}
          />
          <StatBox
            label="Прогноз до цели"
            value={monthsLeft === 0 ? "готово" : monthsLeft ? `~${monthsLeft} мес.` : "—"}
            color={C.ozon}
          />
        </div>

        <div className="notice">
          Деньги из подушки не трогаем ни при каких условиях, кроме реального форс-мажора — потери работы или проблем со здоровьем.
        </div>

        <div>
          <div className="section-title">История по Озон</div>
          {ozonEntries.length === 0 ? (
            <div className="history-list" style={{ padding: 16, textAlign: "center", fontSize: 12, color: C.inkMuted }}>
              Переводы и корректировки, которые касаются Озон, появятся здесь.
            </div>
          ) : (
            <div className="history-list">
              {ozonEntries.slice(0, 8).map((t) => {
                const isTransferOut = t.type === "transfer" && t.fromCard === "ozon";
                const signedAmt = isTransferOut ? -t.amount : t.amount;
                const label = t.type === "adjustment"
                  ? (t.note || (t.amount < 0 ? "Списание" : "Пополнение"))
                  : isTransferOut ? (t.note || `Перевод в ${cardLabel(t.toCard)}`)
                  : (t.note || `Перевод из ${cardLabel(t.fromCard)}`);

                return (
                  <div key={t.id} className="tx-row">
                    <div className="tx-main">
                      <div className="tx-label">{label} {t.hidden ? "(скрыто)" : ""}</div>
                      <div className="tx-sub">{t.date}</div>
                    </div>
                    <div className="tx-amount" style={{ color: signedAmt < 0 ? C.danger : C.ozon }}>
                      {signedAmt < 0 ? "−" : "+"}{formatMoney(Math.abs(signedAmt))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Add form */
const ALL_CARDS = [
  { id: "sber", label: "Сбер", color: C.sber, soft: C.sberSoft },
  { id: "alfa", label: "Альфа", color: C.alfa, soft: C.alfaSoft },
  { id: "ozon", label: "Озон", color: C.ozon, soft: C.ozonSoft },
];

function CardPicker({ options, value, onChange }) {
  return (
    <div className="card-picker">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`card-picker-item ${value === o.id ? "active" : ""}`}
          style={{ "--pick-color": o.color, "--pick-soft": o.soft }}
        >
          <div className="main" style={{ color: value === o.id ? o.color : C.ink }}>{o.label}</div>
          {o.sub && <div className="sub">{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

function OperationTabs({ value, onChange }) {
  const tabs = [
    { id: "expense", label: "Трата" },
    { id: "income", label: "Доход" },
    { id: "transfer", label: "Перевод" },
    { id: "adjustment", label: "Коррекция" },
  ];

  return (
    <div className="operation-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={value === t.id ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const BUCKET_OPTIONS = [
  { id: "needs", label: "Нужды", color: C.sber, soft: C.sberSoft },
  { id: "wants", label: "Желания", color: C.alfa, soft: C.alfaSoft },
];

function homeCardOf(bucket) { return bucket === "wants" ? "alfa" : "sber"; }
function bucketOf(card) { return card === "alfa" ? "wants" : "needs"; }
function catListOf(settings, bucket) { return bucket === "wants" ? settings.wantCats : settings.needCats; }

function AmountField({ label, value, onChange, big }) {
  const evaluated = evalMoneyExpr(value);
  const stripped = String(value ?? "").trim().replace(/^-/, "");
  const hasOp = /[+\-*/]/.test(stripped);
  const showPreview = String(value ?? "") !== "" && hasOp && Number.isFinite(evaluated);

  return (
    <div className="field">
      <label>{label}</label>
      <input
        className={big ? "amount-input mono" : "mono"}
        inputMode="decimal"
        type="text"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showPreview && (
        <div className="small-note" style={{ marginTop: -1 }}>
          = {formatMoney(evaluated)}
        </div>
      )}
    </div>
  );
}

function FullAddForm({ settings, transactions, initial, onSubmit, onCancel }) {
  const defaultCategoryFor = (bucket) => catListOf(settings, bucket)[0]?.name || "";
  const initialBucket = initial?.bucket || bucketOf(initial?.card || "sber");

  const [type, setType] = useState(initial?.type || "expense");
  const [date, setDate] = useState(initial?.date || todayStr());
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [card, setCard] = useState(initial?.card || homeCardOf(initialBucket));
  const [bucket, setBucket] = useState(initialBucket);
  const [fromCard, setFromCard] = useState(initial?.fromCard || "sber");
  const [toCard, setToCard] = useState(initial?.toCard || "alfa");
  const [category, setCategory] = useState(initial?.category || defaultCategoryFor(initialBucket));
  const [note, setNote] = useState(initial?.note || "");

  const [split, setSplit] = useState(false);
  const [splitAmount2, setSplitAmount2] = useState("");
  const [splitCategory2, setSplitCategory2] = useState("");

  useEffect(() => {
    const b = initial?.bucket || bucketOf(initial?.card || "sber");
    setType(initial?.type || "expense");
    setDate(initial?.date || todayStr());
    setAmount(initial?.amount ?? "");
    setCard(initial?.card || homeCardOf(b));
    setBucket(b);
    setFromCard(initial?.fromCard || "sber");
    setToCard(initial?.toCard || "alfa");
    setCategory(initial?.category || defaultCategoryFor(b));
    setNote(initial?.note || "");
    setSplit(false);
    setSplitAmount2("");
    setSplitCategory2("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (type !== "expense") return;
    const list = catListOf(settings, bucket);
    if (!list.some((c) => c.name === category)) {
      setCategory(list[0]?.name || "");
    }
  }, [type, bucket, category, settings.needCats, settings.wantCats]);

  useEffect(() => {
    const otherBucket = bucket === "wants" ? "needs" : "wants";
    const list = catListOf(settings, otherBucket);
    if (!list.some((c) => c.name === splitCategory2)) {
      setSplitCategory2(list[0]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, split, settings.needCats, settings.wantCats]);

  const amountNum = moneyNum(amount);
  const splitAmountNum = moneyNum(splitAmount2);
  const categories = catListOf(settings, bucket);
  const otherBucket = bucket === "wants" ? "needs" : "wants";
  const otherCategories = catListOf(settings, otherBucket);

  const isEdit = !!initial?.editId;
  const homeCard = homeCardOf(bucket);
  const isAnomaly = type === "expense" && card !== homeCard;

  const computedBalance = useMemo(
    () => computeBalances(transactions || [], settings, date)[card],
    [transactions, settings, date, card]
  );
  const hasRealBalanceInput = amount !== "" && Number.isFinite(evalMoneyExpr(amount));
  const balanceDiff = Math.round(amountNum - computedBalance);
  const hasEditAmountInput = amount !== "" && Number.isFinite(evalMoneyExpr(amount)) && evalMoneyExpr(amount) !== 0;

  function submit(e) {
    e.preventDefault();

    if (type !== "adjustment" && (!amountNum || amountNum <= 0)) {
      window.alert("Введите сумму больше 0");
      return;
    }

    if (type === "transfer" && fromCard === toCard) {
      window.alert("Выберите разные карты для перевода");
      return;
    }

    if (type === "expense" && split && !isEdit) {
      if (!splitAmountNum || splitAmountNum <= 0) {
        window.alert("Укажите сумму второй части разбивки");
        return;
      }
      const groupId = uid();
      onSubmit([
        {
          type: "expense",
          date,
          amount: amountNum,
          card,
          bucket,
          category,
          note: note.trim(),
          splitGroup: groupId,
        },
        {
          type: "expense",
          date,
          amount: splitAmountNum,
          card,
          bucket: otherBucket,
          category: splitCategory2,
          note: note.trim(),
          splitGroup: groupId,
        },
      ]);
      return;
    }

    if (type === "income") {
      onSubmit({
        type: "income",
        date,
        amount: amountNum,
        card,
        note: note.trim(),
      });
    } else if (type === "expense") {
      onSubmit({
        type: "expense",
        date,
        amount: amountNum,
        card,
        bucket,
        category,
        note: note.trim(),
      });
    } else if (type === "transfer") {
      onSubmit({
        type: "transfer",
        date,
        amount: amountNum,
        fromCard,
        toCard,
        note: note.trim(),
      });
    } else if (type === "adjustment" && isEdit) {
      if (!hasEditAmountInput) {
        window.alert("Введите сумму корректировки (не равную 0)");
        return;
      }
      onSubmit({
        type: "adjustment",
        date,
        amount: amountNum,
        card,
        note: note.trim() || "Сверка баланса",
      });
    } else if (type === "adjustment") {
      if (!hasRealBalanceInput) {
        window.alert("Введите реальный баланс карты");
        return;
      }
      if (balanceDiff === 0) {
        onCancel();
        return;
      }
      onSubmit({
        type: "adjustment",
        date,
        amount: balanceDiff,
        card,
        note: note.trim() || "Сверка баланса",
      });
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-title-row">
        <h2>{isEdit ? "Изменить операцию" : "Новая операция"}</h2>
        <button type="button" onClick={onCancel} className="icon-button" aria-label="Закрыть">
          <X size={18} />
        </button>
      </div>

      <OperationTabs value={type} onChange={setType} />

      <AmountField
        label={
          type === "adjustment"
            ? (isEdit ? "Сумма корректировки" : "Реальный баланс карты сейчас")
            : type === "expense" && split && !isEdit
            ? "Сумма (часть 1)"
            : "Сумма"
        }
        value={amount}
        onChange={setAmount}
        big
      />

      <div className="field">
        <label>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {type === "expense" && (
        <>
          <div className="field">
            <label>Категория бюджета</label>
            <CardPicker options={BUCKET_OPTIONS} value={bucket} onChange={setBucket} />
          </div>

          <div className="field">
            <label>{split ? "Категория (часть 1)" : "Категория"}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Карта списания</label>
            <CardPicker options={ALL_CARDS} value={card} onChange={setCard} />
          </div>

          {isAnomaly && (
            <div
              className="notice"
              style={{ borderColor: C.amber, background: C.amberSoft, marginBottom: 11 }}
            >
              ⚠️ Вы платите за «{bucket === "wants" ? "Желания" : "Нужды"}» картой {cardLabel(card)}, а не {cardLabel(homeCard)}.
              После сохранения баланс карт разойдётся с планом — приложение подскажет, сколько перевести для выравнивания.
            </div>
          )}

          {!isEdit && (
            <div className="field" style={{ marginBottom: split ? 11 : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} style={{ width: "auto" }} />
                <span style={{ textTransform: "none", letterSpacing: 0 }}>Разбить между Нуждами и Желаниями</span>
              </label>
            </div>
          )}

          {split && !isEdit && (
            <>
              <AmountField
                label={`Сумма (часть 2, «${otherBucket === "wants" ? "Желания" : "Нужды"}»)`}
                value={splitAmount2}
                onChange={setSplitAmount2}
              />
              <div className="field">
                <label>Категория (часть 2)</label>
                <select value={splitCategory2} onChange={(e) => setSplitCategory2(e.target.value)}>
                  {otherCategories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="small-note" style={{ marginBottom: 11 }}>
                Итого спишется с {cardLabel(card)}: {formatMoney(amountNum + splitAmountNum)}
              </div>
            </>
          )}
        </>
      )}

      {type === "income" && (
        <div className="field">
          <label>Куда пришёл доход</label>
          <CardPicker options={ALL_CARDS} value={card} onChange={setCard} />
        </div>
      )}

      {type === "transfer" && (
        <div className="form-grid-2">
          <div className="field">
            <label>Откуда</label>
            <select value={fromCard} onChange={(e) => setFromCard(e.target.value)}>
              {ALL_CARDS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Куда</label>
            <select value={toCard} onChange={(e) => setToCard(e.target.value)}>
              {ALL_CARDS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {type === "adjustment" && (
        <>
          <div className="field">
            <label>Карта</label>
            <CardPicker options={ALL_CARDS} value={card} onChange={setCard} />
          </div>

          {isEdit ? (
            <div className="notice" style={{ marginBottom: 11 }}>
              Меняете сумму этой записи напрямую. Положительное число — пополнение, отрицательное — списание.
            </div>
          ) : (
            <div
              className="notice"
              style={
                !hasRealBalanceInput
                  ? {}
                  : balanceDiff === 0
                  ? { borderColor: "#2D8C6F", background: "#E4F2EC", color: "#1F5C46" }
                  : balanceDiff > 0
                  ? { borderColor: C.sber, background: C.sberSoft, color: "#1E5C39" }
                  : { borderColor: C.danger, background: C.dangerSoft, color: "#7A241C" }
              }
            >
              <div style={{ marginBottom: 4 }}>
                В приложении на {date}: <b className="mono">{formatMoney(computedBalance)}</b>
              </div>
              {!hasRealBalanceInput ? (
                <div>Введите баланс, который видите в банке — сравним с расчётом приложения.</div>
              ) : balanceDiff === 0 ? (
                <div>Совпадает с приложением. Корректировка не нужна — просто закройте форму.</div>
              ) : balanceDiff > 0 ? (
                <div>
                  На карте на {formatMoney(balanceDiff)} больше, чем в приложении. «Сохранить» внесёт пополнение
                  на эту сумму в историю.
                </div>
              ) : (
                <div>
                  На карте на {formatMoney(Math.abs(balanceDiff))} меньше, чем в приложении. «Сохранить» внесёт
                  списание на эту сумму в историю.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="field">
        <label>Заметка</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
      </div>

      <div className="button-row">
        <button type="button" onClick={onCancel} className="btn">Отмена</button>
        <button type="submit" className="btn primary">Сохранить</button>
      </div>
    </form>
  );
}

/* ============================================================ Add view */
function AddPageContent({
  pageIndex,
  settings,
  transactions,
  openForm,
  onRequestBorrow,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectPage,
}) {
  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);
  const smartNotes = useMemo(() => computeSmartNotes(transactions, settings), [transactions, settings]);

  const pages = [
    {
      accent: C.sber,
      label: "Нужды",
      render: () => (
        <CategoryPanel
          title="Нужды"
          accentColor={C.sber}
          softColor={C.sberSoft}
          logo="check"
          card="sber"
          categories={settings.needCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          note={smartNotes.sber}
          onOpenFull={openForm}
          onRequestBorrow={onRequestBorrow}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      ),
    },
    {
      accent: C.alfa,
      label: "Желания",
      render: () => (
        <CategoryPanel
          title="Желания"
          accentColor={C.alfa}
          softColor={C.alfaSoft}
          logo="A"
          card="alfa"
          categories={settings.wantCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          note={smartNotes.alfa}
          onOpenFull={openForm}
          onRequestBorrow={onRequestBorrow}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      ),
    },
    {
      accent: C.ozon,
      label: "Подушка",
      render: () => (
        <OzonPanel
          settings={settings}
          transactions={transactions}
          balances={balances}
          note={smartNotes.ozon}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      ),
    },
  ];

  const current = pages[pageIndex];

  return (
    <div className="screen-stack">
      {current.render()}

      <div className="dots" style={{ "--accent": current.accent }}>
        {pages.map((p, i) => (
          <button
            key={p.label}
            className={`dot ${i === pageIndex ? "active" : ""}`}
            type="button"
            onClick={() => onSelectPage(i)}
            aria-label={p.label}
          />
        ))}
      </div>
    </div>
  );
}

/* Builds a FullAddForm "initial" seed from an existing transaction, for editing. */
function deriveFormInitialFromTx(tx) {
  const base = { type: tx.type, date: tx.date, amount: tx.amount, note: tx.note || "", editId: tx.id };
  if (tx.type === "expense") {
    return { ...base, card: tx.card, bucket: tx.bucket || bucketOf(tx.card), category: tx.category };
  }
  if (tx.type === "income") {
    return { ...base, card: tx.card };
  }
  if (tx.type === "transfer") {
    return { ...base, fromCard: tx.fromCard, toCard: tx.toCard };
  }
  if (tx.type === "adjustment") {
    return { ...base, card: tx.card };
  }
  return base;
}

/* ============================================================ Analysis */
const TX_TYPE_FILTERS = [
  { id: "expense", label: "Траты" },
  { id: "income", label: "Доходы" },
  { id: "transfer", label: "Переводы" },
  { id: "adjustment", label: "Коррекции" },
  { id: "loan", label: "Займы" },
];

const TX_DATE_FILTERS = [
  { id: "today", label: "Сегодня" },
  { id: "yesterday", label: "Вчера" },
];

function txNetImpact(t) {
  if (t.type === "expense") return -t.amount;
  if (t.type === "income") return t.amount;
  if (t.type === "adjustment") return t.amount;
  return 0; // перевод между своими картами не меняет общую сумму
}

function AnalysisView({
  settings,
  transactions,
  selectedMonth,
  setSelectedMonth,
  onDelete,
  onEditTx,
  onToggleInclude,
  onCloseMonth,
  onToggleLoanRepaid,
  goToAdd,
}) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const balances = useMemo(
    () => computeBalances(transactions, settings, endOfMonthStr(selectedMonth)),
    [transactions, settings, selectedMonth]
  );
  const smartNotes = useMemo(() => computeSmartNotes(transactions, settings), [transactions, settings]);
  const hasSmartNotes = [smartNotes.sber, smartNotes.alfa, smartNotes.ozon].some((n) => n.type !== "ok");
  const openLoans = useMemo(
    () => transactions.filter((t) => t.type === "loan" && !t.repaid).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );
  const isPastMonth = selectedMonth < todayMonthKey();
  const monthNeedsLeftover = agg.needsLimit - agg.needsSpent;
  const monthWantsLeftover = agg.wantsLimit - agg.wantsSpent;
  const showCloseBanner =
    isPastMonth &&
    !(settings.closedMonths || []).includes(selectedMonth) &&
    (monthNeedsLeftover > 1 || monthWantsLeftover > 1);

  const totalBalance = ["sber", "alfa", "ozon"].reduce((sum, key) => {
    if (!settings.includeInTotal?.[key]) return sum;
    return sum + (balances[key] || 0);
  }, 0);

  const chartData = [
    { name: "Нужды", value: agg.needsSpent, fill: C.sber },
    { name: "Желания", value: agg.wantsSpent, fill: C.alfa },
    { name: "Подушка", value: Math.max(0, agg.ozonNet), fill: C.ozon },
  ];

  const monthItems = agg.items;
  const [typeFilters, setTypeFilters] = useState([]);
  const [dateFilters, setDateFilters] = useState([]);

  function toggleFilter(list, setList, id) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const filteredItems = monthItems.filter((t) => {
    const typeOk = typeFilters.length === 0 || typeFilters.includes(t.type);
    const dateOk =
      dateFilters.length === 0 ||
      (dateFilters.includes("today") && t.date === todayStr()) ||
      (dateFilters.includes("yesterday") && t.date === yesterdayStr());
    return typeOk && dateOk;
  });

  const filteredTotal = filteredItems.reduce((sum, t) => sum + txNetImpact(t), 0);

  return (
    <div className="screen-stack">
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <PaydayReminder settings={settings} transactions={transactions} />

      {(hasSmartNotes || openLoans.length > 0) && (
        <div className="panel">
          <SectionTitle>Фонд</SectionTitle>

          {hasSmartNotes && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: openLoans.length > 0 ? 10 : 0 }}>
              <SmartNoteBanner note={smartNotes.sber} />
              <SmartNoteBanner note={smartNotes.alfa} />
              <SmartNoteBanner note={smartNotes.ozon} />
            </div>
          )}

          {openLoans.length > 0 && (
            <div className="history-list">
              {openLoans.map((loan) => (
                <div key={loan.id} className="tx-row">
                  <div className="tx-main">
                    <div className="tx-label">«{loan.toCategory}» одолжили у «{loan.fromCategory}»</div>
                    <div className="tx-sub">{loan.date}</div>
                  </div>
                  <div className="tx-amount" style={{ color: C.amber }}>{formatMoney(loan.amount)}</div>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 30, padding: "0 10px", fontSize: 11, flex: "0 0 auto" }}
                    onClick={() => onToggleLoanRepaid(loan.id)}
                  >
                    Вернул
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCloseBanner && (
        <div className="notice" style={{ borderColor: C.ozon, background: C.ozonSoft, color: "#0F3E70" }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{monthLabel(selectedMonth)} завершён</div>
          <div style={{ marginBottom: 10 }}>
            Остаток: Нужды {formatMoney(Math.max(0, monthNeedsLeftover))}, Желания {formatMoney(Math.max(0, monthWantsLeftover))}.
            Перенести на текущий месяц или отправить в Сбережения?
          </div>
          <div className="button-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              onClick={() => onCloseMonth(selectedMonth, "keep", monthNeedsLeftover, monthWantsLeftover)}
            >
              Перенести
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => onCloseMonth(selectedMonth, "toSavings", monthNeedsLeftover, monthWantsLeftover)}
            >
              В сбережения
            </button>
          </div>
        </div>
      )}

      <TotalBalanceCard total={totalBalance} settings={settings} onToggle={onToggleInclude} />

      <div className="stat-grid">
        <StatBox label="Доход" value={`+${formatMoney(agg.incomeTotal)}`} color={C.sber} />
        <StatBox label="Расходы" value={`−${formatMoney(agg.sberSpent + agg.alfaSpent + agg.ozonSpent)}`} color={C.danger} />
      </div>

      <BankCard
        stripe={C.sber}
        soft={C.sberSoft}
        name="Сбер"
        role={`Нужды · ${needPctOf(settings)}%`}
        bigLabel="баланс"
        bigValue={balances.sber}
        pct={agg.sberAvail > 0 ? agg.sberSpent / agg.sberAvail : 0}
        sub={`Потрачено ${formatMoney(agg.sberSpent)} из ${formatMoney(Math.max(0, agg.sberAvail))}`}
      />

      <BankCard
        stripe={C.alfa}
        soft={C.alfaSoft}
        name="Альфа"
        role={`Желания · ${settings.wantPct}%`}
        bigLabel="баланс"
        bigValue={balances.alfa}
        pct={agg.alfaAvail > 0 ? agg.alfaSpent / agg.alfaAvail : 0}
        sub={`Потрачено ${formatMoney(agg.alfaSpent)} из ${formatMoney(Math.max(0, agg.alfaAvail))}`}
      />

      <BankCard
        stripe={C.ozon}
        soft={C.ozonSoft}
        name="Озон"
        role={`Подушка · ${settings.savePct}%`}
        bigLabel="баланс"
        bigValue={balances.ozon}
        pct={settings.goal > 0 ? balances.ozon / settings.goal : 0}
        sub={`Цель: ${formatMoney(settings.goal)}`}
      />

      <div className="panel">
        <SectionTitle>Структура месяца</SectionTitle>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 4, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.inkMuted }} />
              <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} width={42} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" name="Сумма" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Операции</SectionTitle>

        {monthItems.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 2px 10px" }}>
              <span className="muted" style={{ fontSize: 12 }}>Итого по показанным</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 900, color: filteredTotal >= 0 ? C.sber : C.danger }}>
                {filteredTotal >= 0 ? "+" : "−"}{formatMoney(Math.abs(filteredTotal))}
              </span>
            </div>

            <div className="type-filter">
              {TX_TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`type-filter-chip ${typeFilters.includes(f.id) ? "active" : ""}`}
                  onClick={() => toggleFilter(typeFilters, setTypeFilters, f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="type-filter">
              {TX_DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`type-filter-chip ${dateFilters.includes(f.id) ? "active" : ""}`}
                  onClick={() => toggleFilter(dateFilters, setDateFilters, f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {monthItems.length === 0 ? (
          <EmptyState onAdd={goToAdd} />
        ) : filteredItems.length === 0 ? (
          <div className="soft-card" style={{ padding: 20, textAlign: "center" }}>
            <span className="muted" style={{ fontSize: 13 }}>Ничего не подходит под выбранные фильтры.</span>
          </div>
        ) : (
          <div className="history-list">
            {filteredItems.map((tx) => (
              <TxRow key={tx.id} tx={tx} onDelete={onDelete} onEdit={onEditTx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ Settings */
function CategoryRow({ cat, onChange, onDelete }) {
  const Icon = getIcon(cat.icon);

  return (
    <div className="tx-row">
      <div className="quick-icon" style={{ width: 38, height: 38, background: cat.color + "22" }}>
        <Icon size={18} style={{ color: cat.color }} />
      </div>

      <div className="tx-main">
        <input
          value={cat.name}
          onChange={(e) => onChange({ ...cat, name: e.target.value })}
          style={{
            width: "100%",
            height: 34,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "0 10px",
            background: C.surface2,
            color: C.ink,
          }}
        />
      </div>

      <button onClick={onDelete} className="delete-btn" type="button" aria-label="Удалить">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function SettingsView({ settings, onSave, onWipeAll, onResetTracking }) {
  const [draft, setDraft] = useState(settings);
  const [daysText, setDaysText] = useState((settings.reminderDays || []).join(", "));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setDaysText((settings.reminderDays || []).join(", "));
  }, [settings]);

  function numberValue(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function save() {
    const reminderDays = daysText
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => Number.isFinite(x) && x >= 1 && x <= 31);

    const next = {
      ...draft,
      wantPct: numberValue(draft.wantPct),
      savePct: numberValue(draft.savePct),
      goal: numberValue(draft.goal),
      reminderDays,
      openingBalance: {
        sber: numberValue(draft.openingBalance?.sber),
        alfa: numberValue(draft.openingBalance?.alfa),
        ozon: numberValue(draft.openingBalance?.ozon),
      },
    };

    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1300);
  }

  function updateNeedCat(index, next) {
    setDraft((d) => {
      const arr = [...d.needCats];
      arr[index] = next;
      return { ...d, needCats: arr };
    });
  }

  function updateWantCat(index, next) {
    setDraft((d) => {
      const arr = [...d.wantCats];
      arr[index] = next;
      return { ...d, wantCats: arr };
    });
  }

  return (
    <div className="screen-stack">
      <div className="panel">
        <SectionTitle>Правило распределения</SectionTitle>

        <div className="form-grid-2">
          <div className="field">
            <label>Желания, %</label>
            <input
              type="number"
              value={draft.wantPct}
              onChange={(e) => setDraft({ ...draft, wantPct: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Подушка, %</label>
            <input
              type="number"
              value={draft.savePct}
              onChange={(e) => setDraft({ ...draft, savePct: e.target.value })}
            />
          </div>
        </div>

        <div className="notice" style={{ marginBottom: 12 }}>
          На нужды остаётся {needPctOf({ ...draft, wantPct: Number(draft.wantPct), savePct: Number(draft.savePct) })}% дохода.
        </div>

        <div className="field">
          <label>Дни напоминаний</label>
          <input value={daysText} onChange={(e) => setDaysText(e.target.value)} placeholder="5, 15, 30" />
        </div>

        <div className="field">
          <label>Цель подушки</label>
          <input
            type="number"
            value={draft.goal}
            onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
          />
        </div>
      </div>

      <div className="panel">
        <SectionTitle>Сверка Нужд и Желаний</SectionTitle>
        <div className="small-note" style={{ marginBottom: 10 }}>
          Подсказки по Сбер/Альфа считают излишки и недокиды с {settings.needsWantsResetDate
            ? `${formatDateRu(settings.needsWantsResetDate)}`
            : "самого начала"}. Каждое «Закрыть месяц» в Анализе сдвигает эту точку вперёд
          автоматически. Если цифры накопились и выглядят непропорционально — сбросьте отсчёт
          на сегодня (баланс на сейчас будет принят за новую точку отсчёта, старые остатки
          никуда не денутся физически, просто перестанут считаться «излишком»/«недокидом»).
        </div>
        <button
          className="btn"
          type="button"
          style={{ width: "100%" }}
          onClick={() => {
            if (window.confirm("Сбросить точку отсчёта Нужд/Желаний на сегодня?")) {
              onResetTracking();
            }
          }}
        >
          Сбросить отсчёт на сегодня
        </button>
      </div>

      <div className="panel">
        <SectionTitle>Начальные балансы</SectionTitle>

        <div className="form-grid-2">
          <div className="field">
            <label>Сбер</label>
            <input
              type="number"
              value={draft.openingBalance?.sber ?? 0}
              onChange={(e) => setDraft({
                ...draft,
                openingBalance: { ...draft.openingBalance, sber: e.target.value },
              })}
            />
          </div>
          <div className="field">
            <label>Альфа</label>
            <input
              type="number"
              value={draft.openingBalance?.alfa ?? 0}
              onChange={(e) => setDraft({
                ...draft,
                openingBalance: { ...draft.openingBalance, alfa: e.target.value },
              })}
            />
          </div>
        </div>

        <div className="field">
          <label>Озон</label>
          <input
            type="number"
            value={draft.openingBalance?.ozon ?? 0}
            onChange={(e) => setDraft({
              ...draft,
              openingBalance: { ...draft.openingBalance, ozon: e.target.value },
            })}
          />
        </div>
      </div>

      <div className="panel">
        <SectionTitle>Категории нужд</SectionTitle>
        <div className="history-list">
          {draft.needCats.map((cat, i) => (
            <CategoryRow
              key={`${cat.name}-${i}`}
              cat={cat}
              onChange={(next) => updateNeedCat(i, next)}
              onDelete={() => setDraft((d) => ({ ...d, needCats: d.needCats.filter((_, k) => k !== i) }))}
            />
          ))}
        </div>

        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => setDraft((d) => ({
            ...d,
            needCats: [
              ...d.needCats,
              { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.needCats.length % CATEGORY_COLORS.length] },
            ],
          }))}
        >
          Добавить категорию
        </button>
      </div>

      <div className="panel">
        <SectionTitle>Категории Желаний</SectionTitle>
        <div className="history-list">
          {draft.wantCats.map((cat, i) => (
            <CategoryRow
              key={`${cat.name}-${i}`}
              cat={cat}
              onChange={(next) => updateWantCat(i, next)}
              onDelete={() => setDraft((d) => ({ ...d, wantCats: d.wantCats.filter((_, k) => k !== i) }))}
            />
          ))}
        </div>

        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => setDraft((d) => ({
            ...d,
            wantCats: [
              ...d.wantCats,
              { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.wantCats.length % CATEGORY_COLORS.length] },
            ],
          }))}
        >
          Добавить категорию
        </button>
      </div>

      <div className="button-row">
        <button className="btn primary" type="button" onClick={save}>
          {saved ? "Сохранено" : "Сохранить"}
        </button>
        <button
          className="btn"
          type="button"
          style={{ color: C.danger }}
          onClick={() => {
            if (window.confirm("Удалить все операции? Настройки останутся.")) {
              onWipeAll();
            }
          }}
        >
          Очистить
        </button>
      </div>
    </div>
  );
}

/* ============================================================ Bottom nav */
function TabBar({ pageIndex, onSelectAdd, onSelectAnalysis, onSelectSettings }) {
  const items = [
    { id: "add", label: "Добавить", icon: Plus, cls: "add", onClick: onSelectAdd, active: pageIndex <= 2 },
    { id: "analysis", label: "Анализ", icon: BarChart3, cls: "", onClick: onSelectAnalysis, active: pageIndex === 3 },
    { id: "settings", label: "Настройки", icon: SettingsIcon, cls: "", onClick: onSelectSettings, active: pageIndex === 4 },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            type="button"
            className={`nav-btn ${it.cls} ${it.active ? "active" : ""}`}
            onClick={it.onClick}
          >
            <Icon />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================ App */
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); // 0 Нужды, 1 Желания, 2 Подушка, 3 Анализ, 4 Настройки
  const [lastAddPage, setLastAddPage] = useState(0);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null);
  const [borrowRequest, setBorrowRequest] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);
  const touchRef = useRef(null);

  useEffect(() => {
    if (pageIndex <= 2) setLastAddPage(pageIndex);
  }, [pageIndex]);

  useEffect(() => {
    let alive = true;

    (async () => {
      let s = DEFAULT_SETTINGS;
      let t = [];

      try {
        const r = await storage.get("settings");
        if (r && r.value) s = migrateSettings(JSON.parse(r.value));
      } catch (e) {
        console.warn("Не удалось загрузить настройки", e);
      }

      try {
        const r = await storage.get("transactions");
        if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s);
      } catch (e) {
        console.warn("Не удалось загрузить операции", e);
      }

      if (alive) {
        setSettings(s);
        setTransactions(t);
        setLoaded(true);
      }
    })();

    return () => { alive = false; };
  }, []);

  async function persistTransactions(next) {
    setTransactions(next);
    try {
      await storage.set("transactions", JSON.stringify(next));
    } catch (e) {
      console.warn("Не удалось сохранить операции", e);
    }
  }

  async function persistSettings(next) {
    setSettings(next);
    try {
      await storage.set("settings", JSON.stringify(next));
    } catch (e) {
      console.warn("Не удалось сохранить настройки", e);
    }
  }

  function addTransaction(tx) {
    const next = [...transactions, { ...tx, id: uid() }];
    persistTransactions(next);
    setToast("Добавлено");
    setTimeout(() => setToast(null), 1400);
  }

  function deleteTransaction(id) {
    persistTransactions(transactions.filter((t) => t.id !== id));
    setToast("Удалено");
    setTimeout(() => setToast(null), 1200);
  }

  function updateTransaction(id, updatedTx) {
    persistTransactions(transactions.map((t) => (t.id === id ? { ...updatedTx, id } : t)));
    setToast("Изменено");
    setTimeout(() => setToast(null), 1200);
  }

  function submitBorrow(loanTx) {
    addTransaction(loanTx);
    setBorrowRequest(null);
  }

  function toggleLoanRepaid(id) {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    updateTransaction(id, { ...tx, repaid: !tx.repaid, repaidDate: !tx.repaid ? todayStr() : null });
  }

  function closeMonth(mk, mode, leftoverNeeds, leftoverWants) {
    if (mode === "toSavings") {
      const date = endOfMonthStr(mk);
      const extra = [];
      if (leftoverNeeds > 1) {
        extra.push({ type: "transfer", date, amount: Math.round(leftoverNeeds), fromCard: "sber", toCard: "ozon", note: `Остаток «Нужды» за ${monthLabel(mk)}`, id: uid() });
      }
      if (leftoverWants > 1) {
        extra.push({ type: "transfer", date, amount: Math.round(leftoverWants), fromCard: "alfa", toCard: "ozon", note: `Остаток «Желания» за ${monthLabel(mk)}`, id: uid() });
      }
      if (extra.length) persistTransactions([...transactions, ...extra]);
    }

    const newResetDate = endOfMonthStr(mk);
    const advancedReset =
      !settings.needsWantsResetDate || newResetDate > settings.needsWantsResetDate
        ? newResetDate
        : settings.needsWantsResetDate;

    persistSettings({
      ...settings,
      closedMonths: [...(settings.closedMonths || []), mk],
      needsWantsResetDate: advancedReset,
    });
    setToast("Месяц закрыт");
    setTimeout(() => setToast(null), 1200);
  }

  function toggleIncludeInTotal(key) {
    const next = {
      ...settings,
      includeInTotal: {
        ...settings.includeInTotal,
        [key]: !settings.includeInTotal?.[key],
      },
    };
    persistSettings(next);
  }

  function resetNeedsWantsTracking() {
    persistSettings({ ...settings, needsWantsResetDate: todayStr() });
    setToast("Отсчёт сброшен");
    setTimeout(() => setToast(null), 1200);
  }

  function openForm(initial) {
    setFormInitial(initial || { type: "expense", card: "sber", bucket: "needs" });
  }

  function closeForm() {
    setFormInitial(null);
  }

  function submitForm(tx) {
    if (Array.isArray(tx)) {
      tx.forEach(addTransaction);
      closeForm();
      return;
    }

    if (formInitial?.editId) {
      updateTransaction(formInitial.editId, tx);
      closeForm();
      return;
    }

    addTransaction(tx);
    // Если это доход — показываем модалку автоматического распределения
    if (tx.type === "income") {
      setNewIncomeTx(tx);
    }
    closeForm();
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplit(newIncomeTx.amount, settings);
    const sourceCard = newIncomeTx.card;
    const date = newIncomeTx.date;

    if (sourceCard !== "sber" && split.toSber > 0) {
      addTransaction({ type: "transfer", date, amount: Math.round(split.toSber), fromCard: sourceCard, toCard: "sber", note: "Авто-распределение" });
    }
    if (sourceCard !== "alfa" && split.toAlfa > 0) {
      addTransaction({ type: "transfer", date, amount: Math.round(split.toAlfa), fromCard: sourceCard, toCard: "alfa", note: "Авто-распределение" });
    }
    if (sourceCard !== "ozon" && split.toOzon > 0) {
      addTransaction({ type: "transfer", date, amount: Math.round(split.toOzon), fromCard: sourceCard, toCard: "ozon", note: "Авто-распределение" });
    }

    setNewIncomeTx(null);
  }

  function selectPage(i) {
    setFormInitial(null);
    setPageIndex(Math.max(0, Math.min(4, i)));
  }

  function goPage(delta) {
    if (formInitial) return;
    setPageIndex((i) => Math.max(0, Math.min(4, i + delta)));
  }

  function handleTouchStart(e) {
    if (formInitial) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || formInitial) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < 50) return; // слишком короткий свайп
    if (Math.abs(dx) < Math.abs(dy) * 1.3) return; // скорее вертикальный скролл

    goPage(dx < 0 ? 1 : -1);
  }

  if (!loaded) {
    return (
      <>
        <AppStyles />
        <div className="app-viewport">
          <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: C.inkMuted, fontSize: 14 }}>Загрузка…</div>
          </div>
        </div>
      </>
    );
  }

  const showOpTabs = pageIndex <= 2 && !formInitial;

  return (
    <>
      <AppStyles />

      <div className="app-viewport">
        <div className="app-shell">
          <header className="app-header">
            <div className="app-title-row">
              <div>
                <div className="app-title">Бюджет</div>
                <div className="app-date">{monthLabelShort(todayMonthKey())}</div>
              </div>

              <div style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                background: C.surface,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.inkMuted,
              }}>
                <Wallet size={18} />
              </div>
            </div>

            {showOpTabs && (
              <div style={{ marginTop: 8 }}>
                <OperationTabs
                  value="expense"
                  onChange={(type) => {
                    if (type === "expense") return;
                    if (type === "income") openForm({ type: "income", card: "sber" });
                    else if (type === "transfer") openForm({ type: "transfer", fromCard: "sber", toCard: "alfa" });
                    else if (type === "adjustment") {
                      const card = pageIndex === 1 ? "alfa" : pageIndex === 2 ? "ozon" : "sber";
                      openForm({ type: "adjustment", card });
                    }
                  }}
                />
              </div>
            )}
          </header>

          <main className="app-main" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {newIncomeTx && (
              <IncomeDistributionModal
                incomeTx={newIncomeTx}
                settings={settings}
                onDistribute={handleAutoDistribute}
                onClose={() => setNewIncomeTx(null)}
              />
            )}

            {borrowRequest && (
              <BorrowModal
                settings={settings}
                transactions={transactions}
                request={borrowRequest}
                onSubmit={submitBorrow}
                onClose={() => setBorrowRequest(null)}
              />
            )}

            {formInitial ? (
              <div className="screen-stack">
                <FullAddForm
                  settings={settings}
                  transactions={transactions}
                  initial={formInitial}
                  onSubmit={submitForm}
                  onCancel={closeForm}
                />
              </div>
            ) : pageIndex <= 2 ? (
              <AddPageContent
                pageIndex={pageIndex}
                settings={settings}
                transactions={transactions}
                openForm={openForm}
                onRequestBorrow={setBorrowRequest}
                canPrev={pageIndex > 0}
                canNext={pageIndex < 4}
                onPrev={() => goPage(-1)}
                onNext={() => goPage(1)}
                onSelectPage={selectPage}
              />
            ) : pageIndex === 3 ? (
              <AnalysisView
                settings={settings}
                transactions={transactions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onDelete={deleteTransaction}
                onEditTx={(tx) => openForm(deriveFormInitialFromTx(tx))}
                onToggleInclude={toggleIncludeInTotal}
                onCloseMonth={closeMonth}
                onToggleLoanRepaid={toggleLoanRepaid}
                goToAdd={() => selectPage(0)}
              />
            ) : (
              <SettingsView
                settings={settings}
                onSave={persistSettings}
                onWipeAll={() => persistTransactions([])}
                onResetTracking={resetNeedsWantsTracking}
              />
            )}
          </main>

          <TabBar
            pageIndex={pageIndex}
            onSelectAdd={() => selectPage(lastAddPage)}
            onSelectAnalysis={() => selectPage(3)}
            onSelectSettings={() => selectPage(4)}
          />
          <Toast text={toast} />
        </div>
      </div>
    </>
  );
}
