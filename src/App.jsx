import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, PiggyBank,
  ChevronLeft, ChevronRight, ChevronDown, Trash2, Check, AlertTriangle, Wallet, X, ArrowUp, ArrowDown, ArrowRight, Pencil,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
  Cigarette, Cat, Dog, Pizza, Sandwich, Disc3, PartyPopper, Trophy, Bike,
  Palmtree, Tent, Sofa, Lightbulb, Landmark, CreditCard,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { storage } from "./storage.js";

/* Оформление «дачный уголок»: иллюстрации, значки и шрифт под новый стиль.
   Файлы лежат в ./assets — если у тебя другая структура проекта, просто
   поправь пути в этих нескольких import'ах, остальной код трогать не нужно. */
import cardNeedsImg from "./assets/card-needs.webp";
import cardWantsImg from "./assets/card-wants.webp";
import cardSavingsImg from "./assets/card-savings.webp";
import bottomPlantsImg from "./assets/bottom-plants.webp";
import badgeSberImg from "./assets/badge-sber.webp";
import badgeAlfaImg from "./assets/badge-alfa.webp";
import badgeOzonImg from "./assets/badge-ozon.webp";
import handwrittenFontUrl from "./assets/font-handwritten.ttf";

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

  // «Дачный уголок» — палитра раздела «Добавить» + нижняя панель (из присланных макетов)
  gardenInk: "#00733B",
  gardenInkDeep: "#08352C",
  gardenCard: "#FCFDF6",
  gardenCardBorder: "#D0D6C1",
  gardenNav: "#FDFDF6",
  gardenNavBorder: "#A6BC98",
  gardenNavActive: "#E3EFD1",
  gardenNavActiveBorder: "#CEDFBF",
};

const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

/* ============================================================ category icons & colors */
const ICON_MAP = {
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Home, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
  Cigarette, Cat, Dog, Pizza, Sandwich, Disc3, PartyPopper, Trophy, Bike,
  Palmtree, Tent, Sofa, Lightbulb, Landmark, CreditCard, PiggyBank,
};
const ICON_KEYS = Object.keys(ICON_MAP);
function getIcon(key) { return ICON_MAP[key] || HelpCircle; }

// Приглушённая «садовая» палитра категорий — под новый стиль (вместо ярких цветов)
const CATEGORY_COLORS = ["#C97A4E", "#7C9473", "#6B93AD", "#C4A54A", "#9B7BA6", "#4F8C82", "#C48A93", "#A67C52", "#5E7C4F", "#8C8577"];

