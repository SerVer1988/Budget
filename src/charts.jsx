import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TxRow } from "./cards.jsx";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { bucketName, bucketOf, dayOfMonth, daysInMonth, formatMoney, monthKeyOf, todayMonthKey, todayStr } from "./format.js";

/* Первый день недельного окна графика: для текущего месяца — окно, где сегодня; для остальных — 1-е число. */
export function weekStartFor(monthKey, windowSize = 7, today = todayStr()) {
  return monthKey === monthKeyOf(today) ? Math.floor((dayOfMonth(today) - 1) / windowSize) * windowSize + 1 : 1;
}

/* Подписи оси Y покороче: 1500 -> «1,5т», чтобы цифры не обрезались. */
function compactAxis(v) {
  const a = Math.abs(v);
  if (a >= 1000) return `${String(Math.round((v / 1000) * 10) / 10).replace(".", ",")}т`;
  return String(Math.round(v));
}

export function CategoryDonut({ categories, totals, bucketLabel, transactions, bucket, settings, onDeleteTx, onEditTx }) {
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
                      settings={settings}
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
export function DailyExpenseChart({ monthItems, monthKey, settings }) {
  const needsName = bucketName(settings, "needs");
  const wantsName = bucketName(settings, "wants");
  const total = daysInMonth(monthKey);
  // График показывает неделю: 1–7, 8–14, 15–21, 22–28, 29–конец. По умолчанию — та, где сегодня.
  const WINDOW = 7;
  const defaultStart = weekStartFor(monthKey, WINDOW);
  const [start, setStart] = useState(defaultStart);

  useEffect(() => {
    setStart(weekStartFor(monthKey, WINDOW));
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
    data.push({ day: String(d), [needsName]: byDay[d]?.needs || 0, [wantsName]: byDay[d]?.wants || 0 });
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
        <BarChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.inkMuted }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} width={34} tickLine={false} tickFormatter={compactAxis} />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} height={18} />
          <Bar dataKey={needsName} stackId="d" fill={C.sber} maxBarSize={34} />
          <Bar dataKey={wantsName} stackId="d" fill={C.alfa} radius={[6, 6, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
      {canNext && (
        <button
          type="button"
          className="chart-day-arrow chart-day-arrow-next"
          onClick={() => setStart((s) => Math.min(Math.floor((total - 1) / WINDOW) * WINDOW + 1, s + WINDOW))}
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
export function ChartsCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const n = slides.length;
  if (!n) return null;
  const safeIndex = index % n;
  const current = slides[safeIndex];

  return (
    <div className="panel panel-compact">
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
