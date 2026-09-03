import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Plus, PiggyBank, BarChart3, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Wallet, X,
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

const DEFAULT_SETTINGS = {
  salary: 60000, avans1: 15000, avans2: 15000,
  saveD5: 14000, saveD30: 4000, alfaD5: 27000,
  goal: 540000, savedBefore: 0,
  needCats: ["Аренда/ипотека", "ЖКХ", "Продукты", "Транспорт", "Связь", "Лекарства/здоровье", "Прочее"],
  wantCats: ["Кафе/рестораны", "Кино/развлечения", "Шоппинг", "Подписки", "Подарки", "Прочее"],
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
  return v.toLocaleString("ru-RU") + " \u20BD";
}
function clampPct(p) { return Math.max(0, Math.min(1, p || 0)); }

function computeIncomeSplit(tx, settings) {
  const day = dayOfMonth(tx.date);
  let plan = 0;
  if (day === 5) plan = settings.salary;
  else if (day === 15) plan = settings.avans1;
  else if (day === 30) plan = settings.avans2;
  const baseOzon = day === 5 ? settings.saveD5 : day === 30 ? settings.saveD30 : 0;
  const baseAlfa = day === 5 ? settings.alfaD5 : 0;
  const excess = Math.max(0, tx.amount - plan);
  const toOzon = baseOzon + excess / 2;
  const toAlfa = baseAlfa + excess / 2;
  const toSber = tx.amount - toOzon - toAlfa;
  return { plan, toOzon, toAlfa, toSber };
}

function aggregateMonth(mk, transactions, settings) {
  const inMonth = transactions.filter((t) => monthKeyOf(t.date) === mk);
  const incomes = inMonth.filter((t) => t.type === "income");
  const expenses = inMonth.filter((t) => t.type === "expense");
  const savings = inMonth.filter((t) => t.type === "saving");

  let sberAvail = 0, alfaAvail = 0, ozonFromIncome = 0, incomeTotal = 0;
  incomes.forEach((t) => {
    const s = computeIncomeSplit(t, settings);
    sberAvail += s.toSber; alfaAvail += s.toAlfa; ozonFromIncome += s.toOzon;
    incomeTotal += t.amount;
  });

  let sberSpent = 0, alfaSpent = 0;
  const needCatTotals = {}; settings.needCats.forEach((c) => { needCatTotals[c] = 0; });
  const wantCatTotals = {}; settings.wantCats.forEach((c) => { wantCatTotals[c] = 0; });
  expenses.forEach((t) => {
    if (t.card === "sber") {
      sberSpent += t.amount;
      needCatTotals[t.category] = (needCatTotals[t.category] || 0) + t.amount;
    } else if (t.card === "alfa") {
      alfaSpent += t.amount;
      wantCatTotals[t.category] = (wantCatTotals[t.category] || 0) + t.amount;
    }
  });

  let savingsAdjust = 0;
  savings.forEach((t) => { savingsAdjust += t.amount; });

  const items = [...inMonth].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return {
    incomeTotal, sberAvail, alfaAvail, ozonFromIncome, sberSpent, alfaSpent, savingsAdjust,
    sberRemain: sberAvail - sberSpent,
    alfaRemain: alfaAvail - alfaSpent,
    ozonMonthTotal: ozonFromIncome + savingsAdjust,
    needCatTotals, wantCatTotals, items,
  };
}

function aggregateAllTimeSavings(transactions, settings) {
  let total = settings.savedBefore || 0;
  transactions.forEach((t) => {
    if (t.type === "income") total += computeIncomeSplit(t, settings).toOzon;
    else if (t.type === "saving") total += t.amount;
  });
  return total;
}

function estimateMonthlyRate(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey, sum = 0, count = 0;
  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    const monthOzon = agg.ozonFromIncome + agg.savingsAdjust;
    if (monthOzon !== 0) { sum += monthOzon; count += 1; }
    mk = shiftMonth(mk, -1);
  }
  if (count > 0) return sum / count;
  return settings.saveD5 + settings.saveD30;
}

