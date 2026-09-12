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
    items,
  };
}

function categoryStats(transactions, card) {
  const byName = {};
  transactions.filter((t) => t.type === "expense" && t.card === card).forEach((t) => {
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
        padding: 14px 12px 14px;
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
        height: 104px;
        border-radius: 18px;
        border: 1px solid color-mix(in srgb, var(--accent) 35%, ${C.border});
        background: rgba(255,255,255,0.88);
        color: var(--accent);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 7px;
        box-shadow: 0 8px 18px rgba(22, 32, 27, 0.08);
      }

      .big-add .plus-circle {
        width: 46px;
        height: 46px;
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
          padding: 12px 9px;
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
          height: 96px;
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
          height: 92px;
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

function BankCard({ stripe, soft, name, role, bigLabel, bigValue, pct, sub, footnote }) {
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
    <div className="tx-row">
      <div className="tx-day">{day}</div>
      <div className="tx-dot" style={{ background: color }} />
      <div className="tx-main">
        <div className="tx-label">{label}</div>
        {tx.type === "expense" && <div className="tx-sub">{tx.category}</div>}
      </div>
      <div className="tx-amount" style={{ color }}>
        {sign}{formatMoney(Math.abs(tx.amount))}
      </div>
      <button onClick={() => onDelete(tx.id)} className="delete-btn" type="button" aria-label="Удалить">
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

function LimitStatus({ target, avail }) {
  const diff = Math.round(target - avail);
  
  if (target === 0 && avail === 0) {
    return <div className="limit-status muted">Лимит: 0 ₽</div>;
  }

  if (diff === 0) {
    return <div className="limit-status" style={{ color: C.inkMuted }}>Лимит выполнен</div>;
  } else if (diff > 0) {
    return <div className="limit-status" style={{ color: C.inkMuted }}>Можно доложить: {formatMoney(diff)}</div>;
  } else {
    // Если Перебор
    return <div className="limit-status" style={{ color: C.danger }}>Перебор: {formatMoney(Math.abs(diff))}</div>;
  }
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
        <Plus size={25} />
      </div>
      <span>{label}</span>
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
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
}) {
  const stats = useMemo(() => categoryStats(transactions, card), [transactions, card]);
  const ordered = useMemo(
    () => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)),
    [categories, stats]
  );

  const balance = balances[card] || 0;
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const spent = card === "sber" ? agg.sberSpent : agg.alfaSpent;
  const monthlyTotals = card === "sber" ? agg.needCatTotals : agg.wantCatTotals;

  // Логика лимитов
  const pct = card === "sber" ? needPctOf(settings) : settings.wantPct;
  const target = agg.incomeTotal * (pct / 100);
  const avail = card === "sber" ? agg.sberAvail : agg.alfaAvail;

  const visible = ordered.slice(0, 8);
  while (visible.length < 8) visible.push(null);

  return (
    <div className="add-panel" style={{ "--accent": accentColor, "--soft": softColor }}>
      <TopAmounts inflow={inflow} outflow={spent} logo={logo} accentColor={accentColor} />

      <div className="carousel-heading">
        <h2>{title}</h2>
        {/* Баланс вместо потраченного */}
        <div className="sum">{formatMoney(balance)}</div>
        {/* Лимит */}
        <LimitStatus target={target} avail={avail} />
      </div>

      <div className="hero-row">
        <button className="side-arrow" disabled={!canPrev} onClick={onPrev} type="button">
          <ChevronLeft size={30} />
        </button>

        <AddBigButton label="Новое" onClick={() => onOpenFull({ type: "expense", card })} />

        <button className="side-arrow" disabled={!canNext} onClick={onNext} type="button">
          <ChevronRight size={30} />
        </button>
      </div>

      <div className="quick-grid">
        {visible.map((cat, i) => {
          if (!cat) return <ListTile key={`empty-${i}`} empty />;

          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);
          const monthAmount = monthlyTotals[cat.name] || 0;
          const showAmount = monthAmount > 0 ? monthAmount : (s?.modalAmount ?? null);

          return (
            <ListTile
              key={cat.name}
              icon={Icon}
              color={cat.color}
              name={cat.name}
              amount={showAmount}
              onClick={() => {
                onOpenFull({
                  type: "expense",
                  card,
                  category: cat.name,
                  amount: s?.modalAmount ?? "",
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function OzonPanel({
  settings,
  transactions,
  balances,
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
  const target = agg.incomeTotal * (settings.savePct / 100);
  const avail = agg.ozonAvail;

  const pct = settings.goal > 0 ? balance / settings.goal : 0;
  const left = settings.goal - balance;
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

  const visibleDays = days.slice(0, 4);
  while (visibleDays.length < 4) visibleDays.push(null);

  return (
    <div className="add-panel" style={{ "--accent": C.ozon, "--soft": C.ozonSoft }}>
      <TopAmounts inflow={agg.ozonInflow} outflow={agg.ozonOutflow} logo="ozon" accentColor={C.ozon} />

      <div className="carousel-heading">
        <h2>Подушка</h2>
        <div className="sum">{formatMoney(balance)}</div>
        <LimitStatus target={target} avail={avail} />
      </div>

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
const EXPENSE_CARDS = [
  { id: "sber", label: "Сбер", sub: "нужды", color: C.sber, soft: C.sberSoft },
  { id: "alfa", label: "Альфа", sub: "развлечения", color: C.alfa, soft: C.alfaSoft },
];

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

function FullAddForm({ settings, initial, onSubmit, onCancel }) {
  const defaultCategoryFor = (card) => {
    const list = card === "alfa" ? settings.wantCats : settings.needCats;
    return list[0]?.name || "";
  };

  const [type, setType] = useState(initial?.type || "expense");
  const [date, setDate] = useState(initial?.date || todayStr());
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [card, setCard] = useState(initial?.card || "sber");
  const [fromCard, setFromCard] = useState(initial?.fromCard || "sber");
  const [toCard, setToCard] = useState(initial?.toCard || "alfa");
  const [category, setCategory] = useState(initial?.category || defaultCategoryFor(initial?.card || "sber"));
  const [note, setNote] = useState(initial?.note || "");
  const [adjustSign, setAdjustSign] = useState("plus");

  useEffect(() => {
    setType(initial?.type || "expense");
    setDate(initial?.date || todayStr());
    setAmount(initial?.amount ?? "");
    setCard(initial?.card || "sber");
    setFromCard(initial?.fromCard || "sber");
    setToCard(initial?.toCard || "alfa");
    setCategory(initial?.category || defaultCategoryFor(initial?.card || "sber"));
    setNote(initial?.note || "");
    setAdjustSign("plus");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (type !== "expense") return;
    const list = card === "alfa" ? settings.wantCats : settings.needCats;
    if (!list.some((c) => c.name === category)) {
      setCategory(list[0]?.name || "");
    }
  }, [type, card, category, settings.needCats, settings.wantCats]);

  const amountNum = Number(amount || 0);
  const categories = card === "alfa" ? settings.wantCats : settings.needCats;

  function submit(e) {
    e.preventDefault();

    if (!amountNum || amountNum <= 0) {
      window.alert("Введите сумму больше 0");
      return;
    }

    if (type === "transfer" && fromCard === toCard) {
      window.alert("Выберите разные карты для перевода");
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
    } else if (type === "adjustment") {
      onSubmit({
        type: "adjustment",
        date,
        amount: adjustSign === "minus" ? -amountNum : amountNum,
        card,
        note: note.trim(),
      });
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-title-row">
        <h2>Новая операция</h2>
        <button type="button" onClick={onCancel} className="icon-button" aria-label="Закрыть">
          <X size={18} />
        </button>
      </div>

      <OperationTabs value={type} onChange={setType} />

      <div className="field">
        <label>Сумма</label>
        <input
          className="amount-input mono"
          inputMode="numeric"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {type === "expense" && (
        <>
          <div className="field">
            <label>Карта</label>
            <CardPicker options={EXPENSE_CARDS} value={card} onChange={setCard} />
          </div>

          <div className="field">
            <label>Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
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
          <div className="field">
            <label>Тип коррекции</label>
            <div className="card-picker">
              <button
                type="button"
                className={`card-picker-item ${adjustSign === "plus" ? "active" : ""}`}
                style={{ "--pick-color": C.sber, "--pick-soft": C.sberSoft }}
                onClick={() => setAdjustSign("plus")}
              >
                <div className="main">Пополнение</div>
              </button>
              <button
                type="button"
                className={`card-picker-item ${adjustSign === "minus" ? "active" : ""}`}
                style={{ "--pick-color": C.danger, "--pick-soft": C.dangerSoft }}
                onClick={() => setAdjustSign("minus")}
              >
                <div className="main">Списание</div>
              </button>
            </div>
          </div>
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
function AddView({ settings, transactions, onAdd }) {
  const [slide, setSlide] = useState(0);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null); // Стейт для модалки дохода

  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);

  const slides = [
    {
      id: "needs",
      title: "Нужды",
      accent: C.sber,
      soft: C.sberSoft,
      logo: "check",
      render: (navProps) => (
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
          onOpenFull={openForm}
          {...navProps}
        />
      ),
    },
    {
      id: "wants",
      title: "Развлечения",
      accent: C.alfa,
      soft: C.alfaSoft,
      logo: "A",
      render: (navProps) => (
        <CategoryPanel
          title="Развлечения"
          accentColor={C.alfa}
          softColor={C.alfaSoft}
          logo="A"
          card="alfa"
          categories={settings.wantCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          onOpenFull={openForm}
          {...navProps}
        />
      ),
    },
    {
      id: "cushion",
      title: "Подушка",
      accent: C.ozon,
      soft: C.ozonSoft,
      logo: "ozon",
      render: (navProps) => (
        <OzonPanel
          settings={settings}
          transactions={transactions}
          balances={balances}
          onOpenFull={openForm}
          {...navProps}
        />
      ),
    },
  ];

  function openForm(initial) {
    setFormInitial(initial || { type: "expense", card: "sber" });
  }

  function closeForm() {
    setFormInitial(null);
  }

  function submit(tx) {
    onAdd(tx);
    // Если это доход — показываем модалку автоматического распределения
    if (tx.type === "income") {
      setNewIncomeTx(tx);
    }
    setFormInitial(null);
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplit(newIncomeTx.amount, settings);
    const sourceCard = newIncomeTx.card;
    const date = newIncomeTx.date;

    // Авто-создание переводов на нужные суммы (из той карты, куда зачислили доход)
    if (sourceCard !== "sber" && split.toSber > 0) {
      onAdd({ type: "transfer", date, amount: Math.round(split.toSber), fromCard: sourceCard, toCard: "sber", note: "Авто-распределение" });
    }
    if (sourceCard !== "alfa" && split.toAlfa > 0) {
      onAdd({ type: "transfer", date, amount: Math.round(split.toAlfa), fromCard: sourceCard, toCard: "alfa", note: "Авто-распределение" });
    }
    if (sourceCard !== "ozon" && split.toOzon > 0) {
      onAdd({ type: "transfer", date, amount: Math.round(split.toOzon), fromCard: sourceCard, toCard: "ozon", note: "Авто-распределение" });
    }

    setNewIncomeTx(null);
  }

  const current = slides[slide];
  const canPrev = slide > 0;
  const canNext = slide < slides.length - 1;

  function go(delta) {
    setSlide((v) => Math.max(0, Math.min(slides.length - 1, v + delta)));
    setFormInitial(null);
  }

  if (formInitial) {
    return (
      <div className="screen-stack">
        <FullAddForm
          settings={settings}
          initial={formInitial}
          onSubmit={submit}
          onCancel={closeForm}
        />
      </div>
    );
  }

  return (
    <div className="screen-stack">
      {/* Модальное окно распределения дохода */}
      {newIncomeTx && (
        <IncomeDistributionModal 
          incomeTx={newIncomeTx}
          settings={settings}
          onDistribute={handleAutoDistribute}
          onClose={() => setNewIncomeTx(null)}
        />
      )}

      {current.render({
        canPrev,
        canNext,
        onPrev: () => go(-1),
        onNext: () => go(1),
      })}

      <div className="dots" style={{ "--accent": current.accent }}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            className={`dot ${i === slide ? "active" : ""}`}
            type="button"
            onClick={() => {
              setSlide(i);
              setFormInitial(null);
            }}
            aria-label={s.title}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================ Analysis */
function AnalysisView({
  settings,
  transactions,
  selectedMonth,
  setSelectedMonth,
  onDelete,
  onToggleInclude,
  goToAdd,
}) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const balances = useMemo(
    () => computeBalances(transactions, settings, endOfMonthStr(selectedMonth)),
    [transactions, settings, selectedMonth]
  );

  const totalBalance = ["sber", "alfa", "ozon"].reduce((sum, key) => {
    if (!settings.includeInTotal?.[key]) return sum;
    return sum + (balances[key] || 0);
  }, 0);

  const chartData = [
    { name: "Нужды", value: agg.sberSpent, fill: C.sber },
    { name: "Развлеч.", value: agg.alfaSpent, fill: C.alfa },
    { name: "Подушка", value: Math.max(0, agg.ozonNet), fill: C.ozon },
  ];

  const monthItems = agg.items;

  return (
    <div className="screen-stack">
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <PaydayReminder settings={settings} transactions={transactions} />

      <TotalBalanceCard total={totalBalance} settings={settings} onToggle={onToggleInclude} />

      <div className="stat-grid">
        <StatBox label="Доход" value={`+${formatMoney(agg.incomeTotal)}`} color={C.sber} />
        <StatBox label="Расходы" value={`−${formatMoney(agg.sberSpent + agg.alfaSpent)}`} color={C.danger} />
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
        role={`Развлечения · ${settings.wantPct}%`}
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
        {monthItems.length === 0 ? (
          <EmptyState onAdd={goToAdd} />
        ) : (
          <div className="history-list">
            {monthItems.map((tx) => (
              <TxRow key={tx.id} tx={tx} onDelete={onDelete} />
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

function SettingsView({ settings, onSave, onWipeAll }) {
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
            <label>Развлечения, %</label>
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
        <SectionTitle>Категории развлечений</SectionTitle>
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
function TabBar({ tab, setTab }) {
  const items = [
    { id: "add", label: "Добавить", icon: Plus, cls: "add" },
    { id: "analysis", label: "Анализ", icon: BarChart3, cls: "" },
    { id: "settings", label: "Настройки", icon: SettingsIcon, cls: "" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            type="button"
            className={`nav-btn ${it.cls} ${tab === it.id ? "active" : ""}`}
            onClick={() => setTab(it.id)}
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
  const [tab, setTab] = useState("add");
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);

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
          </header>

          <main className="app-main">
            {tab === "add" && (
              <AddView
                settings={settings}
                transactions={transactions}
                onAdd={addTransaction}
              />
            )}

            {tab === "analysis" && (
              <AnalysisView
                settings={settings}
                transactions={transactions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onDelete={deleteTransaction}
                onToggleInclude={toggleIncludeInTotal}
                goToAdd={() => setTab("add")}
              />
            )}

            {tab === "settings" && (
              <SettingsView
                settings={settings}
                onSave={persistSettings}
                onWipeAll={() => persistTransactions([])}
              />
            )}
          </main>

          <TabBar tab={tab} setTab={setTab} />
          <Toast text={toast} />
        </div>
      </div>
    </>
  );
}
```
