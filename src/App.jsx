import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Plus, PiggyBank, BarChart3, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Wallet, X, ArrowUp, ArrowDown,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { storage } from "./storage.js";

/* ============================================================ design tokens */
const C = {
  bg: "#F1F4F2",
  surface: "#FFFFFF",
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
};

/* ============================================================ helpers */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function todayStr() {
  const d = new Date();
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
function clampPct(p) { return Math.max(0, Math.min(1, p || 0)); }
function cardLabel(card) {
  return card === "sber" ? "Сбер" : card === "alfa" ? "Альфа" : card === "ozon" ? "Озон" : card;
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
    else if (t.type === "transfer") { add(t.fromCard, -t.amount); add(t.toCard, t.amount); }
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
  const needCatTotals = {}; settings.needCats.forEach((c) => { needCatTotals[c.name] = 0; });
  const wantCatTotals = {}; settings.wantCats.forEach((c) => { wantCatTotals[c.name] = 0; });

  inMonth.forEach((t) => {
    if (t.type === "income") {
      acc[t.card].income += t.amount;
      incomeTotal += t.amount;
    } else if (t.type === "expense") {
      acc[t.card].spent += t.amount;
      if (t.card === "sber") needCatTotals[t.category] = (needCatTotals[t.category] || 0) + t.amount;
      else if (t.card === "alfa") wantCatTotals[t.category] = (wantCatTotals[t.category] || 0) + t.amount;
    } else if (t.type === "adjustment") {
      acc[t.card].adj += t.amount;
    } else if (t.type === "transfer") {
      acc[t.fromCard].transferOut += t.amount;
      acc[t.toCard].transferIn += t.amount;
    }
  });

  function derive(x) {
    const avail = x.income + x.transferIn - x.transferOut;
    const inflow = x.income + x.transferIn;
    const outflow = x.spent + x.transferOut;
    const net = avail - x.spent + x.adj;
    return { avail, inflow, outflow, net, spent: x.spent };
  }
  const sberD = derive(acc.sber), alfaD = derive(acc.alfa), ozonD = derive(acc.ozon);

  const items = inMonth.filter((t) => !t.hidden).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return {
    incomeTotal,
    sberAvail: sberD.avail, alfaAvail: alfaD.avail, ozonAvail: ozonD.avail,
    sberInflow: sberD.inflow, alfaInflow: alfaD.inflow, ozonInflow: ozonD.inflow,
    sberOutflow: sberD.outflow, alfaOutflow: alfaD.outflow, ozonOutflow: ozonD.outflow,
    sberSpent: sberD.spent, alfaSpent: alfaD.spent, ozonSpent: ozonD.spent,
    sberNet: sberD.net, alfaNet: alfaD.net, ozonNet: ozonD.net,
    needCatTotals, wantCatTotals, items,
  };
}

// Per-category usage count and "modal" (most frequently used) amount, for a given card's
// expense history — powers both the quick-add tile ordering and the pre-filled amount.
function categoryStats(transactions, card) {
  const byName = {};
  transactions.filter((t) => t.type === "expense" && t.card === card).forEach((t) => {
    if (!byName[t.category]) byName[t.category] = {};
    byName[t.category][t.amount] = (byName[t.category][t.amount] || 0) + 1;
  });
  const stats = {};
  Object.entries(byName).forEach(([name, amounts]) => {
    let count = 0, modalAmount = null, modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) { modalCount = c; modalAmount = Number(amtStr); }
    });
    stats[name] = { count, modalAmount };
  });
  return stats;
}

// Same idea for the Ozon quick-add panel, grouped by day-of-month rather than category —
// looks at transfers into Ozon and positive Ozon adjustments.
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
    let count = 0, modalAmount = null, modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) { modalCount = c; modalAmount = Number(amtStr); }
    });
    result[day] = { count, modalAmount };
  });
  return result;
}

function estimateMonthlyRate(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey, sum = 0, count = 0;
  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    if (agg.ozonNet !== 0) { sum += agg.ozonNet; count += 1; }
    mk = shiftMonth(mk, -1);
  }
  return count > 0 ? sum / count : 0;
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
    return item;
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
        out.push({ id: uid(), type: "transfer", date: t.date, amount: alfaAmt, fromCard: "sber", toCard: "alfa", note: "Авто-перенос при обновлении приложения" });
      }
      if (ozonAmt > 0) {
        out.push({ id: uid(), type: "transfer", date: t.date, amount: ozonAmt, fromCard: "sber", toCard: "ozon", note: "Авто-перенос при обновлении приложения" });
      }
      return;
    }
    out.push(t);
  });
  return out;
}

/* ============================================================ small UI parts */
function SectionTitle({ children }) {
  return <div className="text-xs font-semibold mt-6 mb-2" style={{ color: C.ink }}>{children}</div>;
}

