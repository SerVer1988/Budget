import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Plus, PiggyBank, BarChart3, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Wallet, X, ArrowUp, ArrowDown,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, ChevronRight as ChevronRightIcon
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
  sberSoft: "#E8F0E4", // Обновленный нежно-зеленый
  alfa: "#D6362B",
  alfaSoft: "#F6E4E2", // Обновленный пудровый
  ozon: "#1268C9",
  ozonSoft: "#E4F0F6", // Обновленный нежно-голубой
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
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal,
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
  { name: "Кино/досуг", icon: "Film", color: "#7C6FC4" },
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
    sberAvail: sberD.avail, alfaAvail: alfaD.avail, ozonAvail: ozonD.avail,
    sberInflow: sberD.inflow, alfaInflow: alfaD.inflow, ozonInflow: ozonD.inflow,
    sberOutflow: sberD.outflow, alfaOutflow: alfaD.outflow, ozonOutflow: ozonD.outflow,
    sberSpent: sberD.spent, alfaSpent: alfaD.spent, ozonSpent: ozonD.spent,
    sberNet: sberD.net, alfaNet: alfaD.net, ozonNet: ozonD.net,
    needCatTotals, wantCatTotals, items,
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
    let count = 0; let modalAmount = null; let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) { modalCount = c; modalAmount = Number(amtStr); }
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
    let count = 0; let modalAmount = null; let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) { modalCount = c; modalAmount = Number(amtStr); }
    });
    result[day] = { count, modalAmount };
  });
  return result;
}

function estimateMonthlyRate(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey; let sum = 0; let count = 0;
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
      if (Math.round(s.toAlfa) > 0) {
        out.push({ id: uid(), type: "transfer", date: t.date, amount: Math.round(s.toAlfa), fromCard: "sber", toCard: "alfa", note: "Авто-перенос" });
      }
      if (Math.round(s.toOzon) > 0) {
        out.push({ id: uid(), type: "transfer", date: t.date, amount: Math.round(s.toOzon), fromCard: "sber", toCard: "ozon", note: "Авто-перенос" });
      }
      return;
    }
    out.push(t);
  });
  return out;
}

/* ============================================================ Decorative Leaf Icon */
function LeafIcon({ flipped, color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: flipped ? 'scaleX(-1)' : 'none', opacity: 0.65 }}>
      <path d="M2 22s5-4 5-11c0-5 3-7 10-7 0 0-4 4-4 11 0 5-3 7-11 7z"/>
    </svg>
  );
}

