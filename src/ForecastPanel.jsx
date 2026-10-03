import React, { useMemo } from "react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { comparisonPeriodText, computeMonthComparison, shortDate } from "./forecast.js";
import { formatMoney } from "./format.js";

/* Сравнение расходов с прошлыми месяцами (только для текущего месяца).
   Прогноз до аванса показывается в карточках «Потребности» и «Хотения». */
export function ForecastPanel({ transactions }) {
  const cmp = useMemo(() => computeMonthComparison(transactions), [transactions]);

  const rows = cmp ? cmp.rows.slice(0, 5) : [];
  if (!cmp || (cmp.total.pct == null && rows.length === 0)) return null;

  return (
    <div className="panel panel-compact">
      <SectionTitle>Сравнение с прошлыми месяцами</SectionTitle>
      <div className="fc-sub" style={{ marginBottom: 2 }}>
        К {shortDate(cmp.today)}, {comparisonPeriodText(cmp.months)}
      </div>
      <div className="fc-list">
        {cmp.total.pct != null && (
          <div className="fc-row">
            <div style={{ minWidth: 0 }}>
              <div className="fc-name">Все расходы</div>
              <div className="fc-sub">
                {formatMoney(Math.round(cmp.total.cur))} вместо {formatMoney(Math.round(cmp.total.avg))}
              </div>
            </div>
            <div className="fc-val" style={{ color: cmp.total.diff > 0 ? C.danger : C.sber }}>
              {cmp.total.pct > 0 ? "+" : ""}{cmp.total.pct}%
            </div>
          </div>
        )}
        {rows.map((r) => (
          <div className="fc-row" key={`${r.bucket}:${r.name}`}>
            <div style={{ minWidth: 0 }}>
              <div className="fc-name">{r.name}</div>
              <div className="fc-sub">
                {formatMoney(Math.round(r.cur))} вместо {formatMoney(Math.round(r.avg))}
              </div>
            </div>
            <div className="fc-val" style={{ color: r.diff > 0 ? C.danger : C.sber }}>
              {r.pct > 0 ? "+" : ""}{r.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