function MonthNav({ value, onChange }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={() => onChange(shiftMonth(value, -1))}
        className="p-2 rounded-lg border" style={{ borderColor: C.border, color: C.ink }}>
        <ChevronLeft size={16} />
      </button>
      <div className="text-base font-semibold capitalize">{monthLabel(value)}</div>
      <button onClick={() => onChange(shiftMonth(value, 1))}
        className="p-2 rounded-lg border" style={{ borderColor: C.border, color: C.ink }}>
        <ChevronRight size={16} />
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
  const needPct = needPctOf(settings);

  if (todayIncome <= 0) {
    return (
      <div className="rounded-lg border p-3 mb-4 text-xs" style={{ borderColor: C.amber, background: C.amberSoft }}>
        <div className="font-medium mb-1" style={{ color: "#8A5A15" }}>Сегодня день выплаты</div>
        <div style={{ color: "#8A5A15" }}>
          Не забудьте занести доход на вкладке «Добавить» — после этого приложение подскажет, сколько перевести в Альфа и Озон.
        </div>
      </div>
    );
  }

  const split = computeIncomeSplit(todayIncome, settings);
  return (
    <div className="rounded-lg border p-3 mb-4 text-xs" style={{ borderColor: C.amber, background: C.amberSoft }}>
      <div className="font-medium mb-1" style={{ color: "#8A5A15" }}>Не забудьте сделать переводы</div>
      <div style={{ color: "#8A5A15" }}>
        Из сегодняшнего дохода ({formatMoney(todayIncome)}): {formatMoney(split.toAlfa)} в Альфа,
        {" "}{formatMoney(split.toOzon)} в Озон. Остальное ({needPct}%) остаётся на карте зачисления.
        Сделайте перевод на вкладке «Добавить».
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
    <div className="rounded-lg border p-4 mb-3 text-center" style={{ borderColor: C.border, background: C.surface }}>
      <div className="text-xs mb-1" style={{ color: C.inkMuted }}>Общий баланс</div>
      <div className="font-mono text-2xl font-semibold mb-3">{formatMoney(total)}</div>
      <div className="flex justify-center gap-4">
        {items.map((it) => (
          <label key={it.key} className="flex items-center gap-1.5 text-xs" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={!!settings.includeInTotal[it.key]} onChange={() => onToggle(it.key)} />
            <span style={{ color: it.color }}>{it.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BankCard({ stripe, soft, name, role, bigLabel, bigValue, pct, sub, footnote }) {
  return (
    <div className="flex rounded-lg overflow-hidden border mb-3" style={{ borderColor: C.border, background: C.surface }}>
      <div style={{ width: 5, background: stripe, flexShrink: 0 }} />
      <div className="flex-1 p-3.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium">{name}</span>
          <span className="font-mono text-base font-semibold">{formatMoney(bigValue)}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: C.inkMuted }}>{role}</span>
          <span className="text-xs" style={{ color: C.inkMuted }}>{bigLabel}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: soft }}>
          <div className="h-full rounded-full" style={{ width: `${clampPct(pct) * 100}%`, background: stripe }} />
        </div>
        <div className="text-xs font-mono" style={{ color: C.inkMuted }}>{sub}</div>
        {footnote && <div className="text-xs mt-1" style={{ color: C.inkMuted }}>{footnote}</div>}
      </div>
    </div>
  );
}

function TxRow({ tx, onDelete }) {
  const color = tx.type === "income" ? C.sber
    : tx.type === "expense" ? (tx.card === "sber" ? C.sber : C.alfa)
    : tx.type === "transfer" ? C.amber
    : (tx.card === "sber" ? C.sber : tx.card === "alfa" ? C.alfa : (tx.amount < 0 ? C.danger : C.ozon));
  const sign = tx.type === "expense" ? "−"
    : tx.type === "transfer" ? ""
    : (tx.type === "adjustment" && tx.amount < 0) ? "−" : "+";
  const label = tx.type === "income" ? (tx.note || `Доход (${cardLabel(tx.card)})`)
    : tx.type === "expense" ? (tx.note || tx.category)
    : tx.type === "transfer" ? (tx.note || `${cardLabel(tx.fromCard)} → ${cardLabel(tx.toCard)}`)
    : (tx.note || `Корректировка (${cardLabel(tx.card)})`);
  const day = tx.date.slice(8, 10);
  return (
    <div className="flex items-center gap-2.5 py-2 border-b" style={{ borderColor: C.border }}>
      <div className="text-xs font-mono w-6 text-center shrink-0" style={{ color: C.inkMuted }}>{day}</div>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate">{label}</div>
        {tx.type === "expense" && <div className="text-xs" style={{ color: C.inkMuted }}>{tx.category}</div>}
      </div>
      <div className="font-mono text-xs font-medium shrink-0" style={{ color }}>
        {sign}{formatMoney(Math.abs(tx.amount))}
      </div>
      <button onClick={() => onDelete(tx.id)} className="shrink-0 p-1" style={{ color: C.inkMuted }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: C.border, background: C.surface }}>
      <div className="text-xs mb-1" style={{ color: C.inkMuted }}>{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <Wallet size={34} style={{ color: C.inkMuted, margin: "0 auto" }} />
      <div className="text-sm mt-3 mb-4" style={{ color: C.inkMuted }}>
        Пока нет операций.<br />Добавьте первый доход или трату.
      </div>
      <button onClick={onAdd} className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{ background: C.ink, color: C.surface }}>
        Добавить операцию
      </button>
    </div>
  );
}

function Toast({ text }) {
  if (!text) return null;
  return (
    <div className="fixed left-1/2 bottom-24 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium flex items-center gap-1.5 shadow-lg"
      style={{ background: C.ink, color: "#fff", zIndex: 50 }}>
      <Check size={14} /> {text}
    </div>
  );
}

/* ============================================================ Dashboard */
/* ============================================================ Quick-add carousel */
function SummaryMini({ icon: Icon, label, amount, tone }) {
  const bg = tone === "in" ? C.sberSoft : C.dangerSoft;
  const fg = tone === "in" ? C.sber : C.danger;
  const sign = tone === "in" ? "+" : "−";
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ background: bg }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.surface }}>
        <Icon size={15} style={{ color: fg }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs" style={{ color: C.inkMuted }}>{label}:</div>
        <div className="font-mono text-sm font-semibold truncate" style={{ color: fg }}>{sign}{formatMoney(Math.abs(amount))}</div>
      </div>
    </div>
  );
}

function AddBigButton({ label, color, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full rounded-xl border-2 flex flex-col items-center justify-center gap-2 py-6 mb-5"
      style={{ borderColor: C.border, borderStyle: "dashed", background: C.surface }}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: C.bg }}>
        <Plus size={22} style={{ color }} />
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </button>
  );
}

