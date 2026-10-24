import React from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { C } from "./constants.js";

/* Элементы компактной формы «Новая операция»: круглые значки, строки-списки, вкладки, переключатели.
   Подписи мелкие и приглушённые, чтобы не перегружать экран. */

// Цвета вкладок по видам операций.
export const OP_TAB_COLORS = {
  expense: "#E4695A",
  income: "#1E8E4F",
  transfer: "#2F6FD0",
  adjustment: "#C97A1E",
  loan: "#7B5CC9",
};

const OP_TABS = [
  { id: "expense", label: "Трата" },
  { id: "income", label: "Доход" },
  { id: "transfer", label: "Перевод" },
  { id: "adjustment", label: "Коррекция" },
  { id: "loan", label: "Долги" },
];

export function OpTabs({ value, onChange }) {
  return (
    <div className="op-tabs">
      {OP_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`op-tab${value === t.id ? " active" : ""}`}
          style={{ "--tab-color": OP_TAB_COLORS[t.id] }}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* Круглый значок: светлая подложка и цветной рисунок. */
export function RoundIcon({ icon: Icon, color = C.sber, size = 36 }) {
  return (
    <span className="op-ic" style={{ width: size, height: size, background: `${color}22`, color }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} />
    </span>
  );
}

export function OpGroup({ children }) {
  return <div className="op-group">{children}</div>;
}

/* Строка: значок слева, мелкая подпись и значение, справа стрелка. Для выбора поверх кладётся прозрачный список. */
export function OpRow({ icon, color, label, value, chevron = true, children }) {
  return (
    <div className="op-row">
      <RoundIcon icon={icon} color={color} />
      <div className="op-body">
        {label && <div className="op-label">{label}</div>}
        {value !== undefined && <div className="op-value">{value}</div>}
      </div>
      {chevron && <ChevronRight size={17} className="op-chev" />}
      {children}
    </div>
  );
}

/* Выбор из списка в виде строки. options: [{ value, label }] */
export function OpSelect({ icon, color, label, options, value, onChange }) {
  const current = options.find((o) => o.value === value);
  return (
    <OpRow icon={icon} color={color} label={label} value={current ? current.label : "—"}>
      <select className="op-overlay" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </OpRow>
  );
}

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
};

/* Дата в виде строки: по нажатию открывается календарь телефона. */
export function OpDate({ icon = CalendarDays, color = "#5B6B62", label = "Дата", value, onChange }) {
  return (
    <OpRow icon={icon} color={color} label={label} value={fmtDate(value)}>
      <input
        className="op-overlay"
        type="date"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* не поддерживается */ } }}
      />
    </OpRow>
  );
}

/* Текстовое поле в виде строки (заметка, имя). */
export function OpText({ icon, color, label, value, onChange, placeholder, list }) {
  return (
    <div className="op-row">
      <RoundIcon icon={icon} color={color} />
      <div className="op-body">
        {label && <div className="op-label">{label}</div>}
        <input className="op-input" type="text" list={list} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

/* Переключатель «да / нет» с круглым значком. */
export function OpToggle({ icon, color, label, checked, onChange }) {
  return (
    <label className="op-row op-toggle">
      <RoundIcon icon={icon} color={color} />
      <div className="op-body"><div className="op-value op-value-sm">{label}</div></div>
      <input type="checkbox" className="op-switch-input" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="op-switch" aria-hidden="true" />
    </label>
  );
}

/* Маленькие «таблетки» выбора из двух-трёх вариантов (например, Нужды / Желания). */
export function OpChips({ label, options, value, onChange }) {
  return (
    <div className="op-chips-row">
      {label && <div className="op-label">{label}</div>}
      <div className="op-chips">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`op-chip${value === o.id ? " active" : ""}`}
            style={{ "--chip-color": o.color || C.sber, "--chip-soft": o.soft || `${o.color || C.sber}22` }}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
