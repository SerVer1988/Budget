import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Wallet,
} from "lucide-react";
import { C } from "./constants.js";
import { darkenColor, formatMoney, monthLabel, shiftMonth } from "./format.js";

/* ============================================================ small UI parts */
export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

export function MonthNav({ value, onChange }) {
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

export function StatBox({ label, value, color, compact }) {
  return (
    <div className={compact ? "stat-box stat-box-compact" : "stat-box"}>
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
    </div>
  );
}

export function EmptyState({ onAdd }) {
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

export function Toast({ text }) {
  if (!text) return null;
  return (
    <div className="toast">
      <Check size={15} /> {text}
    </div>
  );
}

export function LimitStatus({ target, avail }) {
  // Больше не используется в интерфейсе: заменён индикатором из карусели подсказок
  // на вкладке «Анализ» (LimitStatus считал по притоку текущего месяца, новый расчёт —
  // по факту на карте с учётом всей истории, и одновременный показ обоих вводил в заблуждение).
  const diff = Math.round(target - avail);
  if (diff === 0) return null;
  return diff > 0
    ? <div className="limit-status" style={{ color: C.inkMuted }}>Можно доложить: {formatMoney(diff)}</div>
    : <div className="limit-status" style={{ color: C.danger }}>Перебор: {formatMoney(Math.abs(diff))}</div>;
}

export function BankBadge({ src }) {
  return (
    <div className="bank-badge">
      <img src={src} alt="" />
    </div>
  );
}

export function ListTile({ icon: Icon, color, name, amount, onClick, empty }) {
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

/* Плитка категории: крупно — потрачено в этом месяце, мелко и серым — среднее за прошлые месяцы.
   Шкала: до среднего цвет категории; если потрачено больше среднего, превышение показано
   другим (тёмным) цветом с чётким краем на отметке среднего. */
export function CategoryTile({ icon: Icon, color, name, spent, avg, onClick }) {
  const hasAvg = avg > 0;
  const over = hasAvg && spent > avg;
  const withinPct = !hasAvg ? 0 : over ? (avg / spent) * 100 : Math.max(0, Math.min(100, (spent / avg) * 100));
  const overPct = over ? 100 - withinPct : 0;

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
        {hasAvg && <span className="cat-tile-limit"> из {formatMoney(Math.round(avg))}</span>}
      </div>

      {hasAvg && (
        <div className="cat-tile-bar" style={{ background: color + "22" }}>
          <div className="cat-tile-bar-fill" data-part="within" style={{ width: withinPct + "%", background: color }} />
          {over && (
            <div
              className="cat-tile-bar-fill"
              data-part="over"
              style={{ width: overPct + "%", background: darkenColor(color, 0.45) }}
            />
          )}
        </div>
      )}
    </button>
  );
}