function ListTile({ icon: Icon, color, name, amount, onClick }) {
  return (
    <button onClick={onClick}
      className="rounded-xl border flex items-center gap-2.5 p-3" style={{ borderColor: C.border, background: C.surface }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: color + "22" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="font-mono text-xs" style={{ color: C.inkMuted }}>{amount != null ? formatMoney(amount) : "—"}</div>
      </div>
      <ChevronRight size={14} style={{ color: C.inkMuted, flexShrink: 0 }} />
    </button>
  );
}

function CategoryPanel({ title, accentColor, card, categories, transactions, settings, onOpenFull }) {
  const stats = useMemo(() => categoryStats(transactions, card), [transactions, card]);
  const ordered = useMemo(
    () => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)),
    [categories, stats]
  );
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const spent = card === "sber" ? agg.sberSpent : agg.alfaSpent;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <SummaryMini icon={ArrowUp} label="Пришло" amount={inflow} tone="in" />
        <SummaryMini icon={ArrowDown} label="Ушло" amount={spent} tone="out" />
      </div>

      <div className="text-center mb-4">
        <div className="text-base font-semibold" style={{ color: accentColor }}>{title}</div>
        <div className="font-mono text-2xl font-bold mt-1">{formatMoney(spent)}</div>
      </div>

      <AddBigButton label="Добавить расход" color={accentColor} onClick={() => onOpenFull({ type: "expense", card })} />

      <div className="grid grid-cols-2 gap-2.5">
        {ordered.map((cat) => {
          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);
          return (
            <ListTile key={cat.name} icon={Icon} color={cat.color} name={cat.name} amount={s?.modalAmount ?? null}
              onClick={() => {
                if (s?.modalAmount != null) {
                  onOpenFull({ type: "expense", card, category: cat.name, amount: s.modalAmount });
                } else {
                  onOpenFull({ type: "expense", card });
                }
              }} />
          );
        })}
      </div>
    </div>
  );
}