function getAllMonthKeys(transactions) {
  const set = new Set(transactions.map((t) => monthKeyOf(t.date)));
  set.add(todayMonthKey());
  return Array.from(set).sort();
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

function MiniCatList({ title, color, items }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: C.border, background: C.surface }}>
      <div className="text-xs font-medium mb-2" style={{ color }}>{title}</div>
      {items.length === 0 ? (
        <div className="text-xs" style={{ color: C.inkMuted }}>Нет трат</div>
      ) : (
        <div className="space-y-1">
          {items.map(([cat, val]) => (
            <div key={cat} className="flex justify-between text-xs gap-2">
              <span style={{ color: C.inkMuted }} className="truncate">{cat}</span>
              <span className="font-mono shrink-0">{formatMoney(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, onDelete }) {
  const color = tx.type === "income" ? C.sber
    : tx.type === "saving" ? (tx.amount < 0 ? C.danger : C.ozon)
    : (tx.card === "sber" ? C.sber : C.alfa);
  const sign = tx.type === "expense" ? "\u2212" : (tx.type === "saving" && tx.amount < 0) ? "\u2212" : "+";
  const label = tx.type === "income" ? (tx.note || "Доход")
    : tx.type === "expense" ? (tx.note || tx.category)
    : (tx.note || (tx.amount < 0 ? "Снятие из подушки" : "Пополнение подушки"));
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
function DashboardView({ settings, transactions, selectedMonth, setSelectedMonth, onDelete, goToAdd }) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const totalSaved = useMemo(() => aggregateAllTimeSavings(transactions, settings), [transactions, settings]);
  const hasAnyTx = transactions.length > 0;

  const needPct = agg.sberAvail > 0 ? agg.sberSpent / agg.sberAvail : (agg.sberSpent > 0 ? 1 : 0);
  const wantPct = agg.alfaAvail > 0 ? agg.alfaSpent / agg.alfaAvail : (agg.alfaSpent > 0 ? 1 : 0);
  const ozonPct = settings.goal > 0 ? totalSaved / settings.goal : 0;

  const topNeedCats = Object.entries(agg.needCatTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topWantCats = Object.entries(agg.wantCatTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div>
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />

      {!hasAnyTx ? (
        <EmptyState onAdd={goToAdd} />
      ) : (
        <>
          <BankCard stripe={C.sber} soft={C.sberSoft} name="Сбербанк" role="Обязательные нужды"
            bigLabel="остаток" bigValue={agg.sberRemain} pct={needPct}
            sub={`Потрачено ${formatMoney(agg.sberSpent)} из ${formatMoney(agg.sberAvail)}`} />
          <BankCard stripe={C.alfa} soft={C.alfaSoft} name="Альфа-Банк" role="Развлечения"
            bigLabel="остаток" bigValue={agg.alfaRemain} pct={wantPct}
            sub={`Потрачено ${formatMoney(agg.alfaSpent)} из ${formatMoney(agg.alfaAvail)}`} />
          <BankCard stripe={C.ozon} soft={C.ozonSoft} name="Озон Банк" role="Подушка безопасности"
            bigLabel="накоплено всего" bigValue={totalSaved} pct={ozonPct}
            sub={`Цель ${formatMoney(settings.goal)}`}
            footnote={`За этот месяц: +${formatMoney(agg.ozonMonthTotal)}. Копится не по месяцам, а нарастающим итогом.`} />

          {(topNeedCats.length > 0 || topWantCats.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-2 mb-2">
              <MiniCatList title="Нужды" color={C.sber} items={topNeedCats} />
              <MiniCatList title="Развлечения" color={C.alfa} items={topWantCats} />
            </div>
          )}

          <div className="mt-5">
            <div className="text-xs font-medium mb-2" style={{ color: C.inkMuted }}>Операции за месяц</div>
            {agg.items.length === 0 ? (
              <div className="text-xs py-4 text-center" style={{ color: C.inkMuted }}>Пока нет операций в этом месяце</div>
            ) : (
              <div>
                {agg.items.slice(0, 10).map((t) => <TxRow key={t.id} tx={t} onDelete={onDelete} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================ Add */
function AddView({ settings, onAdd }) {
  const [type, setType] = useState("expense");
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState("sber");
  const [category, setCategory] = useState(settings.needCats[0] || "");
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState("add");

  useEffect(() => {
    const list = card === "sber" ? settings.needCats : settings.wantCats;
    setCategory(list[0] || "");
  }, [card, settings.needCats, settings.wantCats]);

  const numAmount = parseFloat(amount) || 0;
  const preview = type === "income" && numAmount > 0
    ? computeIncomeSplit({ date, amount: numAmount }, settings)
    : null;

  function submit() {
    if (numAmount <= 0 || !date) return;
    if (type === "expense") {
      onAdd({ type: "expense", date, amount: numAmount, card, category, note });
    } else if (type === "income") {
      onAdd({ type: "income", date, amount: numAmount, note });
    } else {
      const signed = direction === "withdraw" ? -Math.abs(numAmount) : Math.abs(numAmount);
      onAdd({ type: "saving", date, amount: signed, note });
    }
    setAmount("");
    setNote("");
  }

  const canSubmit = numAmount > 0 && !!date;

  return (
    <div>
      <div className="flex rounded-lg overflow-hidden border mb-5" style={{ borderColor: C.border }}>
        {[{ id: "expense", label: "Трата" }, { id: "income", label: "Доход" }, { id: "saving", label: "Подушка" }].map((opt) => (
          <button key={opt.id} onClick={() => setType(opt.id)}
            className="flex-1 py-2.5 text-sm font-medium"
            style={{ background: type === opt.id ? C.ink : C.surface, color: type === opt.id ? C.surface : C.inkMuted }}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Сумма</label>
        <div className="flex items-baseline gap-2 border-b-2 pb-2" style={{ borderColor: C.ink }}>
          <input type="number" inputMode="decimal" min="0" step="1" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className="font-mono text-4xl w-full outline-none bg-transparent" style={{ color: C.ink }} />
          <span className="font-mono text-2xl" style={{ color: C.inkMuted }}>₽</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: C.border, color: C.ink }} />
      </div>

      {type === "expense" && (
        <>
          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Карта</label>
            <div className="flex gap-2">
              <button onClick={() => setCard("sber")}
                className="flex-1 rounded-lg border py-2.5 flex flex-col items-center gap-0.5"
                style={{
                  borderColor: card === "sber" ? C.sber : C.border,
                  background: card === "sber" ? C.sberSoft : C.surface,
                }}>
                <span className="text-sm font-medium" style={{ color: card === "sber" ? C.sber : C.ink }}>🟢 Сбербанк</span>
                <span className="text-xs" style={{ color: card === "sber" ? C.sber : C.inkMuted }}>нужды</span>
              </button>
              <button onClick={() => setCard("alfa")}
                className="flex-1 rounded-lg border py-2.5 flex flex-col items-center gap-0.5"
                style={{
                  borderColor: card === "alfa" ? C.alfa : C.border,
                  background: card === "alfa" ? C.alfaSoft : C.surface,
                }}>
                <span className="text-sm font-medium" style={{ color: card === "alfa" ? C.alfa : C.ink }}>🔴 Альфа-Банк</span>
                <span className="text-xs" style={{ color: card === "alfa" ? C.alfa : C.inkMuted }}>развлечения</span>
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Категория</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border, color: C.ink }}>
              {(card === "sber" ? settings.needCats : settings.wantCats).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "saving" && (
        <div className="mb-4">
          <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>Тип операции</label>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setDirection("add")}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
              style={{
                borderColor: direction === "add" ? C.ozon : C.border,
                background: direction === "add" ? C.ozonSoft : C.surface,
                color: direction === "add" ? C.ozon : C.inkMuted,
              }}>
              Пополнение
            </button>
            <button onClick={() => setDirection("withdraw")}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
              style={{
                borderColor: direction === "withdraw" ? C.danger : C.border,
                background: direction === "withdraw" ? C.dangerSoft : C.surface,
                color: direction === "withdraw" ? C.danger : C.inkMuted,
              }}>
              Экстренное снятие
            </button>
          </div>
          {direction === "withdraw" && (
            <div className="flex gap-2 rounded-lg p-3 text-xs" style={{ background: C.dangerSoft, color: C.danger }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Подушку трогаем только при реальном форс-мажоре: потеря работы или проблемы со здоровьем.</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-5">
        <label className="text-xs mb-1 block" style={{ color: C.inkMuted }}>
          {type === "expense" ? "Описание (необязательно)" : "Комментарий (необязательно)"}
        </label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={type === "expense" ? "Пятёрочка, продукты" : type === "income" ? "Зарплата" : "Проценты банка"}
          className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: C.border, color: C.ink }} />
      </div>

      {type === "income" && preview && (
        <div className="mb-5 rounded-lg border p-3 text-xs" style={{ borderColor: C.border, background: C.bg }}>
          <div className="mb-2" style={{ color: C.inkMuted }}>
            {preview.plan > 0 ? "Как распределится:" : "Не зарплатный день — вся сумма считается доп. доходом и делится:"}
          </div>
          <div className="flex justify-between mb-1">
            <span style={{ color: C.sber }}>🟢 На Сбер</span>
            <span className="font-mono font-medium">{formatMoney(preview.toSber)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span style={{ color: C.alfa }}>🔴 На Альфа</span>
            <span className="font-mono font-medium">{formatMoney(preview.toAlfa)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: C.ozon }}>🔵 На Озон</span>
            <span className="font-mono font-medium">{formatMoney(preview.toOzon)}</span>
          </div>
          {numAmount > preview.plan && preview.plan > 0 && (
            <div className="pt-2 mt-2 border-t text-xs" style={{ borderColor: C.border, color: C.amber }}>
              Излишек {formatMoney(numAmount - preview.plan)} поделен поровну между Озон и Альфа
            </div>
          )}
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

/* ============================================================ Savings */
function SavingsView({ settings, transactions }) {
  const totalSaved = useMemo(() => aggregateAllTimeSavings(transactions, settings), [transactions, settings]);
  const pct = settings.goal > 0 ? totalSaved / settings.goal : 0;
  const left = settings.goal - totalSaved;
  const rate = useMemo(() => estimateMonthlyRate(transactions, settings, todayMonthKey()), [transactions, settings]);
  const monthsLeft = left <= 0 ? 0 : (rate > 0 ? Math.ceil(left / rate) : null);
  const thisMonth = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);

  const manualEntries = useMemo(() =>
    transactions.filter((t) => t.type === "saving").sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  , [transactions]);

  return (
    <div>
      <div className="rounded-lg border p-5 mb-4 text-center" style={{ borderColor: C.border, background: C.surface }}>
        <div className="text-xs mb-1" style={{ color: C.inkMuted }}>Накоплено</div>
        <div className="font-mono text-3xl font-semibold mb-1" style={{ color: C.ozon }}>{formatMoney(totalSaved)}</div>
        <div className="text-xs mb-3" style={{ color: C.inkMuted }}>из цели {formatMoney(settings.goal)}</div>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: C.ozonSoft }}>
          <div className="h-full rounded-full" style={{ width: `${clampPct(pct) * 100}%`, background: C.ozon }} />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span style={{ color: C.inkMuted }}>{Math.round(pct * 100)}%</span>
          <span style={{ color: C.inkMuted }}>{left > 0 ? `осталось ${formatMoney(left)}` : "цель достигнута \uD83C\uDF89"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox label="В этом месяце" value={`+${formatMoney(thisMonth.ozonMonthTotal)}`} color={C.ozon} />
        <StatBox label="Прогноз до цели" value={monthsLeft === 0 ? "готово" : monthsLeft ? `~${monthsLeft} мес.` : "\u2014"} color={C.ozon} />
      </div>

      <div className="rounded-lg p-3 text-xs mb-5" style={{ background: C.amberSoft, color: "#8A5A15" }}>
        Деньги из подушки не трогаем ни при каких условиях, кроме реального форс-мажора — потери работы или проблем со здоровьем.
        С 3-го месяца стоит подключить Ozon Premium (199 ₽/мес): ставка поднимется примерно до 12% годовых.
      </div>

      <div className="text-xs font-medium mb-2" style={{ color: C.inkMuted }}>Ручные пополнения и снятия</div>
      {manualEntries.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: C.inkMuted }}>
          Автоматические переводы с зарплаты видны на вкладке «Обзор». Здесь — только проценты банка, подарки и форс-мажорные снятия.
        </div>
      ) : (
        <div>
          {manualEntries.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs py-2 border-b" style={{ borderColor: C.border }}>
              <div>
                <div>{t.note || (t.amount < 0 ? "Снятие" : "Пополнение")}</div>
                <div className="text-xs" style={{ color: C.inkMuted }}>{t.date}</div>
              </div>
              <div className="font-mono font-medium" style={{ color: t.amount < 0 ? C.danger : C.ozon }}>
                {t.amount < 0 ? "\u2212" : "+"}{formatMoney(Math.abs(t.amount))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================ Analysis */
function AnalysisView({ settings, transactions, selectedMonth, setSelectedMonth }) {
  const months = useMemo(() => getAllMonthKeys(transactions).slice(-6), [transactions]);

  const chartData = useMemo(() => months.map((mk) => {
    const agg = aggregateMonth(mk, transactions, settings);
    return {
      month: monthLabelShort(mk),
      "Нужды": Math.round(agg.sberSpent),
      "Развлечения": Math.round(agg.alfaSpent),
      "Накопления": Math.round(agg.ozonMonthTotal),
    };
  }), [months, transactions, settings]);

  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);

  const allCats = useMemo(() => {
    const need = Object.entries(agg.needCatTotals).map(([cat, val]) => ({ cat, val, type: "need" }));
    const want = Object.entries(agg.wantCatTotals).map(([cat, val]) => ({ cat, val, type: "want" }));
    return [...need, ...want].filter((x) => x.val > 0).sort((a, b) => b.val - a.val);
  }, [agg]);

  const topCat = allCats[0];

  return (
    <div>
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />

      {months.length < 2 ? (
        <div className="text-xs rounded-lg border p-4 mb-4" style={{ borderColor: C.border, color: C.inkMuted }}>
          Тренд по месяцам появится, когда наберётся история за 2 и более месяцев.
        </div>
      ) : (
        <div className="rounded-lg border p-3 mb-5" style={{ borderColor: C.border, background: C.surface }}>
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
        <StatBox label="В подушку" value={formatMoney(agg.ozonMonthTotal)} color={C.ozon} />
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
        <div className="space-y-2.5">
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

function CatEditor({ items, onRemove, color, newVal, setNewVal, onAdd }) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((name) => (
          <span key={name} className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-1 text-xs"
            style={{ background: C.bg, color: C.ink }}>
            {name}
            <button onClick={() => onRemove(name)} style={{ color: C.inkMuted }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)}
          placeholder="Новая категория"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs" style={{ borderColor: C.border, color: C.ink }} />
        <button onClick={onAdd} className="rounded-lg px-3 text-xs font-medium" style={{ background: color, color: "#fff" }}>
          Добавить
        </button>
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave, onWipeAll }) {
  const [local, setLocal] = useState(settings);
  const [newNeedCat, setNewNeedCat] = useState("");
  const [newWantCat, setNewWantCat] = useState("");
  const [armed, setArmed] = useState(false);
  const armTimer = useRef(null);

  useEffect(() => { setLocal(settings); }, [settings]);

  function field(key, value) { setLocal((prev) => ({ ...prev, [key]: value })); }

  function commit() {
    const clean = { ...local };
    ["salary", "avans1", "avans2", "saveD5", "saveD30", "alfaD5", "goal", "savedBefore"].forEach((k) => {
      if (clean[k] === "" || clean[k] === null || Number.isNaN(clean[k])) clean[k] = 0;
    });
    setLocal(clean);
    onSave(clean);
  }

  const needBudget = (Number(local.salary) || 0) + (Number(local.avans1) || 0) + (Number(local.avans2) || 0)
    - (Number(local.saveD5) || 0) - (Number(local.saveD30) || 0) - (Number(local.alfaD5) || 0);

  function addNeedCat() {
    const name = newNeedCat.trim();
    if (!name || local.needCats.includes(name)) return;
    const next = { ...local, needCats: [...local.needCats, name] };
    setLocal(next); onSave(next); setNewNeedCat("");
  }
  function removeNeedCat(name) {
    const next = { ...local, needCats: local.needCats.filter((c) => c !== name) };
    setLocal(next); onSave(next);
  }
  function addWantCat() {
    const name = newWantCat.trim();
    if (!name || local.wantCats.includes(name)) return;
    const next = { ...local, wantCats: [...local.wantCats, name] };
    setLocal(next); onSave(next); setNewWantCat("");
  }
  function removeWantCat(name) {
    const next = { ...local, wantCats: local.wantCats.filter((c) => c !== name) };
    setLocal(next); onSave(next);
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
      <SectionTitle>Поступления</SectionTitle>
      <NumField label="Зарплата, день 5 (\u20BD)" value={local.salary} onChange={(v) => field("salary", v)} onBlur={commit} />
      <NumField label="Аванс, день 15 (\u20BD)" value={local.avans1} onChange={(v) => field("avans1", v)} onBlur={commit} />
      <NumField label="Аванс, день 30 (\u20BD)" value={local.avans2} onChange={(v) => field("avans2", v)} onBlur={commit} />

      <SectionTitle>Переводы по СБП</SectionTitle>
      <NumField label="В Озон, день 5 (\u20BD)" value={local.saveD5} onChange={(v) => field("saveD5", v)} onBlur={commit} />
      <NumField label="В Озон, день 30 (\u20BD)" value={local.saveD30} onChange={(v) => field("saveD30", v)} onBlur={commit} />
      <NumField label="В Альфа, день 5 (\u20BD)" value={local.alfaD5} onChange={(v) => field("alfaD5", v)} onBlur={commit} />
      <div className="text-xs mb-5 -mt-1" style={{ color: C.inkMuted }}>
        При таких значениях бюджет нужд на Сбере получается {formatMoney(needBudget)} в месяц
      </div>

      <SectionTitle>Подушка безопасности</SectionTitle>
      <NumField label="Цель, \u20BD" value={local.goal} onChange={(v) => field("goal", v)} onBlur={commit} />
      <NumField label="Уже накоплено до старта, \u20BD" value={local.savedBefore} onChange={(v) => field("savedBefore", v)} onBlur={commit} />

      <SectionTitle>Категории — Нужды (Сбер)</SectionTitle>
      <CatEditor items={local.needCats} onRemove={removeNeedCat} color={C.sber}
        newVal={newNeedCat} setNewVal={setNewNeedCat} onAdd={addNeedCat} />

      <SectionTitle>Категории — Развлечения (Альфа)</SectionTitle>
      <CatEditor items={local.wantCats} onRemove={removeWantCat} color={C.alfa}
        newVal={newWantCat} setNewVal={setNewWantCat} onAdd={addWantCat} />

      <SectionTitle>Подписки</SectionTitle>
      <div className="text-xs rounded-lg border p-3 mb-5" style={{ borderColor: C.border, color: C.inkMuted }}>
        <p className="mb-2"><span style={{ color: C.ink, fontWeight: 500 }}>Альфа-Банк:</span> подключите T-Pro (299 \u20BD/мес) — выше кэшбэк на развлечения и лимиты на переводы между картами.</p>
        <p><span style={{ color: C.ink, fontWeight: 500 }}>Озон Банк:</span> первые 2 месяца — повышенная приветственная ставка. С 3-го месяца подключите Ozon Premium (199 \u20BD/мес) — ставка вырастет примерно до 12%.</p>
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
  { id: "dashboard", label: "Обзор", icon: Home },
  { id: "add", label: "Добавить", icon: Plus },
  { id: "savings", label: "Подушка", icon: PiggyBank },
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
  const [tab, setTab] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let s = DEFAULT_SETTINGS, t = [];
      try {
        const r = await storage.get("settings");
        if (r && r.value) s = { ...DEFAULT_SETTINGS, ...JSON.parse(r.value) };
      } catch (e) { /* first run, use defaults */ }
      try {
        const r = await storage.get("transactions");
        if (r && r.value) t = JSON.parse(r.value);
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
        {tab === "dashboard" && (
          <DashboardView settings={settings} transactions={transactions}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            onDelete={deleteTransaction} goToAdd={() => setTab("add")} />
        )}
        {tab === "add" && <AddView settings={settings} onAdd={addTransaction} />}
        {tab === "savings" && <SavingsView settings={settings} transactions={transactions} />}
        {tab === "analysis" && (
          <AnalysisView settings={settings} transactions={transactions}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
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
