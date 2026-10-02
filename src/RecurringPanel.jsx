import React, { useMemo } from "react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { bucketName, formatMoney, ruPlural, todayStr } from "./format.js";
import { computeRecurring } from "./recurring.js";
import { shortDate } from "./forecast.js";

/* Платежи, которые пора провести или наступят в ближайшие 7 дней. */
export function RecurringPanel({ settings, onPost }) {
  const today = todayStr();
  const items = useMemo(() => computeRecurring(settings, today), [settings, today]);
  if (!items.length) return null;

  return (
    <div className="panel">
      <SectionTitle>Платежи</SectionTitle>
      <div className="fc-list">
        {items.map((r) => {
          const due = r.status === "due";
          const sub = due
            ? r.daysUntil === 0
              ? `сегодня · ${bucketName(settings, r.bucket)}`
              : `срок был ${shortDate(r.dueDate)} · ${bucketName(settings, r.bucket)}`
            : `через ${r.daysUntil} ${ruPlural(r.daysUntil, "день", "дня", "дней")} · ${bucketName(settings, r.bucket)}`;
          return (
            <div className="fc-row" key={r.id}>
              <div style={{ minWidth: 0 }}>
                <div className="fc-name">{r.name}</div>
                <div className="fc-sub" style={{ color: due && r.daysUntil < 0 ? C.danger : undefined }}>{sub}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                <span className="fc-val mono">{formatMoney(r.amount)}</span>
                {due && (
                  <button type="button" className="btn primary" style={{ height: 32, padding: "0 12px" }} onClick={() => onPost(r)}>
                    Провести
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