/* ============================================================ CSS */
function AppStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { width: 100%; min-height: 100%; margin: 0; overflow-x: hidden; background: ${C.bg}; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: ${C.ink}; }
      button, input, select, textarea { font: inherit; max-width: 100%; }
      button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; cursor: pointer; }

      .app-viewport { width: 100%; min-height: 100svh; background: ${C.bg}; color: ${C.ink}; overflow-x: hidden; }
      .app-shell { width: 100%; max-width: 430px; min-height: 100svh; margin: 0 auto; display: flex; flex-direction: column; position: relative; overflow-x: hidden; }
      .app-header { flex: 0 0 auto; padding: calc(10px + env(safe-area-inset-top)) 14px 6px; }
      .app-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .app-title { font-size: 18px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; }
      .app-date { font-size: 12px; color: ${C.inkMuted}; white-space: nowrap; }
      
      .app-main { flex: 1 1 auto; min-height: 0; width: 100%; padding: 8px 12px calc(94px + env(safe-area-inset-bottom)); overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
      .app-main::-webkit-scrollbar { width: 0; height: 0; }
      .screen-stack { display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 0; }

      .soft-card { width: 100%; min-width: 0; border: 1px solid ${C.border}; background: ${C.surface}; border-radius: 18px; box-shadow: 0 8px 20px rgba(22, 32, 27, 0.05); }
      .panel { border: 1px solid ${C.border}; background: ${C.surface}; border-radius: 18px; padding: 14px; width: 100%; min-width: 0; }
      
      .muted { color: ${C.inkMuted}; }
      .mono { font-variant-numeric: tabular-nums; }
      .section-title { font-size: 12px; font-weight: 700; color: ${C.ink}; margin: 12px 2px 8px; }

      .month-nav { display: grid; grid-template-columns: 42px minmax(0, 1fr) 42px; align-items: center; gap: 8px; width: 100%; }
      .month-nav button { width: 42px; height: 40px; border-radius: 13px; border: 1px solid ${C.border}; background: ${C.surface}; color: ${C.ink}; display: flex; align-items: center; justify-content: center; }
      .month-label { text-align: center; font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ==== CAROUSEL ==== */
      .add-panel {
        width: 100%; min-width: 0;
        border-radius: 24px; padding: 14px 10px 14px; overflow: hidden;
        background-color: var(--panel-bg);
      }
      
      .add-top { display: grid; grid-template-columns: minmax(0, 1fr) 50px minmax(0, 1fr); align-items: center; gap: 8px; margin-bottom: 8px; }
      .amount-mini { min-width: 0; text-align: left; }
      .amount-mini.right { text-align: right; }
      .amount-mini span { display: block; font-size: 11px; font-weight: 700; color: ${C.ink}; margin-bottom: 2px; }
      .amount-mini b { display: block; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      
      .bank-badge {
        width: 48px; height: 48px; border-radius: 999px; background: var(--accent); color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;
        border: 3px solid rgba(255,255,255,0.7); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .carousel-heading { text-align: center; margin: 4px 0 14px; }
      .carousel-heading-inner { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 2px; }
      .carousel-heading h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: ${C.ink}; }
      .carousel-heading .sum { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; color: ${C.ink}; }
      .limit-status { font-size: 12px; margin-top: 4px; font-weight: 700; }

      .hero-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 34px; align-items: center; gap: 8px; margin-bottom: 16px; }
      .side-arrow { width: 34px; height: 48px; border: 0; background: transparent; color: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
      .side-arrow:disabled { opacity: 0.15; }

      .big-add {
        width: 170px; height: 90px; margin: 0 auto;
        border-radius: 20px; background: #ffffff; border: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.06);
      }
      .big-add .plus-circle {
        width: 40px; height: 40px; border-radius: 50%;
        border: 1.5px dashed var(--accent); color: var(--accent);
        display: flex; align-items: center; justify-content: center;
      }
      .big-add span { font-size: 13px; font-weight: 700; color: var(--accent); }

      /* ==== HORIZONTAL LIST TILES ==== */
      .quick-grid { width: 100%; min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .quick-tile {
        display: flex; flex-direction: row; align-items: center; text-align: left;
        padding: 10px 8px; border-radius: 18px; background: #ffffff; border: none;
        box-shadow: 0 4px 10px rgba(0,0,0,0.04); gap: 10px; min-height: 70px; min-width: 0;
      }
      .quick-tile.empty { background: rgba(255,255,255,0.4); border: 1px dashed rgba(0,0,0,0.1); box-shadow: none; }
      .quick-icon {
        width: 44px; height: 44px; flex: 0 0 auto; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.03);
      }
      .quick-text { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 1px; }
      .quick-name { font-size: 12px; font-weight: 700; color: ${C.inkMuted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .quick-amount { font-size: 14px; font-weight: 800; color: ${C.ink}; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .quick-chevron { color: #C0C8C2; flex-shrink: 0; }

      .dots { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 12px 0 0; }
      .dot { width: 7px; height: 7px; border: 0; border-radius: 999px; background: rgba(0,0,0,0.1); padding: 0; }
      .dot.active { background: var(--accent); }

      /* ==== MODAL ==== */
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(22, 32, 27, 0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
      .modal-card { background: ${C.surface}; border-radius: 28px; padding: 24px; width: 100%; max-width: 360px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2); animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

      /* ==== FORMS & SETTINGS ==== */
      .form-card { border: 1px solid ${C.border}; background: ${C.surface}; border-radius: 20px; padding: 14px; width: 100%; min-width: 0; }
      .form-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
      .form-title-row h2 { margin: 0; font-size: 18px; line-height: 1.2; font-weight: 800; }
      .icon-button { width: 36px; height: 36px; border-radius: 12px; border: 1px solid ${C.border}; background: ${C.surface2}; display: flex; align-items: center; justify-content: center; color: ${C.inkMuted}; }
      .operation-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; padding: 4px; border: 1px solid ${C.border}; background: ${C.surface2}; border-radius: 15px; margin-bottom: 12px; }
      .operation-tabs button { min-width: 0; height: 34px; border: 0; border-radius: 11px; background: transparent; color: ${C.inkMuted}; font-size: 11px; font-weight: 700; }
      .operation-tabs button.active { background: ${C.ink}; color: #fff; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 11px; min-width: 0; }
      .field label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: ${C.inkMuted}; }
      .field input, .field select { width: 100%; height: 44px; border: 1px solid ${C.border}; background: ${C.surface2}; border-radius: 14px; color: ${C.ink}; padding: 0 12px; outline: none; }
      .field input.amount-input { height: 54px; font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
      .form-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
      
      .button-row { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 4px; }
      .btn { height: 44px; border-radius: 14px; border: 1px solid ${C.border}; background: ${C.surface2}; color: ${C.ink}; font-weight: 800; }
      .btn.primary { background: ${C.ink}; border-color: ${C.ink}; color: #fff; }

      .toast { position: fixed; left: 50%; bottom: calc(84px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 60; border-radius: 999px; padding: 10px 14px; background: ${C.ink}; color: #fff; display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; box-shadow: 0 12px 26px rgba(22,32,27,0.2); }
      .notice { border-radius: 16px; padding: 12px; font-size: 12px; line-height: 1.4; border: 1px solid ${C.amber}; background: ${C.amberSoft}; color: #8A5A15; margin-bottom: 12px; }

      .bottom-nav { position: fixed; left: 50%; bottom: max(10px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(calc(100vw - 24px), 406px); z-index: 30; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 8px; border: 1px solid ${C.border}; border-radius: 22px; background: rgba(255,255,255,0.94); box-shadow: 0 12px 28px rgba(22, 32, 27, 0.13); backdrop-filter: blur(10px); }
      .nav-btn { height: 54px; border: 1px solid ${C.border}; border-radius: 16px; background: ${C.surface}; color: ${C.inkMuted}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 700; }
      .nav-btn.active { background: ${C.sberSoft}; color: ${C.ink}; border-color: ${C.border}; }

      .card-picker { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 7px; margin-bottom: 11px; }
      .card-picker-item { min-width: 0; border: 1px solid ${C.border}; background: ${C.surface}; border-radius: 15px; padding: 9px 6px; text-align: center; color: ${C.ink}; }
      .card-picker-item.active { border-color: var(--pick-color); background: var(--pick-soft); }
      .card-picker-item .main { font-size: 12px; font-weight: 800; }
      
      .history-list { border: 1px solid ${C.border}; border-radius: 18px; background: ${C.surface}; padding: 4px 12px; }
      .tx-row { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
      .tx-row:last-child { border-bottom: 0; }
      .tx-day { width: 24px; text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; color: ${C.inkMuted}; }
      .tx-dot { width: 7px; height: 7px; border-radius: 999px; }
      .tx-main { flex: 1; min-width: 0; }
      .tx-label { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tx-amount { font-size: 12px; font-weight: 900; }
      .delete-btn { width: 30px; height: 30px; border: 0; background: transparent; color: ${C.inkMuted}; display: flex; align-items: center; justify-content: center; }

      @media (max-width: 360px) {
        .app-main { padding-left: 9px; padding-right: 9px; }
        .add-panel { padding: 12px 9px; }
        .carousel-heading h2 { font-size: 24px; }
        .quick-grid { gap: 8px; }
        .quick-tile { padding: 8px; gap: 8px; min-height: 66px; }
        .quick-icon { width: 38px; height: 38px; }
        .bottom-nav { width: calc(100vw - 16px); gap: 6px; padding: 7px; }
      }
    `}</style>
  );
}

/* ============================================================ UI Parts */
function SectionTitle({ children }) { return <div className="section-title">{children}</div>; }

function MonthNav({ value, onChange }) {
  return (
    <div className="month-nav">
      <button onClick={() => onChange(shiftMonth(value, -1))} type="button"><ChevronLeft size={17} /></button>
      <div className="month-label">{monthLabel(value)}</div>
      <button onClick={() => onChange(shiftMonth(value, 1))} type="button"><ChevronRight size={17} /></button>
    </div>
  );
}

function PaydayReminder({ settings, transactions }) {
  const today = todayStr();
  const day = dayOfMonth(today);
  if (!settings.reminderDays.includes(day)) return null;

  const todayIncome = transactions.filter((t) => t.type === "income" && t.date === today).reduce((sum, t) => sum + t.amount, 0);
  if (todayIncome <= 0) {
    return (
      <div className="notice">
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Сегодня день выплаты</div>
        <div>Занесите доход — приложение поможет распределить переводы в Альфа и Озон.</div>
      </div>
    );
  }
  const split = computeIncomeSplit(todayIncome, settings);
  const needPct = needPctOf(settings);
  return (
    <div className="notice">
      <div style={{ fontWeight: 800, marginBottom: 4 }}>Не забудьте сделать переводы</div>
      <div>
        Из {formatMoney(todayIncome)}: {formatMoney(split.toAlfa)} в Альфа, {formatMoney(split.toOzon)} в Озон. Остальное ({needPct}%) остаётся на Нужды.
      </div>
    </div>
  );
}

/* ============================================================ Income Modal & Limits */
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
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: C.ink }}>Поступило {formatMoney(incomeTx.amount)}</h3>
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
  if (target === 0 && avail === 0) return <div className="limit-status muted">Лимит: 0 ₽</div>;
  if (diff === 0) return <div className="limit-status" style={{ color: C.inkMuted }}>Лимит выполнен</div>;
  if (diff > 0) return <div className="limit-status" style={{ color: C.inkMuted }}>Можно доложить: {formatMoney(diff)}</div>;
  return <div className="limit-status" style={{ color: C.danger }}>Перебор: {formatMoney(Math.abs(diff))}</div>;
}

/* ============================================================ Carousel Parts */
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
      <div className="amount-mini"><span>Пришло:</span><b style={{ color: C.sber }}>+{formatMoney(Math.abs(inflow))}</b></div>
      <BankBadge label={logo} accentColor={accentColor} />
      <div className="amount-mini right"><span>Ушло:</span><b style={{ color: C.danger }}>−{formatMoney(Math.abs(outflow))}</b></div>
    </div>
  );
}

function AddBigButton({ label, onClick, accent }) {
  return (
    <button onClick={onClick} className="big-add" style={{ "--accent": accent }} type="button">
      <div className="plus-circle"><Plus size={24} /></div>
      <span>{label}</span>
    </button>
  );
}

// Новая горизонтальная плитка (Текст сбоку от иконки)
function ListTile({ icon: Icon, color, name, amount, onClick, empty }) {
  if (empty) {
    return (
      <div className="quick-tile empty">
        <div className="quick-icon" />
        <div className="quick-text"><div className="quick-name">Свободно</div></div>
      </div>
    );
  }
  return (
    <button onClick={onClick} className="quick-tile" type="button">
      <div className="quick-icon" style={{ background: color + "22" }}><Icon size={22} style={{ color }} /></div>
      <div className="quick-text">
        <div className="quick-name">{name}</div>
        <div className="quick-amount">{amount != null ? formatMoney(amount) : "—"}</div>
      </div>
      <ChevronRightIcon size={16} className="quick-chevron" />
    </button>
  );
}

function CategoryPanel({ title, accentColor, softColor, logo, card, categories, transactions, settings, balances, canPrev, canNext, onPrev, onNext, onOpenFull }) {
  const stats = useMemo(() => categoryStats(transactions, card), [transactions, card]);
  const ordered = useMemo(() => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)), [categories, stats]);
  const balance = balances[card] || 0;
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const spent = card === "sber" ? agg.sberSpent : agg.alfaSpent;
  const monthlyTotals = card === "sber" ? agg.needCatTotals : agg.wantCatTotals;
  const pct = card === "sber" ? needPctOf(settings) : settings.wantPct;
  const target = agg.incomeTotal * (pct / 100);
  const avail = card === "sber" ? agg.sberAvail : agg.alfaAvail;

  const visible = ordered.slice(0, 8);
  while (visible.length < 8) visible.push(null);

  return (
    <div className="add-panel" style={{ "--panel-bg": softColor }}>
      <TopAmounts inflow={inflow} outflow={spent} logo={logo} accentColor={accentColor} />

      <div className="carousel-heading">
        <div className="carousel-heading-inner">
          <LeafIcon color={accentColor} />
          <h2>{title}</h2>
          <LeafIcon flipped color={accentColor} />
        </div>
        <div className="sum">{formatMoney(balance)}</div>
        <LimitStatus target={target} avail={avail} />
      </div>

      <div className="hero-row">
        <button className="side-arrow" disabled={!canPrev} onClick={onPrev} type="button"><ChevronLeft size={34} /></button>
        <AddBigButton label="Новое" accent={accentColor} onClick={() => onOpenFull({ type: "expense", card })} />
        <button className="side-arrow" disabled={!canNext} onClick={onNext} type="button"><ChevronRight size={34} /></button>
      </div>

      <div className="quick-grid">
        {visible.map((cat, i) => {
          if (!cat) return <ListTile key={`empty-${i}`} empty />;
          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);
          const monthAmount = monthlyTotals[cat.name] || 0;
          const showAmount = monthAmount > 0 ? monthAmount : (s?.modalAmount ?? null);
          return (
            <ListTile key={cat.name} icon={Icon} color={cat.color} name={cat.name} amount={showAmount}
              onClick={() => onOpenFull({ type: "expense", card, category: cat.name, amount: s?.modalAmount ?? "" })} />
          );
        })}
      </div>
    </div>
  );
}

function OzonPanel({ settings, transactions, balances, canPrev, canNext, onPrev, onNext, onOpenFull }) {
  const dayStats = useMemo(() => ozonDayStats(transactions), [transactions]);
  const days = settings.reminderDays.length ? settings.reminderDays : [5, 15, 30];
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const balance = balances.ozon || 0;
  const target = agg.incomeTotal * (settings.savePct / 100);
  const avail = agg.ozonAvail;

  const visibleDays = days.slice(0, 8);
  while (visibleDays.length < 8) visibleDays.push(null);

  return (
    <div className="add-panel" style={{ "--panel-bg": C.ozonSoft }}>
      <TopAmounts inflow={agg.ozonInflow} outflow={agg.ozonOutflow} logo="ozon" accentColor={C.ozon} />

      <div className="carousel-heading">
        <div className="carousel-heading-inner">
          <LeafIcon color={C.ozon} />
          <h2>Подушка</h2>
          <LeafIcon flipped color={C.ozon} />
        </div>
        <div className="sum">{formatMoney(balance)}</div>
        <LimitStatus target={target} avail={avail} />
      </div>

      <div className="hero-row">
        <button className="side-arrow" disabled={!canPrev} onClick={onPrev} type="button"><ChevronLeft size={34} /></button>
        <AddBigButton label="Перевод" accent={C.ozon} onClick={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon" })} />
        <button className="side-arrow" disabled={!canNext} onClick={onNext} type="button"><ChevronRight size={34} /></button>
      </div>

      <div className="quick-grid">
        {visibleDays.map((d, i) => {
          if (!d) return <ListTile key={`empty-day-${i}`} empty />;
          const s = dayStats[d];
          return (
            <ListTile key={d} icon={PiggyBank} color={C.ozon} name={`${d} числа`} amount={s?.modalAmount ?? null}
              onClick={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon", amount: s?.modalAmount ?? "" })} />
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ Forms */
const EXPENSE_CARDS = [{ id: "sber", label: "Сбер", sub: "нужды", color: C.sber, soft: C.sberSoft }, { id: "alfa", label: "Альфа", sub: "развлечения", color: C.alfa, soft: C.alfaSoft }];
const ALL_CARDS = [{ id: "sber", label: "Сбер", color: C.sber, soft: C.sberSoft }, { id: "alfa", label: "Альфа", color: C.alfa, soft: C.alfaSoft }, { id: "ozon", label: "Озон", color: C.ozon, soft: C.ozonSoft }];

function CardPicker({ options, value, onChange }) {
  return (
    <div className="card-picker">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={`card-picker-item ${value === o.id ? "active" : ""}`} style={{ "--pick-color": o.color, "--pick-soft": o.soft }}>
          <div className="main" style={{ color: value === o.id ? o.color : C.ink }}>{o.label}</div>
          {o.sub && <div className="sub">{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

function OperationTabs({ value, onChange }) {
  const tabs = [{ id: "expense", label: "Трата" }, { id: "income", label: "Доход" }, { id: "transfer", label: "Перевод" }, { id: "adjustment", label: "Коррекция" }];
  return (
    <div className="operation-tabs">
      {tabs.map((t) => <button key={t.id} type="button" className={value === t.id ? "active" : ""} onClick={() => onChange(t.id)}>{t.label}</button>)}
    </div>
  );
}

function FullAddForm({ settings, initial, onSubmit, onCancel }) {
  const defaultCategoryFor = (card) => { const list = card === "alfa" ? settings.wantCats : settings.needCats; return list[0]?.name || ""; };
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
    setType(initial?.type || "expense"); setDate(initial?.date || todayStr()); setAmount(initial?.amount ?? ""); setCard(initial?.card || "sber");
    setFromCard(initial?.fromCard || "sber"); setToCard(initial?.toCard || "alfa"); setCategory(initial?.category || defaultCategoryFor(initial?.card || "sber"));
    setNote(initial?.note || ""); setAdjustSign("plus");
  }, [initial]);

  useEffect(() => {
    if (type !== "expense") return;
    const list = card === "alfa" ? settings.wantCats : settings.needCats;
    if (!list.some((c) => c.name === category)) setCategory(list[0]?.name || "");
  }, [type, card, category, settings.needCats, settings.wantCats]);

  const amountNum = Number(amount || 0);
  function submit(e) {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return window.alert("Введите сумму больше 0");
    if (type === "transfer" && fromCard === toCard) return window.alert("Выберите разные карты");
    if (type === "income") onSubmit({ type: "income", date, amount: amountNum, card, note: note.trim() });
    else if (type === "expense") onSubmit({ type: "expense", date, amount: amountNum, card, category, note: note.trim() });
    else if (type === "transfer") onSubmit({ type: "transfer", date, amount: amountNum, fromCard, toCard, note: note.trim() });
    else if (type === "adjustment") onSubmit({ type: "adjustment", date, amount: adjustSign === "minus" ? -amountNum : amountNum, card, note: note.trim() });
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-title-row"><h2>Новая операция</h2><button type="button" onClick={onCancel} className="icon-button"><X size={18} /></button></div>
      <OperationTabs value={type} onChange={setType} />
      <div className="field"><label>Сумма</label><input className="amount-input mono" inputMode="numeric" type="number" min="0" step="1" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="field"><label>Дата</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      {type === "expense" && (
        <><div className="field"><label>Карта</label><CardPicker options={EXPENSE_CARDS} value={card} onChange={setCard} /></div>
          <div className="field"><label>Категория</label><select value={category} onChange={(e) => setCategory(e.target.value)}>{(card === "alfa" ? settings.wantCats : settings.needCats).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div></>
      )}
      {type === "income" && <div className="field"><label>Куда пришёл доход</label><CardPicker options={ALL_CARDS} value={card} onChange={setCard} /></div>}
      {type === "transfer" && (
        <div className="form-grid-2">
          <div className="field"><label>Откуда</label><select value={fromCard} onChange={(e) => setFromCard(e.target.value)}>{ALL_CARDS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div className="field"><label>Куда</label><select value={toCard} onChange={(e) => setToCard(e.target.value)}>{ALL_CARDS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        </div>
      )}
      {type === "adjustment" && (
        <><div className="field"><label>Карта</label><CardPicker options={ALL_CARDS} value={card} onChange={setCard} /></div>
          <div className="field"><label>Тип коррекции</label>
            <div className="card-picker">
              <button type="button" className={`card-picker-item ${adjustSign === "plus" ? "active" : ""}`} style={{ "--pick-color": C.sber, "--pick-soft": C.sberSoft }} onClick={() => setAdjustSign("plus")}><div className="main">Пополнение</div></button>
              <button type="button" className={`card-picker-item ${adjustSign === "minus" ? "active" : ""}`} style={{ "--pick-color": C.danger, "--pick-soft": C.dangerSoft }} onClick={() => setAdjustSign("minus")}><div className="main">Списание</div></button>
            </div>
          </div></>
      )}
      <div className="field"><label>Заметка</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" /></div>
      <div className="button-row"><button type="button" onClick={onCancel} className="btn">Отмена</button><button type="submit" className="btn primary">Сохранить</button></div>
    </form>
  );
}

/* ============================================================ Views */
function AddView({ settings, transactions, onAdd }) {
  const [slide, setSlide] = useState(0);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null);
  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);

  const slides = [
    { id: "needs", title: "Нужды", accent: C.sber, soft: C.sberSoft, logo: "check", render: (p) => <CategoryPanel title="Нужды" accentColor={C.sber} softColor={C.sberSoft} logo="check" card="sber" categories={settings.needCats} transactions={transactions} settings={settings} balances={balances} onOpenFull={setFormInitial} {...p} /> },
    { id: "wants", title: "Досуг", accent: C.alfa, soft: C.alfaSoft, logo: "A", render: (p) => <CategoryPanel title="Досуг" accentColor={C.alfa} softColor={C.alfaSoft} logo="A" card="alfa" categories={settings.wantCats} transactions={transactions} settings={settings} balances={balances} onOpenFull={setFormInitial} {...p} /> },
    { id: "cushion", title: "Подушка", accent: C.ozon, soft: C.ozonSoft, logo: "ozon", render: (p) => <OzonPanel settings={settings} transactions={transactions} balances={balances} onOpenFull={setFormInitial} {...p} /> },
  ];

  function submit(tx) {
    onAdd(tx);
    if (tx.type === "income") setNewIncomeTx(tx);
    setFormInitial(null);
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplit(newIncomeTx.amount, settings);
    const sourceCard = newIncomeTx.card;
    const date = newIncomeTx.date;
    if (sourceCard !== "sber" && split.toSber > 0) onAdd({ type: "transfer", date, amount: Math.round(split.toSber), fromCard: sourceCard, toCard: "sber", note: "Авто-распределение" });
    if (sourceCard !== "alfa" && split.toAlfa > 0) onAdd({ type: "transfer", date, amount: Math.round(split.toAlfa), fromCard: sourceCard, toCard: "alfa", note: "Авто-распределение" });
    if (sourceCard !== "ozon" && split.toOzon > 0) onAdd({ type: "transfer", date, amount: Math.round(split.toOzon), fromCard: sourceCard, toCard: "ozon", note: "Авто-распределение" });
    setNewIncomeTx(null);
  }

  const current = slides[slide];
  if (formInitial) return <div className="screen-stack"><FullAddForm settings={settings} initial={formInitial} onSubmit={submit} onCancel={() => setFormInitial(null)} /></div>;

  return (
    <div className="screen-stack">
      {newIncomeTx && <IncomeDistributionModal incomeTx={newIncomeTx} settings={settings} onDistribute={handleAutoDistribute} onClose={() => setNewIncomeTx(null)} />}
      {current.render({ canPrev: slide > 0, canNext: slide < slides.length - 1, onPrev: () => setSlide((v) => Math.max(0, v - 1)), onNext: () => setSlide((v) => Math.min(slides.length - 1, v + 1)) })}
      <div className="dots" style={{ "--accent": current.accent }}>
        {slides.map((s, i) => <button key={s.id} className={`dot ${i === slide ? "active" : ""}`} type="button" onClick={() => setSlide(i)} aria-label={s.title} />)}
      </div>
    </div>
  );
}

function AnalysisView({ settings, transactions, selectedMonth, setSelectedMonth, onDelete, onToggleInclude, goToAdd }) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const balances = useMemo(() => computeBalances(transactions, settings, endOfMonthStr(selectedMonth)), [transactions, settings, selectedMonth]);
  const totalBalance = ["sber", "alfa", "ozon"].reduce((sum, key) => settings.includeInTotal?.[key] ? sum + (balances[key] || 0) : sum, 0);

  return (
    <div className="screen-stack">
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <TotalBalanceCard total={totalBalance} settings={settings} onToggle={onToggleInclude} />
      <div className="stat-grid">
        <StatBox label="Доход" value={`+${formatMoney(agg.incomeTotal)}`} color={C.sber} />
        <StatBox label="Расходы" value={`−${formatMoney(agg.sberSpent + agg.alfaSpent)}`} color={C.danger} />
      </div>
      <div>
        <SectionTitle>Операции месяца</SectionTitle>
        {agg.items.length === 0 ? <EmptyState onAdd={goToAdd} /> : <div className="history-list">{agg.items.map((tx) => <TxRow key={tx.id} tx={tx} onDelete={onDelete} />)}</div>}
      </div>
    </div>
  );
}

function CategoryRow({ cat, onChange, onDelete }) {
  const Icon = getIcon(cat.icon);
  return (
    <div className="tx-row">
      <div className="quick-icon" style={{ width: 38, height: 38, background: cat.color + "22" }}><Icon size={18} style={{ color: cat.color }} /></div>
      <div className="tx-main"><input value={cat.name} onChange={(e) => onChange({ ...cat, name: e.target.value })} style={{ width: "100%", height: 34, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 10px", background: C.surface2, color: C.ink }} /></div>
      <button onClick={onDelete} className="delete-btn" type="button"><Trash2 size={14} /></button>
    </div>
  );
}

function SettingsView({ settings, onSave, onWipeAll }) {
  const [draft, setDraft] = useState(settings);
  const [daysText, setDaysText] = useState((settings.reminderDays || []).join(", "));
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(settings); setDaysText((settings.reminderDays || []).join(", ")); }, [settings]);

  function save() {
    const reminderDays = daysText.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => Number.isFinite(x) && x >= 1 && x <= 31);
    const n = (v) => { const num = Number(v); return Number.isFinite(num) ? num : 0; };
    const next = { ...draft, wantPct: n(draft.wantPct), savePct: n(draft.savePct), goal: n(draft.goal), reminderDays, openingBalance: { sber: n(draft.openingBalance?.sber), alfa: n(draft.openingBalance?.alfa), ozon: n(draft.openingBalance?.ozon) } };
    onSave(next); setSaved(true); setTimeout(() => setSaved(false), 1300);
  }

  return (
    <div className="screen-stack pb-8">
      <div className="panel">
        <SectionTitle>Правило распределения</SectionTitle>
        <div className="form-grid-2">
          <div className="field"><label>Досуг, %</label><input type="number" value={draft.wantPct} onChange={(e) => setDraft({ ...draft, wantPct: e.target.value })} /></div>
          <div className="field"><label>Подушка, %</label><input type="number" value={draft.savePct} onChange={(e) => setDraft({ ...draft, savePct: e.target.value })} /></div>
        </div>
        <div className="notice" style={{ marginBottom: 12 }}>На нужды остаётся {needPctOf({ ...draft, wantPct: Number(draft.wantPct), savePct: Number(draft.savePct) })}% дохода.</div>
        <div className="field"><label>Дни напоминаний</label><input value={daysText} onChange={(e) => setDaysText(e.target.value)} placeholder="5, 15, 30" /></div>
      </div>
      <div className="panel">
        <SectionTitle>Начальные балансы</SectionTitle>
        <div className="form-grid-2">
          <div className="field"><label>Сбер</label><input type="number" value={draft.openingBalance?.sber ?? 0} onChange={(e) => setDraft({ ...draft, openingBalance: { ...draft.openingBalance, sber: e.target.value } })} /></div>
          <div className="field"><label>Альфа</label><input type="number" value={draft.openingBalance?.alfa ?? 0} onChange={(e) => setDraft({ ...draft, openingBalance: { ...draft.openingBalance, alfa: e.target.value } })} /></div>
        </div>
        <div className="field"><label>Озон</label><input type="number" value={draft.openingBalance?.ozon ?? 0} onChange={(e) => setDraft({ ...draft, openingBalance: { ...draft.openingBalance, ozon: e.target.value } })} /></div>
      </div>
      <div className="button-row">
        <button className="btn primary" type="button" onClick={save}>{saved ? "Сохранено" : "Сохранить"}</button>
        <button className="btn" type="button" style={{ color: C.danger }} onClick={() => { if (window.confirm("Удалить все операции? Настройки останутся.")) onWipeAll(); }}>Очистить</button>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const items = [{ id: "add", label: "Добавить", icon: Plus }, { id: "analysis", label: "Анализ", icon: BarChart3 }, { id: "settings", label: "Настройки", icon: SettingsIcon }];
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button key={it.id} type="button" className={`nav-btn ${tab === it.id ? "active" : ""}`} onClick={() => setTab(it.id)}>
            <Icon /><span>{it.label}</span>
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
      let s = DEFAULT_SETTINGS; let t = [];
      try { const r = await storage.get("settings"); if (r && r.value) s = migrateSettings(JSON.parse(r.value)); } catch (e) {}
      try { const r = await storage.get("transactions"); if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s); } catch (e) {}
      if (alive) { setSettings(s); setTransactions(t); setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  async function persistTransactions(next) { setTransactions(next); try { await storage.set("transactions", JSON.stringify(next)); } catch (e) {} }
  async function persistSettings(next) { setSettings(next); try { await storage.set("settings", JSON.stringify(next)); } catch (e) {} }
  function addTransaction(tx) { const next = [...transactions, { ...tx, id: uid() }]; persistTransactions(next); setToast("Добавлено"); setTimeout(() => setToast(null), 1400); }
  function deleteTransaction(id) { persistTransactions(transactions.filter((t) => t.id !== id)); setToast("Удалено"); setTimeout(() => setToast(null), 1200); }
  function toggleIncludeInTotal(key) { const next = { ...settings, includeInTotal: { ...settings.includeInTotal, [key]: !settings.includeInTotal?.[key] } }; persistSettings(next); }

  if (!loaded) return <><AppStyles /><div className="app-viewport"><div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}><div style={{ color: C.inkMuted, fontSize: 14 }}>Загрузка…</div></div></div></>;

  return (
    <>
      <AppStyles />
      <div className="app-viewport">
        <div className="app-shell">
          <header className="app-header">
            <div className="app-title-row">
              <div><div className="app-title">Бюджет</div><div className="app-date">{monthLabelShort(todayMonthKey())}</div></div>
              <div style={{ width: 36, height: 36, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkMuted }}><Wallet size={18} /></div>
            </div>
          </header>
          <main className="app-main">
            {tab === "add" && <AddView settings={settings} transactions={transactions} onAdd={addTransaction} />}
            {tab === "analysis" && <AnalysisView settings={settings} transactions={transactions} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onDelete={deleteTransaction} onToggleInclude={toggleIncludeInTotal} goToAdd={() => setTab("add")} />}
            {tab === "settings" && <SettingsView settings={settings} onSave={persistSettings} onWipeAll={() => persistTransactions([])} />}
          </main>
          <TabBar tab={tab} setTab={setTab} />
          <Toast text={toast} />
        </div>
      </div>
    </>
  );
}