function OzonPanel({ settings, transactions, onOpenFull }) {
  const dayStats = useMemo(() => ozonDayStats(transactions), [transactions]);
  const days = settings.reminderDays.length ? settings.reminderDays : [5, 15, 30];
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);

  // detailed savings info (previously a separate "Подушка" tab, now folded into this panel)
  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);
  const totalSaved = balances.ozon;
  const pct = settings.goal > 0 ? totalSaved / settings.goal : 0;
  const left = settings.goal - totalSaved;
  const rate = useMemo(() => estimateMonthlyRate(transactions, settings, todayMonthKey()), [transactions, settings]);
  const monthsLeft = left <= 0 ? 0 : (rate > 0 ? Math.ceil(left / rate) : null);
  const thisMonth = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const ozonEntries = useMemo(() => {
    const list = transactions.filter((t) =>
      (t.type === "adjustment" && t.card === "ozon") ||
      (t.type === "transfer" && (t.fromCard === "ozon" || t.toCard === "ozon"))
    );
    return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <SummaryMini icon={ArrowUp} label="Пришло" amount={agg.ozonInflow} tone="in" />
        <SummaryMini icon={ArrowDown} label="Ушло" amount={agg.ozonOutflow} tone="out" />
      </div>

      <div className="text-center mb-4">
        <div className="text-base font-semibold" style={{ color: C.ozon }}>Подушка</div>
        <div className="font-mono text-2xl font-bold mt-1">{formatMoney(agg.ozonOutflow)}</div>
      </div>

      <AddBigButton label="Добавить перевод" color={C.ozon} onClick={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon" })} />

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {days.map((d) => {
          const s = dayStats[d];
          return (
            <ListTile key={d} icon={PiggyBank} color={C.ozon} name={`${d} числа`} amount={s?.modalAmount ?? null}
              onClick={() => {
                if (s?.modalAmount != null) {
                  onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon", amount: s.modalAmount });
                } else {
                  onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon" });
                }
              }} />
          );
        })}
      </div>

      <div className="rounded-lg border p-5 mb-4 text-center" style={{ borderColor: C.border, background: C.surface }}>
        <div className="text-xs mb-1" style={{ color: C.inkMuted }}>Баланс на Озон</div>
        <div className="font-mono text-3xl font-semibold mb-1" style={{ color: C.ozon }}>{formatMoney(totalSaved)}</div>
        <div className="text-xs mb-3" style={{ color: C.inkMuted }}>из цели {formatMoney(settings.goal)}</div>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: C.ozonSoft }}>
          <div className="h-full rounded-full" style={{ width: `${clampPct(pct) * 100}%`, background: C.ozon }} />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span style={{ color: C.inkMuted }}>{Math.round(pct * 100)}%</span>
          <span style={{ color: C.inkMuted }}>{left > 0 ? `осталось ${formatMoney(left)}` : "цель достигнута 🎉"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox label="В этом месяце" value={`${thisMonth.ozonNet >= 0 ? "+" : ""}${formatMoney(thisMonth.ozonNet)}`} color={C.ozon} />
        <StatBox label="Прогноз до цели" value={monthsLeft === 0 ? "готово" : monthsLeft ? `~${monthsLeft} мес.` : "—"} color={C.ozon} />
      </div>

      <div className="rounded-lg p-3 text-xs mb-5" style={{ background: C.amberSoft, color: "#8A5A15" }}>
        Деньги из подушки не трогаем ни при каких условиях, кроме реального форс-мажора — потери работы или проблем со здоровьем.
        С 3-го месяца стоит подключить Ozon Premium (199 ₽/мес): ставка поднимется примерно до 12% годовых.
      </div>

      <div className="text-xs font-medium mb-2" style={{ color: C.inkMuted }}>История по Озон</div>
      {ozonEntries.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: C.inkMuted }}>
          Переводы и корректировки, которые касаются Озон, появятся здесь.
        </div>
      ) : (
        <div>
          {ozonEntries.map((t) => {
            const isTransferOut = t.type === "transfer" && t.fromCard === "ozon";
            const signedAmt = isTransferOut ? -t.amount : t.amount;
            const label = t.type === "adjustment"
              ? (t.note || (t.amount < 0 ? "Списание" : "Пополнение"))
              : isTransferOut ? (t.note || `Перевод в ${cardLabel(t.toCard)}`)
              : (t.note || `Перевод из ${cardLabel(t.fromCard)}`);
            return (
              <div key={t.id} className="flex items-center justify-between text-xs py-2 border-b" style={{ borderColor: C.border }}>
                <div>
                  <div>{label} {t.hidden ? "(скрыто)" : ""}</div>
                  <div className="text-xs" style={{ color: C.inkMuted }}>{t.date}</div>
                </div>
                <div className="font-mono font-medium" style={{ color: signedAmt < 0 ? C.danger : C.ozon }}>
                  {signedAmt < 0 ? "−" : "+"}{formatMoney(Math.abs(signedAmt))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================ Add */
const EXPENSE_CARDS = [
  { id: "sber", label: "Сбербанк", sub: "нужды", icon: "🟢", color: C.sber, soft: C.sberSoft },
  { id: "alfa", label: "Альфа-Банк", sub: "развлечения", icon: "🔴", color: C.alfa, soft: C.alfaSoft },
];
const ALL_CARDS = [
  { id: "sber", label: "Сбер", icon: "🟢", color: C.sber, soft: C.sberSoft },
  { id: "alfa", label: "Альфа", icon: "🔴", color: C.alfa, soft: C.alfaSoft },
  { id: "ozon", label: "Озон", icon: "🔵", color: C.ozon, soft: C.ozonSoft },
];

function CardPicker({ options, value, onChange }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="flex-1 rounded-lg border py-2.5 flex flex-col items-center gap-0.5"
          style={{ borderColor: value === o.id ? o.color : C.border, background: value === o.id ? o.soft : C.surface }}>
          <span className="text-sm font-medium" style={{ color: value === o.id ? o.color : C.ink }}>{o.icon} {o.label}</span>
          {o.sub && <span className="text-xs" style={{ color: value === o.id ? o.color : C.inkMuted }}>{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

const TYPE_OPTIONS = [
  { id: "expense", label: "Трата" },
  { id: "income", label: "Доход" },
  { id: "transfer", label: "Перевод" },
  { id: "adjustment", label: "Коррекция" },
];

function FullAddForm({ settings, transactions, onAdd, initial }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [card, setCard] = useState(initial?.card || "sber");
  const [incomeCard, setIncomeCard] = useState("sber");
  const [fromCard, setFromCard] = useState(initial?.fromCard || "sber");
  const [toCard, setToCard] = useState(initial?.toCard || "ozon");
  const [category, setCategory] = useState(initial?.category || settings.needCats[0]?.name || "");
  const [note, setNote] = useState("");
  const [adjMode, setAdjMode] = useState("delta");
  const [direction, setDirection] = useState("add");
  const [showInHistory, setShowInHistory] = useState(true);

  useEffect(() => {
    if (type !== "expense") return;
    const list = card === "sber" ? settings.needCats : settings.wantCats;
    setCategory((prev) => (list.some((c) => c.name === prev) ? prev : (list[0]?.name || "")));
  }, [type, card, settings.needCats, settings.wantCats]);

  useEffect(() => {
    if (type === "expense" && card === "ozon") setCard("sber");
  }, [type, card]);

  const numAmount = parseFloat(amount) || 0;
  const incomePreview = type === "income" && numAmount > 0 ? computeIncomeSplit(numAmount, settings) : null;

  const currentBalances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);
  const currentCardBalance = currentBalances[card] || 0;

  let adjDelta = 0;
  if (type === "adjustment") {
    if (adjMode === "delta") {
      adjDelta = direction === "withdraw" ? -Math.abs(numAmount) : Math.abs(numAmount);
    } else {
      const target = amount === "" ? null : (parseFloat(amount) || 0);
      adjDelta = target === null ? 0 : target - currentCardBalance;
    }
  }

  function submit() {
    if (!date) return;
    if (type === "expense") {
      if (numAmount <= 0) return;
      onAdd({ type: "expense", date, amount: numAmount, card, category, note });
    } else if (type === "income") {
      if (numAmount <= 0) return;
      onAdd({ type: "income", date, amount: numAmount, card: incomeCard, note });
    } else if (type === "transfer") {
      if (numAmount <= 0 || fromCard === toCard) return;
      onAdd({ type: "transfer", date, amount: numAmount, fromCard, toCard, note });
    } else {
      if (adjMode === "delta" && numAmount <= 0) return;
      if (adjMode === "target" && amount === "") return;
      onAdd({ type: "adjustment", date, amount: adjDelta, card, note, hidden: !showInHistory });
    }
    setAmount("");
    setNote("");
  }

  const canSubmit = !!date && (
    type === "expense" ? numAmount > 0
    : type === "income" ? numAmount > 0
    : type === "transfer" ? (numAmount > 0 && fromCard !== toCard)
    : adjMode === "delta" ? numAmount > 0 : amount !== ""
  );

  return (
    <div>
      <div className="flex rounded-lg overflow-hidden border mb-5" style={{ borderColor: C.border }}>
        {TYPE_OPTIONS.map((opt) => (
          <button key={opt.id} onClick={() => setType(opt.id)}
            className="flex-1 py-2.5 text-xs font-medium"
            style={{ background: type === opt.id ? C.ink : C.surface, color: type === opt.id ? C.surface : C.inkMuted }}>
            {opt.label}
          </button>
        ))}
      </div>

      {type === "income" && (
        <div className="mb-4">
          <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Куда пришли деньги</label>
          <CardPicker options={ALL_CARDS} value={incomeCard} onChange={setIncomeCard} />
        </div>
      )}

      {type === "transfer" && (
        <>
          {!(initial?.fromCard && initial?.toCard) && (
            <>
              <div className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Откуда</label>
                <CardPicker options={ALL_CARDS} value={fromCard} onChange={setFromCard} />
              </div>
              <div className="mb-2">
                <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Куда</label>
                <CardPicker options={ALL_CARDS} value={toCard} onChange={setToCard} />
              </div>
              {fromCard === toCard && (
                <div className="text-xs mb-3" style={{ color: C.danger }}>Карты должны отличаться</div>
              )}
            </>
          )}
          <div className="text-xs mb-4" style={{ color: C.inkMuted }}>
            Баланс «Откуда»: <span className="font-mono">{formatMoney(currentBalances[fromCard] || 0)}</span>
            {" · "}Баланс «Куда»: <span className="font-mono">{formatMoney(currentBalances[toCard] || 0)}</span>
          </div>
        </>
      )}

      {type === "adjustment" && (
        <>
          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Карта</label>
            <CardPicker options={ALL_CARDS} value={card} onChange={setCard} />
            <div className="text-xs mt-2" style={{ color: C.inkMuted }}>
              Текущий баланс: <span className="font-mono">{formatMoney(currentCardBalance)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Как задать</label>
            <div className="flex gap-2">
              <button onClick={() => setAdjMode("delta")} className="flex-1 rounded-lg border py-2 text-xs font-medium"
                style={{ borderColor: adjMode === "delta" ? C.ink : C.border, background: adjMode === "delta" ? C.bg : C.surface, color: adjMode === "delta" ? C.ink : C.inkMuted }}>
                На сумму (+/−)
              </button>
              <button onClick={() => setAdjMode("target")} className="flex-1 rounded-lg border py-2 text-xs font-medium"
                style={{ borderColor: adjMode === "target" ? C.ink : C.border, background: adjMode === "target" ? C.bg : C.surface, color: adjMode === "target" ? C.ink : C.inkMuted }}>
                Задать итог
              </button>
            </div>
            <div className="text-xs mt-2" style={{ color: C.inkMuted }}>
              {adjMode === "delta"
                ? "Прибавит или вычтет указанную сумму."
                : "Например: было 1000 ₽, по факту 600 ₽ — впишите 600, разница в 400 ₽ учтётся сама."}
            </div>
          </div>

          {adjMode === "delta" && (
            <div className="mb-4">
              <div className="flex gap-2">
                <button onClick={() => setDirection("add")} className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
                  style={{ borderColor: direction === "add" ? C.ozon : C.border, background: direction === "add" ? C.ozonSoft : C.surface, color: direction === "add" ? C.ozon : C.inkMuted }}>
                  Пополнение
                </button>
                <button onClick={() => setDirection("withdraw")} className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
                  style={{ borderColor: direction === "withdraw" ? C.danger : C.border, background: direction === "withdraw" ? C.dangerSoft : C.surface, color: direction === "withdraw" ? C.danger : C.inkMuted }}>
                  Списание
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mb-5">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>
          {type === "adjustment" && adjMode === "target" ? "Сколько сейчас на карте на самом деле" : "Сумма"}
        </label>
        <div className="flex items-baseline gap-2 border-b-2 pb-2" style={{ borderColor: C.ink }}>
          <input type="number" inputMode="decimal" min="0" step="1" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className="font-mono text-4xl w-full outline-none bg-transparent" style={{ color: C.ink }} />
          <span className="font-mono text-2xl" style={{ color: C.inkMuted }}>₽</span>
        </div>
        {type === "adjustment" && adjMode === "target" && amount !== "" && (
          <div className="text-xs mt-2" style={{ color: adjDelta >= 0 ? C.ozon : C.danger }}>
            Корректировка: {adjDelta >= 0 ? "+" : ""}{formatMoney(adjDelta)}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: C.border, color: C.ink }} />
      </div>

      {type === "expense" && (
        <>
          {!initial?.card && (
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Карта</label>
              <CardPicker options={EXPENSE_CARDS} value={card} onChange={setCard} />
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border, color: C.ink }}>
              {(card === "sber" ? settings.needCats : settings.wantCats).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "adjustment" && card === "ozon" && adjDelta < 0 && (
        <div className="flex gap-2 rounded-lg p-3 text-xs mb-4" style={{ background: C.dangerSoft, color: C.danger }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Подушку трогаем только при реальном форс-мажоре: потеря работы или проблемы со здоровьем.</span>
        </div>
      )}
      {type === "adjustment" && (
        <label className="flex items-center gap-2 mb-4 text-xs" style={{ color: C.inkMuted }}>
          <input type="checkbox" checked={showInHistory} onChange={(e) => setShowInHistory(e.target.checked)} />
          Показывать в истории операций
        </label>
      )}

      <div className="mb-5">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>
          {type === "expense" ? "Описание (необязательно)" : "Комментарий (необязательно)"}
        </label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={type === "expense" ? "Пятёрочка, продукты" : type === "income" ? "Зарплата" : type === "transfer" ? "Перевод по СБП" : "Например, кэшбэк"}
          className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border, color: C.ink }} />
      </div>

      {type === "income" && incomePreview && (
        <div className="mb-5 rounded-lg border p-3 text-xs" style={{ borderColor: C.border, background: C.bg }}>
          <div className="mb-2" style={{ color: C.inkMuted }}>Не забудьте перевести после зачисления:</div>
          <div className="flex justify-between mb-1">
            <span style={{ color: C.alfa }}>🔴 В Альфа ({settings.wantPct}%)</span>
            <span className="font-mono font-medium">{formatMoney(incomePreview.toAlfa)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: C.ozon }}>🔵 В Озон ({settings.savePct}%)</span>
            <span className="font-mono font-medium">{formatMoney(incomePreview.toOzon)}</span>
          </div>
          <div className="pt-2 mt-2 border-t text-xs" style={{ borderColor: C.border, color: C.inkMuted }}>
            Остальное ({needPctOf(settings)}%) остаётся на карте зачисления — переводы делайте через тип «Перевод».
          </div>
        </div>
      )}

      <button onClick={submit} disabled={!canSubmit}
        className="w-full rounded-lg py-3 text-sm font-semibold"
        style={{ background: canSubmit ? C.ink : C.border, color: canSubmit ? C.surface : C.inkMuted }}>
        Добавить
      </button>
    </div>
  );
}

function AddView({ settings, transactions, onAdd }) {
  const [view, setView] = useState("carousel"); // "carousel" | "form"
  const [activePanel, setActivePanel] = useState(0);
  const [prefill, setPrefill] = useState(null);
  const [prefillSeq, setPrefillSeq] = useState(0);
  const scrollRef = useRef(null);

  function openFull(partial) {
    setPrefill(partial);
    setPrefillSeq((s) => s + 1);
    setView("form");
  }

  function handleAdd(tx) {
    onAdd(tx);
    setView("carousel");
  }

  function goToPanel(i) {
    setActivePanel(i);
    const el = scrollRef.current;
    if (el && el.children[i]) el.children[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activePanel) setActivePanel(idx);
  }

  if (view === "form") {
    return (
      <div>
        <button onClick={() => setView("carousel")}
          className="flex items-center gap-1 mb-4"
          style={{ color: C.inkMuted, background: "none", border: "none", fontSize: 13, padding: 0 }}>
          <ChevronLeft size={16} /> Назад
        </button>
        <FullAddForm key={prefillSeq} settings={settings} transactions={transactions} onAdd={handleAdd} initial={prefill} />
      </div>
    );
  }

  const panelDefs = [
    { key: "need", render: () => <CategoryPanel title="Нужды" accentColor={C.sber} card="sber" categories={settings.needCats} transactions={transactions} settings={settings} onOpenFull={openFull} /> },
    { key: "want", render: () => <CategoryPanel title="Развлечения" accentColor={C.alfa} card="alfa" categories={settings.wantCats} transactions={transactions} settings={settings} onOpenFull={openFull} /> },
    { key: "ozon", render: () => <OzonPanel settings={settings} transactions={transactions} onOpenFull={openFull} /> },
  ];

  return (
    <div>
      <div ref={scrollRef} onScroll={handleScroll}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        className="mb-1">
        {panelDefs.map((p) => (
          <div key={p.key} style={{ minWidth: "100%", scrollSnapAlign: "start", flexShrink: 0 }}>{p.render()}</div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mb-5">
        {panelDefs.map((p, i) => (
          <button key={p.key} onClick={() => goToPanel(i)} aria-label={`Панель ${i + 1}`}
            style={{ width: 6, height: 6, borderRadius: 999, background: i === activePanel ? C.ink : C.border, border: "none", padding: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Analysis */
function AnalysisView({ settings, transactions, selectedMonth, setSelectedMonth, onDelete, onToggleInclude, goToAdd }) {
  const cutoff = endOfMonthStr(selectedMonth);
  const bal = useMemo(() => computeBalances(transactions, settings, cutoff), [transactions, settings, cutoff]);
  const hasAnyTx = transactions.length > 0;

  const totalBalance =
    (settings.includeInTotal.sber ? bal.sber : 0) +
    (settings.includeInTotal.alfa ? bal.alfa : 0) +
    (settings.includeInTotal.ozon ? bal.ozon : 0);
  const ozonPct = settings.goal > 0 ? bal.ozon / settings.goal : 0;

  const months = useMemo(() => getAllMonthKeys(transactions).slice(-6), [transactions]);

  const chartData = useMemo(() => months.map((mk) => {
    const a = aggregateMonth(mk, transactions, settings);
    return {
      month: monthLabelShort(mk),
      "Нужды": Math.round(a.sberSpent),
      "Развлечения": Math.round(a.alfaSpent),
      "Накопления": Math.round(a.ozonNet),
    };
  }), [months, transactions, settings]);

  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const sberUtil = agg.sberAvail > 0 ? agg.sberSpent / agg.sberAvail : 0;
  const alfaUtil = agg.alfaAvail > 0 ? agg.alfaSpent / agg.alfaAvail : 0;

  const allCats = useMemo(() => {
    const need = Object.entries(agg.needCatTotals).map(([cat, val]) => ({ cat, val, type: "need" }));
    const want = Object.entries(agg.wantCatTotals).map(([cat, val]) => ({ cat, val, type: "want" }));
    return [...need, ...want].filter((x) => x.val > 0).sort((a, b) => b.val - a.val);
  }, [agg]);

  const topCat = allCats[0];

  return (
    <div>
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <PaydayReminder settings={settings} transactions={transactions} />

      {!hasAnyTx ? (
        <EmptyState onAdd={goToAdd} />
      ) : (
        <>
          <TotalBalanceCard total={totalBalance} settings={settings} onToggle={onToggleInclude} />

          <BankCard stripe={C.sber} soft={C.sberSoft} name="Сбербанк" role="Обязательные нужды"
            bigLabel="баланс" bigValue={bal.sber} pct={sberUtil}
            sub={`Пришло +${formatMoney(agg.sberInflow)} · Ушло −${formatMoney(agg.sberOutflow)}`} />
          <BankCard stripe={C.alfa} soft={C.alfaSoft} name="Альфа-Банк" role="Развлечения"
            bigLabel="баланс" bigValue={bal.alfa} pct={alfaUtil}
            sub={`Пришло +${formatMoney(agg.alfaInflow)} · Ушло −${formatMoney(agg.alfaOutflow)}`} />
          <BankCard stripe={C.ozon} soft={C.ozonSoft} name="Озон Банк" role="Подушка безопасности"
            bigLabel="баланс" bigValue={bal.ozon} pct={ozonPct}
            sub={`Цель ${formatMoney(settings.goal)}`}
            footnote={`За этот месяц: ${agg.ozonNet >= 0 ? "+" : ""}${formatMoney(agg.ozonNet)}`} />

          {months.length < 2 ? (
            <div className="text-xs rounded-lg border p-4 mt-4 mb-4" style={{ borderColor: C.border, color: C.inkMuted }}>
              Тренд по месяцам появится, когда наберётся история за 2 и более месяцев.
            </div>
          ) : (
            <div className="rounded-lg border p-3 mt-4 mb-5" style={{ borderColor: C.border, background: C.surface }}>
              <div className="text-xs font-medium mb-3" style={{ color: C.inkMuted }}>Тренд по месяцам</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.inkMuted }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Нужды" fill={C.sber} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Развлечения" fill={C.alfa} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Накопления" fill={C.ozon} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-5">
            <StatBox label="Доход" value={formatMoney(agg.incomeTotal)} color={C.ink} />
            <StatBox label="Траты" value={formatMoney(agg.sberSpent + agg.alfaSpent)} color={C.ink} />
            <StatBox label="В подушку" value={`${agg.ozonNet >= 0 ? "+" : ""}${formatMoney(agg.ozonNet)}`} color={C.ozon} />
          </div>

          {topCat && (
            <div className="text-xs mb-4" style={{ color: C.inkMuted }}>
              Больше всего потрачено на «{topCat.cat}» — {formatMoney(topCat.val)}
            </div>
          )}

          <div className="text-xs font-medium mb-2" style={{ color: C.inkMuted }}>Расходы по категориям</div>
          {allCats.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{ color: C.inkMuted }}>Трат в этом месяце пока нет</div>
          ) : (
            <div className="space-y-2.5 mb-5">
              {allCats.map(({ cat, val, type }) => {
                const budget = type === "need" ? agg.sberAvail : agg.alfaAvail;
                const color = type === "need" ? C.sber : C.alfa;
                const pct = budget > 0 ? val / budget : 0;
                return (
                  <div key={type + cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{cat}</span>
                      <span className="font-mono">{formatMoney(val)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: type === "need" ? C.sberSoft : C.alfaSoft }}>
                      <div className="h-full rounded-full" style={{ width: `${clampPct(pct) * 100}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-xs font-medium mb-2" style={{ color: C.inkMuted }}>Операции за месяц</div>
          {agg.items.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{ color: C.inkMuted }}>Пока нет операций в этом месяце</div>
          ) : (
            <div>{agg.items.slice(0, 10).map((t) => <TxRow key={t.id} tx={t} onDelete={onDelete} />)}</div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================ Settings */
function NumField({ label, value, onChange, onBlur, hint }) {
  return (
    <div className="mb-3">
      <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>{label}</label>
      <input type="number" min="0" step="1" value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={onBlur}
        className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: C.border, color: C.ink }} />
      {hint && <div className="text-xs mt-1" style={{ color: C.inkMuted }}>{hint}</div>}
    </div>
  );
}

function IconGrid({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {ICON_KEYS.map((key) => {
        const Icon = getIcon(key);
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)} type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: active ? C.ink : C.bg, color: active ? C.surface : C.inkMuted }}>
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

function ColorGrid({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_COLORS.map((c) => (
        <button key={c} onClick={() => onChange(c)} type="button"
          className="w-7 h-7 rounded-full"
          style={{ background: c, outline: value === c ? `2px solid ${C.ink}` : "none", outlineOffset: 2, border: "none" }} />
      ))}
    </div>
  );
}

function CategoryEditor({ categories, onChange }) {
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ICON_KEYS[0]);
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);

  function updateCategory(name, patch) {
    onChange(categories.map((c) => (c.name === name ? { ...c, ...patch } : c)));
  }
  function removeCategory(name) {
    onChange(categories.filter((c) => c.name !== name));
    if (editing === name) setEditing(null);
  }
  function addCategory() {
    const name = newName.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    onChange([...categories, { name, icon: newIcon, color: newColor }]);
    setNewName("");
    setNewIcon(ICON_KEYS[0]);
    setNewColor(CATEGORY_COLORS[0]);
  }

  return (
    <div className="mb-2">
      <div className="space-y-2 mb-3">
        {categories.map((cat) => {
          const Icon = getIcon(cat.icon);
          const isEditing = editing === cat.name;
          return (
            <div key={cat.name} className="rounded-lg border" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2.5 p-2">
                <button onClick={() => setEditing(isEditing ? null : cat.name)} type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: cat.color + "22" }}>
                  <Icon size={17} style={{ color: cat.color }} />
                </button>
                <span className="text-xs flex-1">{cat.name}</span>
                <button onClick={() => removeCategory(cat.name)} type="button" style={{ color: C.inkMuted }}>
                  <X size={14} />
                </button>
              </div>
              {isEditing && (
                <div className="p-2 pt-0">
                  <IconGrid value={cat.icon} onChange={(icon) => updateCategory(cat.name, { icon })} />
                  <ColorGrid value={cat.color} onChange={(color) => updateCategory(cat.name, { color })} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border p-2.5" style={{ borderColor: C.border }}>
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="Новая категория"
          className="w-full border rounded-lg px-3 py-1.5 text-xs mb-2" style={{ borderColor: C.border, color: C.ink }} />
        <IconGrid value={newIcon} onChange={setNewIcon} />
        <ColorGrid value={newColor} onChange={setNewColor} />
        <button onClick={addCategory} type="button"
          className="w-full rounded-lg py-2 text-xs font-medium mt-2" style={{ background: C.ink, color: C.surface }}>
          Добавить категорию
        </button>
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave, onWipeAll }) {
  const [local, setLocal] = useState(settings);
  const [armed, setArmed] = useState(false);
  const armTimer = useRef(null);

  useEffect(() => { setLocal(settings); }, [settings]);

  function field(key, value) { setLocal((prev) => ({ ...prev, [key]: value })); }

  function commit() {
    const clean = { ...local };
    ["wantPct", "savePct", "goal"].forEach((k) => {
      if (clean[k] === "" || clean[k] === null || Number.isNaN(clean[k])) clean[k] = 0;
    });
    const ob = { ...clean.openingBalance };
    ["sber", "alfa", "ozon"].forEach((k) => {
      if (ob[k] === "" || ob[k] === null || Number.isNaN(ob[k])) ob[k] = 0;
    });
    clean.openingBalance = ob;
    setLocal(clean);
    onSave(clean);
  }

  function toggleReminderDay(d) {
    const active = local.reminderDays.includes(d);
    const next = active ? local.reminderDays.filter((x) => x !== d) : [...local.reminderDays, d].sort((a, b) => a - b);
    const nextSettings = { ...local, reminderDays: next };
    setLocal(nextSettings); onSave(nextSettings);
  }

  function saveNeedCats(next) {
    const s = { ...local, needCats: next };
    setLocal(s); onSave(s);
  }
  function saveWantCats(next) {
    const s = { ...local, wantCats: next };
    setLocal(s); onSave(s);
  }

  function handleDangerClick() {
    if (!armed) {
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), 5000);
    } else {
      clearTimeout(armTimer.current);
      setArmed(false);
      onWipeAll();
    }
  }

  return (
    <div className="pb-8">
      <SectionTitle>Проценты для напоминаний о переводах</SectionTitle>
      <NumField label="В Озон (накопления), %" value={local.savePct} onChange={(v) => field("savePct", v)} onBlur={commit} />
      <NumField label="В Альфа (развлечения), %" value={local.wantPct} onChange={(v) => field("wantPct", v)} onBlur={commit} />
      <div className="text-xs mb-5 -mt-1" style={{ color: C.inkMuted }}>
        На карте зачисления (нужды) останется: {needPctOf({ wantPct: Number(local.wantPct) || 0, savePct: Number(local.savePct) || 0 })}%.
        Эти проценты используются только для подсказок — переводы между картами вы всегда делаете вручную.
      </div>

      <SectionTitle>Напоминание о переводах</SectionTitle>
      <div className="flex gap-2 mb-2">
        {[5, 15, 30].map((d) => {
          const active = local.reminderDays.includes(d);
          return (
            <button key={d} onClick={() => toggleReminderDay(d)}
              className="flex-1 rounded-lg border py-2 text-sm font-medium"
              style={{ borderColor: active ? C.amber : C.border, background: active ? C.amberSoft : C.surface, color: active ? C.amber : C.inkMuted }}>
              {d} число
            </button>
          );
        })}
      </div>
      <div className="text-xs mb-5" style={{ color: C.inkMuted }}>В эти дни на «Обзоре» будет появляться напоминание сделать переводы, и они появятся плитками на вкладке «Добавить».</div>

      <SectionTitle>Начальный баланс</SectionTitle>
      <NumField label="Сбербанк, ₽" value={local.openingBalance.sber}
        onChange={(v) => field("openingBalance", { ...local.openingBalance, sber: v })} onBlur={commit} />
      <NumField label="Альфа-Банк, ₽" value={local.openingBalance.alfa}
        onChange={(v) => field("openingBalance", { ...local.openingBalance, alfa: v })} onBlur={commit} />
      <NumField label="Озон Банк, ₽" value={local.openingBalance.ozon}
        onChange={(v) => field("openingBalance", { ...local.openingBalance, ozon: v })} onBlur={commit} />
      <div className="text-xs mb-5 -mt-1" style={{ color: C.inkMuted }}>
        Сколько реально было на картах в день, с которого вы начали вести учёт здесь.
      </div>

      <SectionTitle>Цель «Подушка безопасности»</SectionTitle>
      <NumField label="Цель, ₽" value={local.goal} onChange={(v) => field("goal", v)} onBlur={commit} />

      <SectionTitle>Категории — Нужды (Сбер)</SectionTitle>
      <CategoryEditor categories={local.needCats} onChange={saveNeedCats} />

      <SectionTitle>Категории — Развлечения (Альфа)</SectionTitle>
      <CategoryEditor categories={local.wantCats} onChange={saveWantCats} />

      <SectionTitle>Подписки</SectionTitle>
      <div className="text-xs rounded-lg border p-3 mb-5" style={{ borderColor: C.border, color: C.inkMuted }}>
        <p className="mb-2"><span style={{ color: C.ink, fontWeight: 500 }}>Альфа-Банк:</span> подключите T-Pro (299 ₽/мес) — выше кэшбэк на развлечения и лимиты на переводы между картами.</p>
        <p><span style={{ color: C.ink, fontWeight: 500 }}>Озон Банк:</span> первые 2 месяца — повышенная приветственная ставка. С 3-го месяца подключите Ozon Premium (199 ₽/мес) — ставка вырастет примерно до 12%.</p>
      </div>

      <SectionTitle>Данные</SectionTitle>
      <button onClick={handleDangerClick}
        className="w-full rounded-lg py-2.5 text-sm font-medium border"
        style={{
          borderColor: armed ? C.danger : C.border,
          background: armed ? C.dangerSoft : C.surface,
          color: armed ? C.danger : C.inkMuted,
        }}>
        {armed ? "Нажмите ещё раз для удаления всех операций" : "Удалить все операции"}
      </button>
    </div>
  );
}

/* ============================================================ Tab bar */
const TABS = [
  { id: "add", label: "Добавить", icon: Plus },
  { id: "analysis", label: "Анализ", icon: BarChart3 },
  { id: "settings", label: "Настройки", icon: SettingsIcon },
];

function TabBar({ tab, setTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t" style={{ background: C.surface, borderColor: C.border, zIndex: 40 }}>
      <div className="max-w-md mx-auto flex justify-around py-1.5 px-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg"
              style={{ color: active ? C.ink : C.inkMuted, background: active ? C.bg : "transparent" }}>
              <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
              <span className="text-xs">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================ App */
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("add");
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let s = DEFAULT_SETTINGS, t = [];
      try {
        const r = await storage.get("settings");
        if (r && r.value) s = migrateSettings(JSON.parse(r.value));
      } catch (e) { /* first run, use defaults */ }
      try {
        const r = await storage.get("transactions");
        if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s);
      } catch (e) { /* first run, empty list */ }
      if (alive) { setSettings(s); setTransactions(t); setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  async function persistTransactions(next) {
    setTransactions(next);
    try { await storage.set("transactions", JSON.stringify(next)); } catch (e) { console.error(e); }
  }
  async function persistSettings(next) {
    setSettings(next);
    try { await storage.set("settings", JSON.stringify(next)); } catch (e) { console.error(e); }
  }

  function addTransaction(tx) {
    const next = [...transactions, { ...tx, id: uid() }];
    persistTransactions(next);
    setToast("Добавлено");
    setTimeout(() => setToast(null), 1400);
  }
  function deleteTransaction(id) {
    persistTransactions(transactions.filter((t) => t.id !== id));
  }
  function toggleIncludeInTotal(key) {
    const next = { ...settings, includeInTotal: { ...settings.includeInTotal, [key]: !settings.includeInTotal[key] } };
    persistSettings(next);
  }

  if (!loaded) {
    return (
      <div style={{ background: C.bg, color: C.inkMuted, minHeight: "100vh" }} className="font-display flex items-center justify-center">
        <div className="text-sm">Загрузка…</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }} className="font-display">
      <header className="max-w-md mx-auto px-4 pt-5 pb-1">
        <div className="text-lg font-semibold">Бюджет</div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-24 pt-3">
        {tab === "add" && <AddView settings={settings} transactions={transactions} onAdd={addTransaction} />}
        {tab === "analysis" && (
          <AnalysisView settings={settings} transactions={transactions}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            onDelete={deleteTransaction} onToggleInclude={toggleIncludeInTotal} goToAdd={() => setTab("add")} />
        )}
        {tab === "settings" && (
          <SettingsView settings={settings} onSave={persistSettings}
            onWipeAll={() => persistTransactions([])} />
        )}
      </main>

      <TabBar tab={tab} setTab={setTab} />
      <Toast text={toast} />
    </div>
  );
}