const DEFAULT_NEED_CATS = [
  { name: "Аренда/ипотека", icon: "Home", color: "#9B7BA6" },
  { name: "ЖКХ", icon: "Zap", color: "#C4A54A" },
  { name: "Продукты", icon: "ShoppingCart", color: "#C97A4E" },
  { name: "Транспорт", icon: "Bus", color: "#6B93AD" },
  { name: "Связь", icon: "Wifi", color: "#4F8C82" },
  { name: "Лекарства/здоровье", icon: "HeartPulse", color: "#C48A93" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#8C8577" },
];

const DEFAULT_WANT_CATS = [
  { name: "Кафе/рестораны", icon: "UtensilsCrossed", color: "#C97A4E" },
  { name: "Кино/развлечения", icon: "Film", color: "#9B7BA6" },
  { name: "Шоппинг", icon: "ShoppingBag", color: "#C48A93" },
  { name: "Подписки", icon: "Tv", color: "#6B93AD" },
  { name: "Подарки", icon: "Gift", color: "#5E7C4F" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#8C8577" },
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
function daysInMonth(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

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
function darkenColor(hex, amount) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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

const BUCKET_CARD = { needs: "sber", wants: "alfa", savings: "ozon" };
const CARD_BUCKET = { sber: "needs", alfa: "wants", ozon: "savings" };
const BUCKET_LABEL = { needs: "Нужды", wants: "Желания", savings: "Подушка" };
const BUCKET_LABEL_GEN = { needs: "Нужд", wants: "Желаний", savings: "Подушки" };

// Оформление экранов «Добавить» под каждый бакет: картинка-иллюстрация, фон
// «папки» и цвет заголовка — все три взяты из присланных макетов/картинок.
const BUCKET_STYLE = {
  needs: { card: "sber", art: cardNeedsImg, folderBg: "#F1F6E8", titleColor: "#1F5C34" },
  wants: { card: "alfa", art: cardWantsImg, folderBg: "#FEF2DF", titleColor: "#AE3523" },
  savings: { card: "ozon", art: cardSavingsImg, folderBg: "#E3F0F8", titleColor: "#1E5478" },
};
const DEBT_REPAY_CAP = 0.5; // максимум половины обычной доли бакета-должника уходит на погашение за раз

/* Как обычный computeIncomeSplit, но если есть непогашенные "внутренние займы" между
   бюджетами — часть доли бакета-должника перенаправляется бакету-кредитору, пока долг
   не погасится. Возвращает ещё и repayments: сколько и по какому долгу ушло на погашение. */
function computeIncomeSplitWithDebts(amount, settings, transactions) {
  const base = computeIncomeSplit(amount, settings);
  const shareOf = { needs: base.toSber, wants: base.toAlfa, savings: base.toOzon };

  const activeDebts = (transactions || []).filter(
    (t) => t.type === "debt" && !t.repaid && t.remainingAmount > 0
  );

  if (activeDebts.length === 0) {
    return { toSber: shareOf.needs, toAlfa: shareOf.wants, toOzon: shareOf.savings, repayments: [] };
  }

  const redirectedFrom = { needs: 0, wants: 0, savings: 0 };
  const repayments = [];
  const shareKey = { needs: "toSber", wants: "toAlfa", savings: "toOzon" };

  activeDebts.forEach((debt) => {
    const debtor = debt.toBucket;
    const lender = debt.fromBucket;
    if (!(debtor in shareOf) || !(lender in shareOf)) return;

    const debtorShare = base[shareKey[debtor]];
    const maxRedirect = debtorShare * DEBT_REPAY_CAP - redirectedFrom[debtor];
    if (maxRedirect <= 0) return;

    const repay = Math.min(debt.remainingAmount, maxRedirect);
    if (repay < 1) return;

    shareOf[debtor] -= repay;
    shareOf[lender] += repay;
    redirectedFrom[debtor] += repay;
    repayments.push({ debtId: debt.id, amount: repay });
  });

  return { toSber: shareOf.needs, toAlfa: shareOf.wants, toOzon: shareOf.savings, repayments };
}

/* ------------------------------------------------------------ внутренние долги, связанные с операциями
   Какой долг между бюджетами должна породить операция (или null, если никакой):
   • Трата, оплаченная картой «чужого» бюджета (например, «Нужды» с карты Альфа):
     кредитор — бюджет, которому принадлежит карта, должник — бюджет самой траты.
   • Перевод с включённой галочкой «Считать долгом»: кредитор — бюджет карты-источника,
     должник — бюджет карты-получателя. */
function debtSpecFor(tx, asDebt) {
  if (tx.type === "expense") {
    const bucket = tx.bucket || bucketOf(tx.card);
    const lender = CARD_BUCKET[tx.card];
    if (!lender || lender === bucket) return null;
    return { fromBucket: lender, toBucket: bucket };
  }

  if (tx.type === "transfer" && asDebt) {
    const lender = CARD_BUCKET[tx.fromCard];
    const debtor = CARD_BUCKET[tx.toCard];
    if (!lender || !debtor || lender === debtor) return null;
    return { fromBucket: lender, toBucket: debtor };
  }

  return null;
}

/* Приводит долг, привязанный к операции (поле sourceTxId), в соответствие с самой операцией:
   создаёт его, обновляет сумму/направление или убирает, если долг больше не нужен.
   Возвращает новый список операций. Работает и при добавлении, и при правке, и при разбивке. */
function syncLinkedDebt(list, tx, asDebt) {
  const spec = debtSpecFor(tx, asDebt);
  const existing = list.find((t) => t.type === "debt" && t.sourceTxId === tx.id);

  if (!spec) {
    return existing ? list.filter((t) => t.id !== existing.id) : list;
  }

  if (!existing) {
    return [
      ...list,
      {
        id: uid(),
        type: "debt",
        date: tx.date,
        amount: tx.amount,
        remainingAmount: tx.amount,
        fromBucket: spec.fromBucket,
        toBucket: spec.toBucket,
        repaid: false,
        note: "",
        sourceTxId: tx.id,
      },
    ];
  }

  const sameDirection = existing.fromBucket === spec.fromBucket && existing.toBucket === spec.toBucket;
  let updated;

  if (!sameDirection) {
    updated = {
      ...existing,
      date: tx.date,
      amount: tx.amount,
      remainingAmount: tx.amount,
      fromBucket: spec.fromBucket,
      toBucket: spec.toBucket,
      repaid: false,
    };
  } else {
    // Уже погашенная часть сохраняется, меняется только «хвост».
    const alreadyRepaid = Math.max(0, existing.amount - existing.remainingAmount);
    const remaining = existing.repaid ? 0 : Math.max(0, tx.amount - alreadyRepaid);
    updated = {
      ...existing,
      date: tx.date,
      amount: tx.amount,
      remainingAmount: remaining,
      repaid: existing.repaid || remaining <= 0,
    };
  }

  return list.map((t) => (t.id === existing.id ? updated : t));
}

/* Группирует открытые долги по паре бюджетов и взаимозачитывает противоположные
   направления (если «Желания» должны «Нуждам» 300, а потом появился долг
   «Нужды» должны «Желаниям» 120 — в остатке одна строка «Желания → Нужды» 180),
   чтобы не показывать много отдельных строк с одной и той же парой. */
function aggregateOpenDebts(openDebts) {
  const groups = {};
  openDebts.forEach((d) => {
    const [a, b] = [d.fromBucket, d.toBucket].sort();
    const key = `${a}|${b}`;
    if (!groups[key]) groups[key] = { a, b, net: 0, ids: [] };
    // net > 0 — «b» должен «a»; net < 0 — «a» должен «b».
    groups[key].net += d.toBucket === b ? d.remainingAmount : -d.remainingAmount;
    groups[key].ids.push(d.id);
  });

  return Object.values(groups)
    .filter((g) => Math.abs(g.net) >= 1)
    .map((g) => ({
      key: `${g.a}|${g.b}`,
      fromBucket: g.net > 0 ? g.a : g.b,
      toBucket: g.net > 0 ? g.b : g.a,
      amount: Math.abs(g.net),
      ids: g.ids,
    }));
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

  return limits;
}

/* ============================================================ Insights engine (rotating tips) */

/* Ближайший день выплаты из settings.reminderDays, начиная строго после сегодня,
   и сколько до него календарных дней (с учётом смены месяца и его длины). */
function nextPaydayInfo(settings) {
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

/* «До аванса N-го осталось K дней. Безопасный лимит на день по карте Нужд — X ₽.» */
function computePaydayCountdownInsight(settings, balances) {
  const info = nextPaydayInfo(settings);
  if (!info || info.daysLeft < 1) return null;

  const dailyLimit = Math.floor(Math.max(0, balances.sber) / info.daysLeft);

  return {
    id: "payday-countdown",
    color: C.amber,
    soft: C.amberSoft,
    text: `До аванса ${info.day}-го числа осталось ${info.daysLeft} ${ruPlural(info.daysLeft, "день", "дня", "дней")}. Ваш безопасный лимит на день по карте Нужд — ${formatMoney(dailyLimit)}.`,
  };
}

/* Разбор трат месяца по категориям: где явно вышли за обычную долю, и куда ушло
   больше всего денег в каждом бюджете. */
function computeCategoryInsights(transactions, settings) {
  const mk = todayMonthKey();
  const agg = aggregateMonth(mk, transactions, settings);
  const insights = [];

  function buildFor(bucketKey, bucketLabel, categories, totals, limitTotal) {
    const limits = computeCategoryLimits(transactions, settings, categories, bucketKey, mk, limitTotal);
    const spentList = categories
      .map((cat) => ({ name: cat.name, spent: totals[cat.name] || 0, limit: limits[cat.name] || 0 }))
      .filter((c) => c.spent > 0);

    spentList.forEach((c) => {
      if (c.limit > 0 && c.spent > c.limit * 1.15 && c.spent - c.limit >= 300) {
        insights.push({
          id: `cat-over-${bucketKey}-${c.name}`,
          color: C.danger,
          soft: C.dangerSoft,
          text: `В этом месяце на «${c.name}» ушло ${formatMoney(c.spent)} — заметно больше обычного (около ${formatMoney(c.limit)}). Возможно, стоит сократить траты в этой категории.`,
        });
      }
    });

    if (spentList.length) {
      const top = spentList.reduce((a, b) => (b.spent > a.spent ? b : a));
      const alreadyFlagged = insights.some((i) => i.id === `cat-over-${bucketKey}-${top.name}`);
      if (!alreadyFlagged) {
        const pct = limitTotal > 0 ? Math.round((top.spent / limitTotal) * 100) : null;
        insights.push({
          id: `cat-top-${bucketKey}`,
          color: C.ozon,
          soft: C.ozonSoft,
          text: `Больше всего среди «${bucketLabel}» в этом месяце ушло на «${top.name}»: ${formatMoney(top.spent)}${pct != null ? ` (${pct}% от плана «${bucketLabel}»)` : ""}.`,
        });
      }
    }
  }

  buildFor("needs", "Нужды", settings.needCats, agg.needCatTotals, agg.needsLimit);
  buildFor("wants", "Желания", settings.wantCats, agg.wantCatTotals, agg.wantsLimit);

  return insights;
}

/* Собирает все подсказки в один список для карусели: аванс, баланс карт
   относительно плана, разбор категорий, непогашенные внутренние долги. */
function computeAllInsights(transactions, settings) {
  const balances = computeBalances(transactions, settings, null);
  const smartNotes = computeSmartNotes(transactions, settings);
  const today = todayStr();
  const day = dayOfMonth(today);
  const insights = [];

  if (settings.reminderDays.includes(day)) {
    const todayIncome = transactions
      .filter((t) => t.type === "income" && t.date === today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayIncome <= 0) {
      insights.push({
        id: "payday-today",
        color: C.amber,
        soft: C.amberSoft,
        text: "Сегодня день выплаты — не забудьте занести доход на вкладке «Добавить», приложение подскажет, сколько перевести в Альфа и Озон.",
      });
    } else {
      const split = computeIncomeSplit(todayIncome, settings);
      const needPct = needPctOf(settings);
      insights.push({
        id: "payday-distribute",
        color: C.amber,
        soft: C.amberSoft,
        text: `Из сегодняшнего дохода (${formatMoney(todayIncome)}): ${formatMoney(split.toAlfa)} в Альфа, ${formatMoney(split.toOzon)} в Озон. Остальное (${needPct}%) остаётся на карте зачисления.`,
      });
    }
  } else {
    const countdown = computePaydayCountdownInsight(settings, balances);
    if (countdown) insights.push(countdown);
  }

  ["sber", "alfa", "ozon"].forEach((card) => {
    const note = smartNotes[card];
    if (note && note.type !== "ok") {
      insights.push({ id: `smart-${card}`, color: note.color, soft: note.soft, text: note.text });
    }
  });

  const openDebts = transactions.filter((t) => t.type === "debt" && !t.repaid && t.remainingAmount > 0);
  openDebts.forEach((debt) => {
    insights.push({
      id: `debt-${debt.id}`,
      color: C.amber,
      soft: C.amberSoft,
      text: `«${BUCKET_LABEL[debt.toBucket]}» должны «${BUCKET_LABEL_GEN[debt.fromBucket]}» ${formatMoney(debt.remainingAmount)}. Гасится автоматически при следующем доходе.`,
    });
  });

  insights.push(...computeCategoryInsights(transactions, settings));

  return insights;
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
      @font-face {
        font-family: 'Handgeschrieben';
        src: url(${handwrittenFontUrl}) format('truetype');
        font-display: swap;
      }

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

      .app-main {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        padding: calc(8px + env(safe-area-inset-top)) 12px calc(94px + env(safe-area-inset-bottom));
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        background: ${C.bg};
        transition: background-color 0.25s ease;
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

      .section-title-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        border: 0;
        padding: 0;
        cursor: pointer;
        text-align: left;
        color: ${C.ink};
      }

      .section-title-toggle .section-title {
        margin: 12px 0 8px;
      }

      .section-chevron {
        flex: 0 0 auto;
        color: ${C.inkMuted};
        transition: transform 0.15s ease;
      }

      .section-chevron.open {
        transform: rotate(180deg);
      }

      .cat-edit-row {
        width: 100%;
      }

      .icon-picker {
        width: 100%;
        margin: 8px 0 4px;
        padding: 12px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .icon-picker-name {
        width: 100%;
        height: 38px;
        border: 1px solid ${C.border};
        border-radius: 10px;
        padding: 0 10px;
        background: ${C.surface};
        color: ${C.ink};
        font-size: 14px;
        font-weight: 700;
      }

      .color-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 10px;
        border-radius: 999px;
        outline: none;
        cursor: pointer;
      }

      .color-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: ${C.surface};
        border: 3px solid ${C.ink};
        cursor: pointer;
      }

      .color-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: ${C.surface};
        border: 3px solid ${C.ink};
        cursor: pointer;
      }

      .icon-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 6px;
      }

      .icon-grid-btn {
        width: 100%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid ${C.border};
        border-radius: 10px;
        background: ${C.surface};
        color: ${C.inkMuted};
        cursor: pointer;
      }

      .icon-grid-btn.active {
        border-width: 2px;
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
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .bank-badge {
        width: 35px;
        height: 35px;
        flex: 0 0 auto;
        border-radius: 999px;
        overflow: hidden;
        box-shadow: 0 3px 10px rgba(22, 32, 27, 0.16);
      }

      .bank-badge img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .limit-status {
        font-size: 12px;
        margin-top: 4px;
        font-weight: 600;
      }

      /* Картинка — фон на всю ширину экрана; всё остальное лежит поверх неё
         абсолютным позиционированием в процентах от самой картинки. */
      .folder-hero {
        position: relative;
        width: calc(100% + 24px);
        margin: 0 -12px;
        line-height: 0;
      }

      .folder-hero-img {
        width: 100%;
        height: auto;
        display: block;
        user-select: none;
        -webkit-user-drag: none;
      }

      .hero-tab-num {
        position: absolute;
        top: calc(4.5% + 3px);
        transform: translate(-50%, -50%);
        background: transparent;
        border: 0;
        padding: 7px 8px;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 22px;
        font-weight: 700;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        color: ${C.inkMuted};
        opacity: 0.7;
        cursor: pointer;
        line-height: 1.1;
        white-space: nowrap;
      }

      .hero-tab-num.active {
        opacity: 1;
        color: ${C.ink};
        font-weight: 800;
        font-size: 18px;
      }

      .hero-flow {
        position: absolute;
        top: calc(13% + 3px);
        line-height: 1.2;
      }

      .hero-flow span {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: ${C.ink};
        margin-bottom: 1px;
      }

      .hero-flow b {
        display: block;
        font-size: 13px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .hero-flow-in {
        left: calc(4% + 4px);
        text-align: left;
      }

      .hero-flow-out {
        right: calc(4% + 4px);
        text-align: right;
      }

      .hero-title {
        position: absolute;
        left: 50%;
        top: calc(24% + 8px);
        transform: translate(-50%, -50%);
        margin: 0;
        width: 100%;
        text-align: center;
        font-size: 28px;
        line-height: 1;
        font-weight: 400;
        white-space: nowrap;
      }

      .hero-badge {
        position: absolute;
        left: 50%;
        top: calc(39% + 8px);
        transform: translate(-50%, -50%);
      }

      .hero-hit {
        position: absolute;
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: 0;
        padding: 0;
        margin: 0;
        cursor: pointer;
        border-radius: 999px;
      }

      .hero-hit:focus-visible {
        outline: 2px solid ${C.gardenInk};
        outline-offset: 2px;
      }

      .hero-hit-prev,
      .hero-hit-next {
        top: 84%;
        width: 17%;
        height: 22%;
        transform: translate(-50%, -50%);
      }

      .hero-hit-prev {
        left: 22%;
      }

      .hero-hit-next {
        left: 77%;
      }

      .hero-hit-add {
        left: 49.5%;
        top: 84%;
        width: 30%;
        height: 34%;
        transform: translate(-50%, -50%);
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
        gap: 10px;
      }

      .cat-tile {
        width: 100%;
        max-width: 180px;
        aspect-ratio: 180 / 84;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 5px;
        border: 0;
        border-left: 5px solid transparent;
        background: ${C.surface};
        border-radius: 18px;
        padding: 10px 12px;
        color: ${C.ink};
        text-align: left;
      }

      .cat-tile-head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .cat-tile-icon {
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cat-tile-name {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.15;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-tile-chevron {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: ${C.surface2};
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cat-tile-amounts {
        font-size: 12px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-tile-spent {
        font-size: 14px;
        font-weight: 800;
      }

      .cat-tile-limit {
        font-size: 11px;
        font-weight: 600;
        color: ${C.inkMuted};
      }

      .cat-tile-bar {
        position: relative;
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        display: flex;
      }

      .cat-tile-bar-fill {
        height: 100%;
      }

      .quick-tile {
        min-width: 0;
        min-height: 104px;
        border: 1px solid ${C.gardenCardBorder};
        background: ${C.gardenCard};
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
        background: color-mix(in srgb, ${C.gardenInk} 14%, #fff);
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
        text-align: center;
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

      .amount-row {
        display: flex;
        align-items: stretch;
        gap: 8px;
      }

      .amount-row input.amount-input {
        flex: 1;
        min-width: 0;
      }

      .amount-save {
        flex: 0 0 auto;
        height: 54px;
        padding: 0 18px;
        font-size: 15px;
        white-space: nowrap;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        text-align: left;
      }

      .total-balance-info {
        margin-left: 16px;
      }

      .total-balance .label {
        font-size: 12px;
        color: ${C.inkMuted};
        margin-bottom: 2px;
      }

      .total-balance .value {
        font-size: 24px;
        line-height: 1.12;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .check-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        flex: 0 0 auto;
        gap: 6px;
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
        position: relative;
      }

      .chart-box-nav {
        padding: 0 22px;
      }

      .chart-day-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 26px;
        height: 26px;
        border: 0;
        border-radius: 999px;
        background: ${C.surface2};
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1;
      }

      .chart-day-arrow-prev {
        left: 0;
      }

      .chart-day-arrow-next {
        right: 0;
      }

      .chart-carousel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .chart-carousel-header .section-title {
        margin: 12px 0 8px;
        flex: 1;
        text-align: center;
      }

      .chart-carousel-arrow {
        flex: 0 0 auto;
        width: 26px;
        height: 26px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .chart-carousel-dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 6px;
      }

      .chart-carousel-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: ${C.border};
      }

      .chart-carousel-dot.active {
        background: ${C.ink};
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

      .debt-row {
        gap: 10px;
      }

      .debt-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }

      .debt-label {
        font-size: 12px;
        font-weight: 700;
        color: ${C.inkMuted};
        flex: 0 0 auto;
      }

      .debt-icon {
        width: 32px;
        height: 32px;
        flex: 0 0 auto;
        border-radius: 999px;
        border: 2px dashed var(--debt-color, ${C.border});
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
      }

      .debt-icon .bank-badge {
        width: 100%;
        height: 100%;
      }

      .debt-arrow {
        flex: 0 0 auto;
        color: ${C.inkMuted};
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

      .bottom-nav-wrap {
        position: fixed;
        left: 50%;
        bottom: max(6px, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: min(calc(100vw - 8px), 430px);
        z-index: 30;
        display: flex;
        justify-content: center;
        pointer-events: none;
      }

      .bottom-nav-plants {
        position: absolute;
        left: 0;
        right: 0;
        bottom: -8px;
        width: 100%;
        height: auto;
        pointer-events: none;
        user-select: none;
        z-index: 0;
      }

      .bottom-nav {
        position: relative;
        z-index: 1;
        pointer-events: auto;
        width: min(calc(100vw - 84px), 320px);
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 8px;
        border: 1px solid ${C.gardenNavBorder};
        border-radius: 22px;
        background: ${C.gardenNav};
        box-shadow: 0 12px 28px rgba(22, 32, 27, 0.13);
      }

      .nav-btn {
        min-width: 0;
        height: 54px;
        border: 1px solid transparent;
        border-radius: 16px;
        background: transparent;
        color: ${C.gardenInk};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      .nav-btn.active {
        background: ${C.gardenNavActive};
        border-color: ${C.gardenNavActiveBorder};
        font-weight: 800;
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

      .day-total-header {
        margin: 8px -12px;
        padding: 6px 12px;
        background: ${C.surface2};
        border-radius: 10px;
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        color: ${C.ink};
      }

      .day-total-sep {
        color: ${C.inkMuted};
        font-weight: 700;
      }

      .history-list > .day-total-header:first-child {
        margin-top: 4px;
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

        .folder-hero {
          width: calc(100% + 18px);
          margin: 0 -9px;
        }

        .hero-title {
          font-size: 24px;
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
          gap: 8px;
        }

        .cat-tile {
          padding: 9px 10px;
        }

        .cat-tile-icon {
          width: 30px;
          height: 30px;
        }

        .cat-tile-name {
          font-size: 13px;
        }

        .cat-tile-amounts {
          font-size: 11px;
        }

        .operation-tabs button {
          font-size: 10px;
        }

        .field input.amount-input {
          font-size: 24px;
        }

        .amount-save {
          height: 48px;
          padding: 0 12px;
          font-size: 13px;
        }

        .bottom-nav {
          width: calc(100vw - 64px);
          gap: 6px;
          padding: 7px;
        }

        .nav-btn {
          height: 50px;
          font-size: 10px;
        }
      }

      @media (max-height: 720px) {
        .app-main {
          padding-top: calc(6px + env(safe-area-inset-top));
        }

        .add-panel {
          gap: 10px;
        }

        .hero-title {
          font-size: 26px;
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

function TotalBalanceCard({ total, settings, onToggle }) {
  const items = [
    { key: "sber", label: "Сбер", color: C.sber },
    { key: "alfa", label: "Альфа", color: C.alfa },
    { key: "ozon", label: "Озон", color: C.ozon },
  ];

  return (
    <div className="soft-card total-balance">
      <div className="total-balance-info">
        <div className="label">Общий баланс</div>
        <div className="value">{formatMoney(total)}</div>
      </div>
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
    : tx.type === "debt" ? C.amber
    : (tx.card === "sber" ? C.sber : tx.card === "alfa" ? C.alfa : (tx.amount < 0 ? C.danger : C.ozon));

  const sign = tx.type === "expense" ? "−"
    : tx.type === "transfer" ? ""
    : tx.type === "debt" ? ""
    : (tx.type === "adjustment" && tx.amount < 0) ? "−" : "+";

  const label = tx.type === "income" ? (tx.note || `Доход (${cardLabel(tx.card)})`)
    : tx.type === "expense" ? (tx.note || tx.category)
    : tx.type === "transfer" ? (tx.note || `${cardLabel(tx.fromCard)} → ${cardLabel(tx.toCard)}`)
    : tx.type === "debt" ? (tx.note || `Долг: «${BUCKET_LABEL[tx.toBucket]}» у «${BUCKET_LABEL_GEN[tx.fromBucket]}»${tx.repaid ? " · погашено" : ` · осталось ${formatMoney(tx.remainingAmount)}`}`)
    : (tx.note || `Корректировка (${cardLabel(tx.card)})`);

  const day = tx.date.slice(8, 10);
  const editable = tx.type !== "debt";

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
function IncomeDistributionModal({ incomeTx, settings, transactions, onDistribute, onClose }) {
  if (!incomeTx) return null;

  const split = computeIncomeSplitWithDebts(incomeTx.amount, settings, transactions);
  const pctOf = (v) => (incomeTx.amount > 0 ? Math.round((v / incomeTx.amount) * 100) : 0);
  const hasRepayments = split.repayments.length > 0;

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
          <p style={{ fontSize: 13, color: C.inkMuted, margin: 0 }}>
            {hasRepayments ? "Часть пойдёт на погашение долга:" : "Рекомендуем распределить:"}
          </p>
        </div>

        <div style={{ background: C.bg, borderRadius: 16, padding: 16, marginBottom: hasRepayments ? 10 : 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Нужды ({pctOf(split.toSber)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.sber }}>{formatMoney(split.toSber)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Желания ({pctOf(split.toAlfa)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.alfa }}>{formatMoney(split.toAlfa)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В Сбережения ({pctOf(split.toOzon)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ozon }}>{formatMoney(split.toOzon)}</span>
          </div>
        </div>

        {hasRepayments && (
          <div className="notice" style={{ marginBottom: 20, borderColor: C.amber, background: C.amberSoft }}>
            Пропорция временно изменена (вместо обычной): {split.repayments.map((r, i) => (
              <span key={r.debtId}>{i > 0 ? ", " : ""}{formatMoney(r.amount)} на погашение долга</span>
            ))}.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn primary" onClick={onDistribute}>Распределить автоматически</button>
          <button className="btn" style={{ background: "transparent", border: "none" }} onClick={onClose}>Сделаю сам</button>
        </div>
      </div>
    </div>
  );
}

function LimitStatus({ target, avail }) {
  // Больше не используется в интерфейсе: заменён индикатором из карусели подсказок
  // на вкладке «Анализ» (LimitStatus считал по притоку текущего месяца, новый расчёт —
  // по факту на карте с учётом всей истории, и одновременный показ обоих вводил в заблуждение).
  const diff = Math.round(target - avail);
  if (diff === 0) return null;
  return diff > 0
    ? <div className="limit-status" style={{ color: C.inkMuted }}>Можно доложить: {formatMoney(diff)}</div>
    : <div className="limit-status" style={{ color: C.danger }}>Перебор: {formatMoney(Math.abs(diff))}</div>;
}

/* Единая карусель подсказок: аванс, аналитика по категориям, баланс карт
   относительно плана. Листается только тапом: левая половина карточки —
   на одну подсказку назад, правая — вперёд. Точки внизу позволяют
   перейти к конкретной подсказке напрямую. */
function InsightsCarousel({ insights }) {
  const [index, setIndex] = useState(0);
  const idsKey = insights.map((i) => i.id).join("|");

  useEffect(() => {
    setIndex(0);
  }, [idsKey]);

  if (!insights.length) return null;

  const safeIndex = index % insights.length;
  const current = insights[safeIndex];

  function handleTap(e) {
    if (insights.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setIndex((i) =>
      isLeftHalf ? (i - 1 + insights.length) % insights.length : (i + 1) % insights.length
    );
  }

  return (
    <div
      className="soft-card"
      style={{
        padding: 12,
        borderLeft: `3px solid ${current.color}`,
        background: current.soft,
        cursor: insights.length > 1 ? "pointer" : "default",
        position: "relative",
      }}
      onClick={handleTap}
      role={insights.length > 1 ? "button" : undefined}
      tabIndex={insights.length > 1 ? 0 : undefined}
    >
      {insights.length > 1 && (
        <ChevronLeft
          size={14}
          style={{ position: "absolute", left: 4, top: 12, color: C.inkMuted, opacity: 0.45 }}
        />
      )}
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.45,
          color: C.ink,
          padding: insights.length > 1 ? "0 15px" : 0,
        }}
      >
        {current.text}
      </div>
      {insights.length > 1 && (
        <ChevronRight
          size={14}
          style={{ position: "absolute", right: 4, top: 12, color: C.inkMuted, opacity: 0.45 }}
        />
      )}
      {insights.length > 1 && (
        <div className="dots" style={{ "--accent": current.color }}>
          {insights.map((ins, i) => (
            <button
              key={ins.id}
              type="button"
              className={`dot ${i === safeIndex ? "active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              aria-label={`Подсказка ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================ Add carousel parts */
const BADGE_IMG = { sber: badgeSberImg, alfa: badgeAlfaImg, ozon: badgeOzonImg };

function BankBadge({ card }) {
  return (
    <div className="bank-badge">
      <img src={BADGE_IMG[card]} alt="" />
    </div>
  );
}

const HERO_TABS = [
  { card: "sber", left: "23%" },
  { card: "alfa", left: "49%" },
  { card: "ozon", left: "75%" },
];

/* Единый «герой» Нужды/Желания/Подушка: картинка — фон во всю ширину экрана
   (стрелки ‹ › и кружок с плюсом уже нарисованы внутри нее), а три
   баланса-вкладки, Пришло/Ушло, значок банка и заголовок лежат поверх неё
   абсолютным позиционированием — в процентах от картинки, чтобы не съезжать
   на разных экранах. Проценты подобраны под нарисованные в картинке плашки. */
function FolderHero({
  art,
  card,
  title,
  titleColor,
  inflow,
  outflow,
  balances,
  activeIndex,
  onSelectBucket,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onAdd,
  addLabel,
}) {
  return (
    <>
      <div className="folder-hero">
        <img src={art} alt="" className="folder-hero-img" draggable="false" />

        {HERO_TABS.map((t, i) => (
          <button
            key={t.card}
            type="button"
            className={`hero-tab-num ${i === activeIndex ? "active" : ""}`}
            style={{ left: t.left }}
            onClick={() => onSelectBucket(i)}
          >
            {formatMoney(balances?.[t.card] || 0)}
          </button>
        ))}

        <div className="hero-flow hero-flow-in">
          <span>Пришло:</span>
          <b style={{ color: C.sber }}>+{formatMoney(Math.abs(inflow))}</b>
        </div>
        <div className="hero-flow hero-flow-out">
          <span>Ушло:</span>
          <b style={{ color: C.danger }}>−{formatMoney(Math.abs(outflow))}</b>
        </div>

        <div className="hero-badge">
          <BankBadge card={card} />
        </div>

        <button
          type="button"
          className="hero-hit hero-hit-prev"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label="Предыдущая вкладка"
        />
        <button
          type="button"
          className="hero-hit hero-hit-add"
          onClick={onAdd}
          aria-label={addLabel || "Новая операция"}
        />
        <button
          type="button"
          className="hero-hit hero-hit-next"
          disabled={!canNext}
          onClick={onNext}
          aria-label="Следующая вкладка"
        />
      </div>
    </>
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

function CategoryTile({ icon: Icon, color, name, spent, limit, onClick }) {
  const hasLimit = limit > 0;
  const overLimit = hasLimit && spent > limit;
  const pct = hasLimit ? Math.max(0, Math.min(100, (spent / limit) * 100)) : 0;
  const withinPct = overLimit ? (limit / spent) * 100 : pct;
  const overPct = 100 - withinPct;

  return (
    <button onClick={onClick} className="cat-tile" type="button" style={{ borderLeftColor: color }}>
      <div className="cat-tile-head">
        <div className="cat-tile-icon" style={{ background: color + "26" }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="cat-tile-name">{name}</div>
        <span className="cat-tile-chevron" style={{ background: color + "22", color }}>
          <ChevronRight size={13} />
        </span>
      </div>

      <div className="cat-tile-amounts">
        <span className="cat-tile-spent" style={{ color }}>{formatMoney(spent)}</span>
        {hasLimit && <span className="cat-tile-limit"> из {formatMoney(limit)}</span>}
      </div>

      {hasLimit && (
        <div className="cat-tile-bar" style={{ background: color + "22" }}>
          <div className="cat-tile-bar-fill" style={{ width: withinPct + "%", background: color }} />
          {overLimit && (
            <div
              className="cat-tile-bar-fill"
              style={{ width: overPct + "%", background: darkenColor(color, 0.4) }}
            />
          )}
        </div>
      )}
    </button>
  );
}

function CategoryDonut({ categories, totals, bucketLabel, transactions, bucket, onDeleteTx, onEditTx }) {
  const [expandedCat, setExpandedCat] = useState(null);

  const data = useMemo(
    () =>
      categories
        .map((c) => ({ name: c.name, value: totals[c.name] || 0, color: c.color }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [categories, totals]
  );

  // Реальные операции месяца по каждой категории — раскрываются по тапу на строку легенды.
  const itemsByCat = useMemo(() => {
    const map = {};
    const mk = todayMonthKey();
    (transactions || []).forEach((t) => {
      if (t.type !== "expense") return;
      if (monthKeyOf(t.date) !== mk) return;
      const tBucket = t.bucket || bucketOf(t.card);
      if (tBucket !== bucket) return;
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.id < b.id ? 1 : -1)))
    );
    return map;
  }, [transactions, bucket]);

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
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {data.map((d) => {
          const items = itemsByCat[d.name] || [];
          const isOpen = expandedCat === d.name;

          return (
            <div key={d.name}>
              <button
                type="button"
                onClick={() => items.length && setExpandedCat(isOpen ? null : d.name)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 12,
                  padding: "5px 0",
                  border: "none",
                  background: "transparent",
                  color: C.ink,
                  textAlign: "left",
                  cursor: items.length ? "pointer" : "default",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color, flex: "0 0 auto" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, flex: "0 0 auto" }}>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {formatMoney(d.value)} · {Math.round((d.value / total) * 100)}%
                  </span>
                  {items.length > 0 && (
                    <ChevronDown
                      size={14}
                      style={{
                        color: C.inkMuted,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        flex: "0 0 auto",
                      }}
                    />
                  )}
                </span>
              </button>

              {isOpen && items.length > 0 && (
                <div className="history-list" style={{ marginBottom: 6 }}>
                  {items.map((t) => (
                    <TxRow
                      key={t.id}
                      tx={t}
                      onDelete={onDeleteTx || (() => {})}
                      onEdit={onEditTx || (() => {})}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Столбчатый график по дням месяца: Нужды и Желания в стопке друг на друге.
   Показывает окно из нескольких дней подряд, стрелки по краям листают окно
   вперёд/назад (если в месяце дней больше, чем помещается). */
function DailyExpenseChart({ monthItems, monthKey }) {
  const total = daysInMonth(monthKey);
  const WINDOW = 15;
  const defaultStart = Math.max(1, total - WINDOW + 1);
  const [start, setStart] = useState(defaultStart);

  useEffect(() => {
    setStart(Math.max(1, daysInMonth(monthKey) - WINDOW + 1));
  }, [monthKey]);

  const byDay = {};
  monthItems.forEach((t) => {
    if (t.type !== "expense") return;
    const day = dayOfMonth(t.date);
    if (!byDay[day]) byDay[day] = { needs: 0, wants: 0 };
    if (t.bucket === "wants") byDay[day].wants += t.amount;
    else byDay[day].needs += t.amount;
  });

  const end = Math.min(total, start + WINDOW - 1);
  const data = [];
  for (let d = start; d <= end; d++) {
    data.push({ day: String(d), Нужды: byDay[d]?.needs || 0, Желания: byDay[d]?.wants || 0 });
  }

  const canPrev = start > 1;
  const canNext = end < total;

  return (
    <div className="chart-box chart-box-nav">
      {canPrev && (
        <button
          type="button"
          className="chart-day-arrow chart-day-arrow-prev"
          onClick={() => setStart((s) => Math.max(1, s - WINDOW))}
          aria-label="Более ранние дни"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 4, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.inkMuted }} />
          <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} width={42} />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Нужды" stackId="d" fill={C.sber} />
          <Bar dataKey="Желания" stackId="d" fill={C.alfa} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {canNext && (
        <button
          type="button"
          className="chart-day-arrow chart-day-arrow-next"
          onClick={() => setStart((s) => Math.min(Math.max(1, total - WINDOW + 1), s + WINDOW))}
          aria-label="Более поздние дни"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

/* Карусель графиков в «Анализе»: заголовок со стрелками листает слайды по тапу,
   сам график при этом остаётся кликабельным (тултипы/бары не конфликтуют
   с переключением, т.к. стрелки — отдельные кнопки в шапке). */
function ChartsCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const n = slides.length;
  if (!n) return null;
  const safeIndex = index % n;
  const current = slides[safeIndex];

  return (
    <div className="panel">
      <div className="chart-carousel-header">
        {n > 1 && (
          <button
            type="button"
            className="chart-carousel-arrow"
            onClick={() => setIndex((i) => (i - 1 + n) % n)}
            aria-label="Предыдущий график"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <SectionTitle>{current.title}</SectionTitle>
        {n > 1 && (
          <button
            type="button"
            className="chart-carousel-arrow"
            onClick={() => setIndex((i) => (i + 1) % n)}
            aria-label="Следующий график"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {current.render()}

      {n > 1 && (
        <div className="chart-carousel-dots">
          {slides.map((_, i) => (
            <span key={i} className={`chart-carousel-dot${i === safeIndex ? " active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPanel({
  title,
  card,
  categories,
  transactions,
  settings,
  balances,
  activeIndex,
  onSelectBucket,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
  onDeleteTx,
  onEditTx,
}) {
  const bucket = bucketOf(card);
  const style = BUCKET_STYLE[bucket];

  const stats = useMemo(() => categoryStats(transactions, bucket), [transactions, bucket]);
  const ordered = useMemo(
    () => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)),
    [categories, stats]
  );

  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const outflow = card === "sber" ? agg.sberOutflow : agg.alfaOutflow;
  const monthlyTotals = card === "sber" ? agg.needCatTotals : agg.wantCatTotals;
  const bucketLimitThisMonth = card === "sber" ? agg.needsLimit : agg.wantsLimit;
  const catLimits = useMemo(
    () => computeCategoryLimits(transactions, settings, categories, bucket, todayMonthKey(), bucketLimitThisMonth),
    [transactions, settings, categories, bucket, bucketLimitThisMonth]
  );

  return (
    <div className="add-panel">
      <FolderHero
        art={style.art}
        card={card}
        title={title}
        titleColor={style.titleColor}
        inflow={inflow}
        outflow={outflow}
        balances={balances}
        activeIndex={activeIndex}
        onSelectBucket={onSelectBucket}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onAdd={() => onOpenFull({ type: "expense", card, bucket })}
        addLabel="Новое"
      />

      <div className="cat-list">
        {ordered.map((cat) => {
          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);

          return (
            <CategoryTile
              key={cat.name}
              icon={Icon}
              color={cat.color}
              name={cat.name}
              spent={monthlyTotals[cat.name] || 0}
              limit={catLimits[cat.name] || 0}
              onClick={() => {
                onOpenFull({
                  type: "expense",
                  card,
                  bucket,
                  category: cat.name,
                  amount: s?.modalAmount ?? "",
                });
              }}
            />
          );
        })}
      </div>

      <CategoryDonut
        categories={categories}
        totals={monthlyTotals}
        bucketLabel={title}
        transactions={transactions}
        bucket={bucket}
        onDeleteTx={onDeleteTx}
        onEditTx={onEditTx}
      />
    </div>
  );
}

function OzonPanel({
  settings,
  transactions,
  balances,
  activeIndex,
  onSelectBucket,
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
    <div className="add-panel">
      {/* Пополнение подушки — обычный перевод, а не заём, поэтому галочка «Считать долгом» здесь выключена */}
      <FolderHero
        art={BUCKET_STYLE.savings.art}
        card="ozon"
        title="Подушка"
        titleColor={BUCKET_STYLE.savings.titleColor}
        inflow={agg.ozonInflow}
        outflow={agg.ozonOutflow}
        balances={balances}
        activeIndex={activeIndex}
        onSelectBucket={onSelectBucket}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onAdd={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon", debt: false })}
        addLabel="Новый перевод"
      />

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
                  debt: false,
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

function AmountField({ label, value, onChange, big, withSave }) {
  const evaluated = evalMoneyExpr(value);
  const stripped = String(value ?? "").trim().replace(/^-/, "");
  const hasOp = /[+\-*/]/.test(stripped);
  const showPreview = String(value ?? "") !== "" && hasOp && Number.isFinite(evaluated);

  const input = (
    <input
      className={big ? "amount-input mono" : "mono"}
      inputMode="decimal"
      type="text"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <div className="field">
      <label>{label}</label>
      {withSave ? (
        <div className="amount-row">
          {input}
          <button type="submit" className="btn primary amount-save">Сохранить</button>
        </div>
      ) : (
        input
      )}
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
  // Галочка «Считать долгом» у перевода: по умолчанию включена (initial.debt === false её выключает).
  const [asDebt, setAsDebt] = useState(initial?.debt ?? true);
  // Галочка «Отображать в операциях» у корректировки: по умолчанию выключена.
  const [showInHistory, setShowInHistory] = useState(initial?.type === "adjustment" ? !initial?.hidden : false);

  const [split, setSplit] = useState(false);
  const [splitAmount2, setSplitAmount2] = useState("");
  const [bucket2, setBucket2] = useState(initialBucket);
  const [splitCategory2, setSplitCategory2] = useState("");

  useEffect(() => {
    const b = initial?.bucket || bucketOf(initial?.card || "sber");
    setType(initial?.type || "expense");
    setDate(initial?.date || todayStr());
    setAmount(initial?.amount ?? "");
    setCard(initial?.card || homeCardOf(b));
    setBucket(b);
    setBucket2(b);
    setFromCard(initial?.fromCard || "sber");
    setToCard(initial?.toCard || "alfa");
    setCategory(initial?.category || defaultCategoryFor(b));
    setNote(initial?.note || "");
    setAsDebt(initial?.debt ?? true);
    setShowInHistory(initial?.type === "adjustment" ? !initial?.hidden : false);
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
    const list = catListOf(settings, bucket2);
    if (!list.some((c) => c.name === splitCategory2)) {
      setSplitCategory2(list[0]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket2, split, settings.needCats, settings.wantCats]);

  const amountNum = moneyNum(amount);
  const splitAmountNum = moneyNum(splitAmount2);
  const categories = catListOf(settings, bucket);
  const categories2 = catListOf(settings, bucket2);

  const isEdit = !!initial?.editId;

  // Свайп влево/вправо по форме листает вкладки Трата → Доход → Перевод → Коррекция и обратно.
  const OPERATION_TAB_ORDER = ["expense", "income", "transfer", "adjustment"];
  const formTouchRef = useRef(null);

  function handleFormTouchStart(e) {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    const t = e.touches[0];
    formTouchRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleFormTouchEnd(e) {
    const start = formTouchRef.current;
    formTouchRef.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.3) return;

    const idx = OPERATION_TAB_ORDER.indexOf(type);
    const next = (idx + (dx < 0 ? 1 : -1) + OPERATION_TAB_ORDER.length) % OPERATION_TAB_ORDER.length;
    setType(OPERATION_TAB_ORDER[next]);
  }

  // Части траты, оплаченные картой «чужого» бюджета, — каждая такая часть станет внутренним долгом.
  const expenseParts = type === "expense"
    ? [{ bucket, amount: amountNum }, ...(split ? [{ bucket: bucket2, amount: splitAmountNum }] : [])]
    : [];
  const anomalyParts = expenseParts.filter((p) => CARD_BUCKET[card] !== p.bucket);

  const transferDebtActive = type === "transfer" && asDebt && fromCard !== toCard;

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

    if (type === "expense" && split) {
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
          bucket: bucket2,
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
      onSubmit(
        {
          type: "transfer",
          date,
          amount: amountNum,
          fromCard,
          toCard,
          note: note.trim(),
        },
        { asDebt }
      );
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
        hidden: !showInHistory,
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
        hidden: !showInHistory,
      });
    }
  }

  return (
    <form className="form-card" onSubmit={submit} onTouchStart={handleFormTouchStart} onTouchEnd={handleFormTouchEnd}>
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
            : type === "expense" && split
            ? "Сумма (часть 1)"
            : "Сумма"
        }
        value={amount}
        onChange={setAmount}
        big
        withSave
      />

      <div className="field">
        <label>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {type === "expense" && (
        <>
          <div className="field">
            <label>{split ? "Категория бюджета (часть 1)" : "Категория бюджета"}</label>
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

          {anomalyParts.length > 0 && (
            <div
              className="notice"
              style={{ borderColor: C.amber, background: C.amberSoft, marginBottom: 11 }}
            >
              ⚠️ Вы платите картой {cardLabel(card)} («{BUCKET_LABEL[CARD_BUCKET[card]]}») за другой бюджет — это запишется как долг:
              {anomalyParts.map((p, i) => (
                <div key={i} style={{ fontWeight: 700, marginTop: 3 }}>
                  «{BUCKET_LABEL[p.bucket]}» должны «{BUCKET_LABEL_GEN[CARD_BUCKET[card]]}»{p.amount > 0 ? ` ${formatMoney(p.amount)}` : ""}
                </div>
              ))}
              <div style={{ marginTop: 3 }}>Долг погасится автоматически из следующего дохода.</div>
            </div>
          )}

          <div className="field" style={{ marginBottom: split ? 11 : 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={split}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSplit(checked);
                  if (checked) setBucket2(bucket);
                }}
                style={{ width: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Разделить</span>
            </label>
          </div>

          {split && (
            <>
              <AmountField
                label="Сумма (часть 2)"
                value={splitAmount2}
                onChange={setSplitAmount2}
              />
              <div className="field">
                <label>Категория бюджета (часть 2)</label>
                <CardPicker options={BUCKET_OPTIONS} value={bucket2} onChange={setBucket2} />
              </div>
              <div className="field">
                <label>Категория (часть 2)</label>
                <select value={splitCategory2} onChange={(e) => setSplitCategory2(e.target.value)}>
                  {categories2.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              {isEdit && (
                <div className="small-note" style={{ marginBottom: 7 }}>
                  Часть 1 заменит эту операцию, часть 2 добавится отдельной новой записью.
                </div>
              )}
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

      {type === "transfer" && (
        <>
          <div className="field" style={{ marginBottom: transferDebtActive ? 6 : 11 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={asDebt}
                onChange={(e) => setAsDebt(e.target.checked)}
                style={{ width: "auto", height: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Считать долгом</span>
            </label>
          </div>

          {transferDebtActive && (
            <div className="small-note" style={{ marginBottom: 11 }}>
              «{BUCKET_LABEL[CARD_BUCKET[toCard]]}» должны «{BUCKET_LABEL_GEN[CARD_BUCKET[fromCard]]}»
              {amountNum > 0 ? ` ${formatMoney(amountNum)}` : ""}. Долг погасится автоматически из следующего дохода.
            </div>
          )}
        </>
      )}

      {type === "adjustment" && (
        <>
          <div className="field">
            <label>Карта</label>
            <CardPicker options={ALL_CARDS} value={card} onChange={setCard} />
          </div>

          <div className="field" style={{ marginBottom: 11 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showInHistory}
                onChange={(e) => setShowInHistory(e.target.checked)}
                style={{ width: "auto", height: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Отображать в операциях</span>
            </label>
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
    </form>
  );
}

/* ============================================================ Add view */
function AddPageContent({
  pageIndex,
  settings,
  transactions,
  openForm,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectPage,
  onDeleteTx,
  onEditTx,
}) {
  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);

  const pages = [
    {
      render: () => (
        <CategoryPanel
          title="Нужды"
          card="sber"
          categories={settings.needCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          onDeleteTx={onDeleteTx}
          onEditTx={onEditTx}
        />
      ),
    },
    {
      render: () => (
        <CategoryPanel
          title="Желания"
          card="alfa"
          categories={settings.wantCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          onDeleteTx={onDeleteTx}
          onEditTx={onEditTx}
        />
      ),
    },
    {
      render: () => (
        <OzonPanel
          settings={settings}
          transactions={transactions}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
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
    </div>
  );
}

/* Builds a FullAddForm "initial" seed from an existing transaction, for editing.
   Для перевода галочка «Считать долгом» включена, только если к нему уже привязан долг. */
function deriveFormInitialFromTx(tx, transactions) {
  const base = { type: tx.type, date: tx.date, amount: tx.amount, note: tx.note || "", editId: tx.id };
  if (tx.type === "expense") {
    return { ...base, card: tx.card, bucket: tx.bucket || bucketOf(tx.card), category: tx.category };
  }
  if (tx.type === "income") {
    return { ...base, card: tx.card };
  }
  if (tx.type === "transfer") {
    const linked = (transactions || []).some((t) => t.type === "debt" && t.sourceTxId === tx.id);
    return { ...base, fromCard: tx.fromCard, toCard: tx.toCard, debt: linked };
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
  { id: "debt", label: "Долги" },
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
  onWriteOffDebtGroup,
  goToAdd,
}) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const balances = useMemo(
    () => computeBalances(transactions, settings, endOfMonthStr(selectedMonth)),
    [transactions, settings, selectedMonth]
  );
  const insights = useMemo(() => computeAllInsights(transactions, settings), [transactions, settings]);
  const openDebts = useMemo(
    () => transactions.filter((t) => t.type === "debt" && !t.repaid).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );
  const debtGroups = useMemo(() => aggregateOpenDebts(openDebts), [openDebts]);
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

  function toggleFilter(list, setList, id) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const filteredItems = monthItems.filter((t) => {
    return typeFilters.length === 0 || typeFilters.includes(t.type);
  });

  const filteredTotal = filteredItems.reduce((sum, t) => sum + txNetImpact(t), 0);

  const groupedItems = useMemo(() => {
    const groups = [];
    let currentDate = null;
    filteredItems.forEach((tx) => {
      if (tx.date !== currentDate) {
        currentDate = tx.date;
        groups.push({ date: tx.date, items: [] });
      }
      groups[groups.length - 1].items.push(tx);
    });
    return groups.map((g) => {
      let income = 0;
      let expense = 0;
      g.items.forEach((t) => {
        const impact = txNetImpact(t);
        if (impact >= 0) income += impact;
        else expense += impact;
      });
      return { ...g, income, expense };
    });
  }, [filteredItems]);

  return (
    <div className="screen-stack">
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <InsightsCarousel insights={insights} />

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

      {debtGroups.length > 0 && (
        <div className="panel">
          <SectionTitle>Фонд</SectionTitle>
          <div className="history-list">
            {debtGroups.map((g) => (
              <div key={g.key} className="tx-row debt-row">
                <div className="debt-main">
                  <span className="debt-label">Долг</span>
                  <span className="debt-icon" style={{ "--debt-color": C[BUCKET_CARD[g.toBucket]] }}>
                    <BankBadge card={BUCKET_CARD[g.toBucket]} />
                  </span>
                  <ArrowRight size={16} className="debt-arrow" />
                  <span className="debt-icon" style={{ "--debt-color": C[BUCKET_CARD[g.fromBucket]] }}>
                    <BankBadge card={BUCKET_CARD[g.fromBucket]} />
                  </span>
                </div>
                <div className="tx-amount" style={{ color: C.amber }}>{formatMoney(g.amount)}</div>
                <button
                  type="button"
                  className="btn"
                  style={{ height: 30, padding: "0 10px", fontSize: 11, flex: "0 0 auto" }}
                  onClick={() => onWriteOffDebtGroup(g)}
                >
                  Списать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <ChartsCarousel
        slides={[
          {
            title: "Структура месяца",
            render: () => (
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
            ),
          },
          {
            title: "Динамика расходов",
            render: () => <DailyExpenseChart monthItems={monthItems} monthKey={selectedMonth} />,
          },
        ]}
      />

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
            {groupedItems.map((g) => (
              <React.Fragment key={g.date}>
                <div className="day-total-header">
                  {g.income > 0 && (
                    <span style={{ color: C.sber }}>+{formatMoney(g.income)}</span>
                  )}
                  {g.income > 0 && g.expense < 0 && <span className="day-total-sep"> / </span>}
                  {g.expense < 0 && (
                    <span style={{ color: C.danger }}>−{formatMoney(Math.abs(g.expense))}</span>
                  )}
                  {g.income === 0 && g.expense === 0 && (
                    <span style={{ color: C.inkMuted }}>0 ₽</span>
                  )}
                </div>
                {g.items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} onDelete={onDelete} onEdit={onEditTx} />
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ Settings */
function CategoryPickerPanel({ cat, onChange }) {
  const colorIndex = Math.max(0, CATEGORY_COLORS.indexOf(cat.color));

  return (
    <div className="icon-picker">
      <input
        className="icon-picker-name"
        value={cat.name}
        onChange={(e) => onChange({ ...cat, name: e.target.value })}
        placeholder="Название категории"
      />

      <input
        type="range"
        className="color-slider"
        min={0}
        max={CATEGORY_COLORS.length - 1}
        step={1}
        value={colorIndex}
        onChange={(e) => onChange({ ...cat, color: CATEGORY_COLORS[Number(e.target.value)] })}
        style={{ background: `linear-gradient(to right, ${CATEGORY_COLORS.join(", ")})` }}
      />

      <div className="icon-grid">
        {ICON_KEYS.map((key) => {
          const IconOpt = ICON_MAP[key];
          const active = cat.icon === key;
          return (
            <button
              key={key}
              type="button"
              className={`icon-grid-btn${active ? " active" : ""}`}
              style={active ? { background: cat.color + "22", borderColor: cat.color, color: cat.color } : undefined}
              onClick={() => onChange({ ...cat, icon: key })}
              aria-label={key}
            >
              <IconOpt size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRow({ cat, open, onToggleOpen, onChange, onDelete }) {
  const Icon = getIcon(cat.icon);

  return (
    <div className="cat-edit-row">
      <div className="tx-row">
        <button
          type="button"
          className="quick-icon"
          style={{ width: 38, height: 38, background: cat.color + "22", border: 0, padding: 0, cursor: "pointer" }}
          onClick={onToggleOpen}
          aria-label="Изменить иконку и цвет"
        >
          <Icon size={18} style={{ color: cat.color }} />
        </button>

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

      {open && <CategoryPickerPanel cat={cat} onChange={onChange} />}
    </div>
  );
}

function SettingsView({ settings, onSave, onWipeAll, onResetTracking }) {
  const [draft, setDraft] = useState(settings);
  const [daysText, setDaysText] = useState((settings.reminderDays || []).join(", "));
  const [saved, setSaved] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [wantsOpen, setWantsOpen] = useState(false);
  const [openCatKey, setOpenCatKey] = useState(null);

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
        <button
          type="button"
          className="section-title-toggle"
          onClick={() => setNeedsOpen((v) => !v)}
        >
          <SectionTitle>Категории нужд</SectionTitle>
          <ChevronDown size={16} className={`section-chevron${needsOpen ? " open" : ""}`} />
        </button>

        {needsOpen && (
          <>
            <div className="history-list">
              {draft.needCats.map((cat, i) => (
                <CategoryRow
                  key={`${cat.name}-${i}`}
                  cat={cat}
                  open={openCatKey === `needs-${i}`}
                  onToggleOpen={() => setOpenCatKey((k) => (k === `needs-${i}` ? null : `needs-${i}`))}
                  onChange={(next) => updateNeedCat(i, next)}
                  onDelete={() => setDraft((d) => ({ ...d, needCats: d.needCats.filter((_, k) => k !== i) }))}
                />
              ))}
            </div>

            <button
              className="btn"
              type="button"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => {
                const idx = draft.needCats.length;
                setDraft((d) => ({
                  ...d,
                  needCats: [
                    ...d.needCats,
                    { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.needCats.length % CATEGORY_COLORS.length] },
                  ],
                }));
                setOpenCatKey(`needs-${idx}`);
              }}
            >
              Добавить категорию
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <button
          type="button"
          className="section-title-toggle"
          onClick={() => setWantsOpen((v) => !v)}
        >
          <SectionTitle>Категории Желаний</SectionTitle>
          <ChevronDown size={16} className={`section-chevron${wantsOpen ? " open" : ""}`} />
        </button>

        {wantsOpen && (
          <>
            <div className="history-list">
              {draft.wantCats.map((cat, i) => (
                <CategoryRow
                  key={`${cat.name}-${i}`}
                  cat={cat}
                  open={openCatKey === `wants-${i}`}
                  onToggleOpen={() => setOpenCatKey((k) => (k === `wants-${i}` ? null : `wants-${i}`))}
                  onChange={(next) => updateWantCat(i, next)}
                  onDelete={() => setDraft((d) => ({ ...d, wantCats: d.wantCats.filter((_, k) => k !== i) }))}
                />
              ))}
            </div>

            <button
              className="btn"
              type="button"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => {
                const idx = draft.wantCats.length;
                setDraft((d) => ({
                  ...d,
                  wantCats: [
                    ...d.wantCats,
                    { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.wantCats.length % CATEGORY_COLORS.length] },
                  ],
                }));
                setOpenCatKey(`wants-${idx}`);
              }}
            >
              Добавить категорию
            </button>
          </>
        )}
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
/* Иконки нижней панели — из присланных SVG, перекрашиваются через currentColor */
function NavIconAnalysis({ size = 22 }) {
  return (
    <svg viewBox="0 0 0.078 0.075" style={{ width: size, height: size }}>
      <path
        fill="currentColor"
        d="M0.057 0l0.017 0c0.001,0 0.002,0 0.003,0.001 0,0.001 0.001,0.001 0.001,0.002l0 0.069c0,0.001 -0.001,0.002 -0.001,0.002 -0.001,0.001 -0.002,0.001 -0.003,0.001l-0.017 0c-0.001,0 -0.002,0 -0.002,-0.001 -0.001,0 -0.001,-0.001 -0.001,-0.002l0 -0.069c0,-0.001 0,-0.001 0.001,-0.002 0,-0.001 0.001,-0.001 0.002,-0.001zm-0.054 0.035l0.018 0c0.001,0 0.001,0.001 0.002,0.001 0.001,0.001 0.001,0.002 0.001,0.003l0 0.033c0,0.001 0,0.002 -0.001,0.002 -0.001,0.001 -0.001,0.001 -0.002,0.001l-0.018 0c-0.001,0 -0.001,0 -0.002,-0.001 -0.001,0 -0.001,-0.001 -0.001,-0.002l0 -0.033c0,-0.001 0,-0.002 0.001,-0.003 0.001,0 0.001,-0.001 0.002,-0.001zm0.015 0.006l-0.012 0 0 0.029 0.012 0 0 -0.029zm0.013 -0.023l0.017 0c0.001,0 0.002,0.001 0.002,0.001 0.001,0.001 0.001,0.002 0.001,0.003l0 0.05c0,0.001 0,0.002 -0.001,0.002 0,0.001 -0.001,0.001 -0.002,0.001l-0.017 0c-0.001,0 -0.002,0 -0.003,-0.001 0,0 -0.001,-0.001 -0.001,-0.002l0 -0.05c0,-0.001 0.001,-0.002 0.001,-0.003 0.001,0 0.002,-0.001 0.003,-0.001zm0.015 0.006l-0.013 0 0 0.046 0.013 0 0 -0.046zm0.026 -0.018l-0.013 0 0 0.064 0.013 0 0 -0.064z"
      />
    </svg>
  );
}

function NavIconSettings({ size = 22 }) {
  return (
    <svg viewBox="0 0 0.075 0.075" style={{ width: size, height: size }}>
      <path
        fill="currentColor"
        d="M0.025 0.036c0,0.003 0,0.005 0,0.006 0.001,0.002 0.002,0.003 0.003,0.005 0.001,0 0.002,0.001 0.002,0.001 0.001,0 0.001,0.001 0.002,0.001 0.002,0.001 0.005,0.002 0.007,0.001 0.003,0 0.005,-0.001 0.006,-0.002l0 0c0.002,-0.002 0.003,-0.002 0.004,-0.004 0,0 0,-0.001 0.001,-0.001l0 -0.001c0.001,-0.002 0.001,-0.004 0,-0.007 0,-0.002 -0.001,-0.005 -0.003,-0.007 -0.001,0 -0.001,-0.001 -0.002,-0.001 -0.002,-0.002 -0.006,-0.003 -0.009,-0.003 -0.003,0.001 -0.005,0.002 -0.008,0.004 0,0.001 0,0.001 -0.001,0.002 0,0 -0.001,0.002 -0.002,0.003 0,0.001 0,0.002 0,0.003zm-0.005 0.008c0,-0.002 -0.001,-0.005 -0.001,-0.008 0,-0.001 0.001,-0.003 0.001,-0.005 0.001,-0.002 0.002,-0.003 0.003,-0.005 0.001,0 0.001,-0.001 0.002,-0.002 0.003,-0.003 0.007,-0.004 0.011,-0.005 0.004,0 0.009,0.001 0.012,0.004 0.001,0 0.002,0.001 0.002,0.002 0.003,0.002 0.005,0.006 0.006,0.009 0,0.004 0,0.008 -0.002,0.011l0 0c0,0.001 0,0.001 -0.001,0.002 -0.001,0.002 -0.002,0.003 -0.004,0.005l0 0c-0.003,0.002 -0.006,0.003 -0.009,0.004 -0.004,0 -0.007,-0.001 -0.01,-0.002 -0.001,-0.001 -0.002,-0.001 -0.003,-0.002 -0.001,0 -0.001,-0.001 -0.002,-0.002 -0.002,-0.002 -0.004,-0.004 -0.005,-0.006zm0.004 -0.031c-0.002,0 -0.003,-0.001 -0.004,-0.001 -0.001,-0.001 -0.002,-0.001 -0.003,0 0,0.001 -0.001,0.002 -0.002,0.002 -0.002,0.002 -0.003,0.004 -0.003,0.005l0 0.001c0.001,0.002 0.002,0.005 -0.001,0.009 0,0.001 -0.001,0.001 -0.002,0.001 0,0.001 -0.001,0.001 -0.001,0.001 -0.003,0.001 -0.003,0.002 -0.003,0.006 0,0.002 0,0.003 0,0.004 0,0.001 0,0.001 0.001,0.001 0,0 0,0.001 0,0.001 0,0 0.001,0 0.001,0l0.001 0c0.007,0.003 0.005,0.009 0.004,0.012 0,0.001 0,0.001 0,0.001 0,0.001 0.001,0.002 0.002,0.003 0,0 0.001,0.001 0.001,0.001l0.001 0.001c0.001,0.001 0.002,0.002 0.003,0.002 0,0 0.001,0 0.001,0 0.003,-0.001 0.005,-0.002 0.009,0.001 0.002,0.001 0.002,0.002 0.003,0.004 0,0.001 0.001,0.002 0.001,0.002l0.008 0c0.001,0 0.001,0 0.001,0 0,-0.001 0.001,-0.001 0.001,-0.001 0,0 0,-0.001 0.001,-0.001 0.001,-0.003 0.002,-0.006 0.007,-0.006 0.002,0 0.003,0.001 0.004,0.001 0,0 0.001,0 0.002,0 0,0 0.002,-0.001 0.002,-0.002l0.001 -0.001c0.001,0 0.001,-0.001 0.002,-0.001 0.001,-0.001 0.002,-0.002 0.002,-0.003 0,-0.001 0,0 -0.001,-0.001 -0.001,-0.003 -0.003,-0.008 0.004,-0.011 0.003,-0.002 0.003,-0.002 0.003,-0.006 0,-0.002 0,-0.003 0,-0.005 0,0 -0.001,-0.001 -0.002,-0.001 -0.001,-0.001 -0.002,-0.001 -0.004,-0.003 -0.003,-0.003 -0.002,-0.006 -0.001,-0.008 0,-0.001 0.001,-0.002 0.001,-0.003 0,0 -0.001,0 -0.001,-0.001 -0.002,-0.001 -0.003,-0.003 -0.005,-0.005 -0.001,-0.001 -0.002,-0.001 -0.003,0 -0.001,0 -0.002,0.001 -0.004,0.001 -0.005,0 -0.006,-0.003 -0.008,-0.006 0,-0.001 0,-0.002 -0.001,-0.002l-0.009 0c0,0 0,0 -0.001,0.001 0,0 0,0.001 0,0.002 -0.001,0.001 -0.002,0.002 -0.003,0.003 -0.002,0.001 -0.003,0.002 -0.005,0.002zm-0.002 -0.006c0.001,0 0.001,0 0.002,0 0.001,0 0.001,0 0.002,0 0,0 0,-0.001 0.001,-0.001 0,-0.001 0.001,-0.003 0.001,-0.004 0.002,-0.001 0.003,-0.002 0.005,-0.002l0.009 0c0.004,0 0.005,0.002 0.006,0.005 0.001,0.001 0.001,0.002 0.003,0.002 0.001,0 0.002,0 0.002,0 0.003,-0.001 0.005,-0.002 0.009,0.002l0.005 0.005c0.001,0.001 0.002,0.002 0.002,0.004 0,0.002 -0.001,0.003 -0.001,0.004 0,0.001 -0.001,0.003 0,0.003 0.001,0.001 0.002,0.002 0.003,0.002 0.002,0.001 0.004,0.002 0.004,0.006 0,0.002 0,0.003 0,0.004 0,0.008 0,0.009 -0.005,0.011 -0.003,0.002 -0.002,0.004 -0.002,0.005 0.001,0.001 0.001,0.002 0.001,0.003 0,0.003 -0.001,0.004 -0.004,0.007 0,0 -0.001,0 -0.001,0.001l-0.001 0.001c-0.001,0.001 -0.004,0.004 -0.006,0.004 -0.002,0 -0.004,-0.001 -0.005,-0.001 0,0 0,-0.001 -0.001,-0.001 -0.002,0 -0.002,0.002 -0.003,0.003 0,0.001 -0.001,0.002 -0.002,0.003 -0.001,0.001 -0.001,0.001 -0.002,0.001 -0.001,0.001 -0.002,0.001 -0.003,0.001l-0.008 0c-0.004,0 -0.005,-0.002 -0.006,-0.005 0,-0.001 -0.001,-0.002 -0.001,-0.002 -0.001,-0.001 -0.003,0 -0.004,0 -0.001,0 -0.002,0.001 -0.003,0.001 -0.003,0 -0.005,-0.003 -0.007,-0.004l-0.001 -0.001c0,0 -0.001,-0.001 -0.001,-0.001 -0.002,-0.002 -0.004,-0.004 -0.004,-0.007 0,-0.001 0,-0.001 0.001,-0.002 0,-0.002 0.001,-0.005 -0.001,-0.006l-0.001 0c-0.001,0 -0.002,-0.001 -0.003,-0.002 -0.001,0 -0.001,-0.001 -0.001,-0.002 -0.001,-0.001 -0.001,-0.002 -0.001,-0.003 0,-0.002 0,-0.003 0,-0.004 0,-0.007 0,-0.008 0.006,-0.01 0,-0.001 0,-0.001 0.001,-0.001 0,0 0,0 0,0 0.001,-0.002 0,-0.003 0,-0.004 0,-0.001 -0.001,-0.002 -0.001,-0.003 0,-0.004 0.003,-0.006 0.006,-0.009 0,0 0.001,-0.001 0.002,-0.001 0.003,-0.004 0.005,-0.003 0.008,-0.002z"
      />
    </svg>
  );
}

function NavIconAdd({ size = 34 }) {
  return (
    <svg viewBox="0 0 0.136 0.136" style={{ width: size, height: size }}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0.068 0.002c0.037,0 0.066,0.029 0.066,0.066 0,0.037 -0.029,0.066 -0.066,0.066 -0.037,0 -0.066,-0.029 -0.066,-0.066 0,-0.037 0.029,-0.066 0.066,-0.066zm0 0.038c0.003,0 0.005,0.002 0.005,0.005l0 0.018 0.018 0c0.003,0 0.005,0.003 0.005,0.005 0,0.003 -0.002,0.006 -0.005,0.006l-0.018 0 0 0.018c0,0.003 -0.002,0.005 -0.005,0.005 -0.003,0 -0.005,-0.002 -0.005,-0.005l0 -0.018 -0.018 0c-0.003,0 -0.005,-0.003 -0.005,-0.006 0,-0.002 0.002,-0.005 0.005,-0.005l0.018 0 0 -0.018c0,-0.003 0.002,-0.005 0.005,-0.005z"
      />
    </svg>
  );
}

function TabBar({ pageIndex, onSelectAdd, onSelectAnalysis, onSelectSettings }) {
  const items = [
    { id: "analysis", label: "Анализ", Icon: NavIconAnalysis, iconSize: 22, cls: "", onClick: onSelectAnalysis, active: pageIndex === 0 },
    { id: "add", label: "Добавить", Icon: NavIconAdd, iconSize: 34, cls: "add", onClick: onSelectAdd, active: pageIndex >= 1 && pageIndex <= 3 },
    { id: "settings", label: "Настройки", Icon: NavIconSettings, iconSize: 22, cls: "", onClick: onSelectSettings, active: pageIndex === 4 },
  ];

  return (
    <div className="bottom-nav-wrap">
      <img src={bottomPlantsImg} alt="" className="bottom-nav-plants" draggable="false" />
      <nav className="bottom-nav">
        {items.map((it) => {
          const Icon = it.Icon;
          return (
            <button
              key={it.id}
              type="button"
              className={`nav-btn ${it.cls} ${it.active ? "active" : ""}`}
              onClick={it.onClick}
            >
              <Icon size={it.iconSize} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================ App */
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(1); // 0 Анализ, 1 Нужды, 2 Желания, 3 Подушка, 4 Настройки; по умолчанию — Добавить (Нужды)
  const [lastAddPage, setLastAddPage] = useState(1);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);
  const touchRef = useRef(null);

  useEffect(() => {
    if (pageIndex >= 1 && pageIndex <= 3) setLastAddPage(pageIndex);
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
        if (e?.message !== "not found") console.warn("Не удалось загрузить настройки", e);
      }

      try {
        const r = await storage.get("transactions");
        if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s);
      } catch (e) {
        if (e?.message !== "not found") console.warn("Не удалось загрузить операции", e);
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

  // Добавляет сразу несколько операций одним обновлением состояния. Важно делать это
  // атомарно: если вызвать addTransaction() несколько раз подряд в одном обработчике,
  // каждый вызов берёт `transactions` из одного и того же устаревшего замыкания, и
  // последующие вызовы перезатирают предыдущие — часть операций (например, вторая
  // половина разбивки) молча пропадает.
  //
  // meta.asDebt — галочка «Считать долгом» у перевода. Долг за трату «чужой» картой
  // создаётся автоматически (см. debtSpecFor), для остальных типов операций долг не нужен.
  function addTransactions(newTxs, meta) {
    const withIds = newTxs.map((tx) => ({ ...tx, id: uid() }));
    let next = [...transactions, ...withIds];
    withIds.forEach((tx) => { next = syncLinkedDebt(next, tx, meta?.asDebt); });
    persistTransactions(next);
    setToast("Добавлено");
    setTimeout(() => setToast(null), 1400);
  }

  function addTransaction(tx, meta) {
    addTransactions([tx], meta);
  }

  // Вместе с операцией удаляется и привязанный к ней долг (трата чужой картой / перевод-заём).
  function deleteTransaction(id) {
    persistTransactions(
      transactions.filter((t) => t.id !== id && !(t.type === "debt" && t.sourceTxId === id))
    );
    setToast("Удалено");
    setTimeout(() => setToast(null), 1200);
  }

  function updateTransaction(id, updatedTx, meta) {
    const replaced = transactions.map((t) => (t.id === id ? { ...updatedTx, id } : t));
    persistTransactions(syncLinkedDebt(replaced, { ...updatedTx, id }, meta?.asDebt));
    setToast("Изменено");
    setTimeout(() => setToast(null), 1200);
  }

  // Разбивка существующей операции при редактировании: первая часть занимает место
  // старой записи (тот же id), вторая (и далее) добавляется как новая — одним
  // атомарным обновлением состояния.
  function updateTransactionAsSplit(id, parts) {
    const [first, ...rest] = parts;
    const groupId = first.splitGroup || uid();
    const updatedFirst = { ...first, id, splitGroup: groupId };
    const newOnes = rest.map((tx) => ({ ...tx, splitGroup: groupId, id: uid() }));
    let next = transactions.map((t) => (t.id === id ? updatedFirst : t)).concat(newOnes);
    [updatedFirst, ...newOnes].forEach((tx) => { next = syncLinkedDebt(next, tx, false); });
    persistTransactions(next);
    setToast("Изменено");
    setTimeout(() => setToast(null), 1200);
  }

  // Списание долга между бюджетами: создаёт реальный перевод денег с карты
  // должника на карту кредитора (без обратного учёта как нового долга) и
  // одновременно закрывает все операции долга, вошедшие в этот взаимозачёт.
  function writeOffDebtGroup(group) {
    const debtorCard = BUCKET_CARD[group.toBucket];
    const creditorCard = BUCKET_CARD[group.fromBucket];
    const settleTx = {
      type: "transfer",
      date: todayStr(),
      amount: Math.round(group.amount),
      fromCard: debtorCard,
      toCard: creditorCard,
      note: "Погашение долга",
      id: uid(),
    };
    const updated = transactions.map((t) =>
      group.ids.includes(t.id) ? { ...t, repaid: true, remainingAmount: 0 } : t
    );
    persistTransactions([...updated, settleTx]);
    setToast("Долг погашен переводом");
    setTimeout(() => setToast(null), 1200);
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

  function submitForm(tx, meta) {
    if (Array.isArray(tx)) {
      if (formInitial?.editId) {
        updateTransactionAsSplit(formInitial.editId, tx);
      } else {
        addTransactions(tx);
      }
      closeForm();
      return;
    }

    if (formInitial?.editId) {
      updateTransaction(formInitial.editId, tx, meta);
      closeForm();
      return;
    }

    addTransaction(tx, meta);
    // Если это доход — показываем модалку автоматического распределения
    if (tx.type === "income") {
      setNewIncomeTx(tx);
    }
    closeForm();
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplitWithDebts(newIncomeTx.amount, settings, transactions);
    const sourceCard = newIncomeTx.card;
    const date = newIncomeTx.date;

    const transfers = [];
    if (sourceCard !== "sber" && split.toSber > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toSber), fromCard: sourceCard, toCard: "sber", note: "Авто-распределение", id: uid() });
    }
    if (sourceCard !== "alfa" && split.toAlfa > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toAlfa), fromCard: sourceCard, toCard: "alfa", note: "Авто-распределение", id: uid() });
    }
    if (sourceCard !== "ozon" && split.toOzon > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toOzon), fromCard: sourceCard, toCard: "ozon", note: "Авто-распределение", id: uid() });
    }

    const debtUpdates = split.repayments.map(({ debtId, amount: repay }) => {
      const debt = transactions.find((t) => t.id === debtId);
      const nextRemaining = Math.max(0, Math.round(debt.remainingAmount - repay));
      return { id: debtId, updatedTx: { ...debt, remainingAmount: nextRemaining, repaid: nextRemaining <= 0 } };
    });

    const next = transactions
      .map((t) => {
        const upd = debtUpdates.find((u) => u.id === t.id);
        return upd ? { ...upd.updatedTx, id: t.id } : t;
      })
      .concat(transfers);

    persistTransactions(next);
    setNewIncomeTx(null);
  }

  function selectPage(i) {
    setFormInitial(null);
    setPageIndex(Math.max(0, Math.min(4, i)));
  }

  // Тот же вариант операции, что открывает большая "+"-кнопка на самой странице
  // (Нужды/Желания/Подушка), — используется при повторном нажатии на "Добавить".
  function defaultAddFormFor(pi) {
    if (pi === 2) return { type: "expense", card: "alfa", bucket: "wants" };
    if (pi === 3) return { type: "transfer", fromCard: "sber", toCard: "ozon", debt: false };
    return { type: "expense", card: "sber", bucket: "needs" };
  }

  // Первое нажатие на "Добавить" (если мы не в разделе Добавить) — переход на последнюю
  // открытую страницу (Нужды/Желания/Подушка). Повторное нажатие (мы уже там и форма
  // закрыта) — сразу открывает "Новую операцию".
  function handleSelectAdd() {
    if (!formInitial && pageIndex >= 1 && pageIndex <= 3) {
      openForm(defaultAddFormFor(pageIndex));
    } else {
      selectPage(lastAddPage);
    }
  }

  function goPage(delta) {
    if (formInitial) return;
    setPageIndex((i) => Math.max(0, Math.min(4, i + delta)));
  }

  function handleTouchStart(e) {
    if (formInitial) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
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

  const folderBucketKey = pageIndex === 1 ? "needs" : pageIndex === 2 ? "wants" : pageIndex === 3 ? "savings" : null;
  const heroBg = folderBucketKey ? BUCKET_STYLE[folderBucketKey].folderBg : undefined;

  return (
    <>
      <AppStyles />

      <div className="app-viewport">
        <div className="app-shell">
          <main
            className="app-main"
            style={heroBg ? { background: heroBg } : undefined}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {newIncomeTx && (
              <IncomeDistributionModal
                incomeTx={newIncomeTx}
                settings={settings}
                transactions={transactions}
                onDistribute={handleAutoDistribute}
                onClose={() => setNewIncomeTx(null)}
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
            ) : pageIndex === 0 ? (
              <AnalysisView
                settings={settings}
                transactions={transactions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onDelete={deleteTransaction}
                onEditTx={(tx) => openForm(deriveFormInitialFromTx(tx, transactions))}
                onToggleInclude={toggleIncludeInTotal}
                onCloseMonth={closeMonth}
                onWriteOffDebtGroup={writeOffDebtGroup}
                goToAdd={() => selectPage(1)}
              />
            ) : pageIndex >= 1 && pageIndex <= 3 ? (
              <AddPageContent
                pageIndex={pageIndex - 1}
                settings={settings}
                transactions={transactions}
                openForm={openForm}
                canPrev={pageIndex > 0}
                canNext={pageIndex < 4}
                onPrev={() => goPage(-1)}
                onNext={() => goPage(1)}
                onSelectPage={(i) => selectPage(i + 1)}
                onDeleteTx={deleteTransaction}
                onEditTx={(tx) => openForm(deriveFormInitialFromTx(tx, transactions))}
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
            onSelectAdd={handleSelectAdd}
            onSelectAnalysis={() => selectPage(0)}
            onSelectSettings={() => selectPage(4)}
          />
          <Toast text={toast} />
        </div>
      </div>
    </>
  );
}
