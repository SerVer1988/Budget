import React, { useMemo } from "react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { comparisonPeriodText, computeForecast, computeMonthComparison, shortDate } from "./forecast.js";
import { formatMoney, ruPlural } from "./format.js";

const CARD_COLOR = { sber: C.sber, alfa: C.alfa };

function ForecastRow({ f }) {
  const sub = `≈ ${formatMoney(Math.round(f.rate))} в день · до аванса ${f.daysLeft} ${ruPlural(f.daysLeft, "день", "дня", "дней")}`;
  let value;
  let color;
  if (f.status === "ok") {
    value = `хватит · +${formatMoney(Math.round(f.left))}`;
    color = C.sber;
  } else if (f.status === "short") {
    value = `закончится ${shortDate(f.runOutDate)}`;
    color = C.danger;
  } else {
    value = "баланс исчерпан";
    color = C.danger;
  }
  return (
    <div className="fc-row">
      <div style={{ minWidth: 0 }}>
        <div className="fc-name">
          <span className="chip-dot" style={{ background: CARD_COLOR[f.card] }} />
          {f.name}
        </div>
        <div className="fc-sub">{sub}</div>
      </div>
      <div className="fc-val" style={{ color }}>{value}</div>
    </div>
  );
}

/* Прогноз до аванса и сравнение расходов с прошлыми месяцами (только для текущего месяца). */
export function ForecastPanel({ settings, transactions }) {
  const forecast = useMemo(() => computeForecast(transactions, settings), [transactions, settings]);
  const cmp = useMemo(() => computeMonthComparison(transactions), [transactions]);

  const cmpRows = cmp ? cmp.rows.slice(0, 5) : [];
  const showCmp = cmp && (cmp.total.pct != null || cmpRows.length > 0);

  if (!forecast.length && !showCmp) return null;

  return (
    <>
      {forecast.length > 0 && (
        <div className="panel">
          <SectionTitle>Прогноз до аванса</SectionTitle>
          <div className="fc-list">
            {forecast.map((f) => (
              <ForecastRow key={f.card} f={f} />
            ))}
          </div>
        </div>
      )}

      {showCmp && (
        <div className="panel">
          <SectionTitle>Сравнение с прошлыми месяцами</SectionTitle>
          <div className="fc-sub" style={{ marginBottom: 4 }}>
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
            {cmpRows.map((r) => (
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
      )}
    </>
  );
}
