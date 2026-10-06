import React, { useState } from "react";
import { C } from "./constants.js";
import { cardLabel, formatMoney } from "./format.js";
import { shortDate } from "./forecast.js";
import { daysUntilDue } from "./loans.js";
import { todayStr } from "./format.js";

const CARDS = ["sber", "alfa", "ozon"];

/* Личные долги в «Фонде»: «Вам должен Коля 1 000 ₽ [Списать]». «Списать» раскрывает выбор:
   деньги вернулись (на какую карту) или долг прощён (деньги не двигаются). */
export function FundLoans({ loans, settings, onRepay }) {
  const [settling, setSettling] = useState(null); // { id, card }
  const today = todayStr();

  return (
    <>
      {loans.map((l) => {
        const lent = l.direction === "lent";
        const open = settling && settling.id === l.id;
        return (
          <React.Fragment key={l.id}>
            <div className="tx-row debt-row">
              <div className="debt-main" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>
                  {lent ? "Вам должен " : "Вы должны: "}
                  <span>{l.person}</span>
                </span>
                <span className="fc-sub">
                  {shortDate(l.date)} · {cardLabel(settings, l.card)}{l.note ? ` · ${l.note}` : ""}
                </span>
                {l.dueDate && (
                  <span className="fc-sub" style={{ color: daysUntilDue(l, today) < 0 ? C.danger : undefined, fontWeight: daysUntilDue(l, today) <= 1 ? 800 : undefined }}>
                    {daysUntilDue(l, today) < 0 ? `срок вышел ${shortDate(l.dueDate)}` : `до ${shortDate(l.dueDate)}`}
                  </span>
                )}
              </div>
              <div className="tx-amount" style={{ color: C.amber }}>{formatMoney(l.amount)}</div>
              <button
                type="button"
                className="btn"
                style={{ height: 30, padding: "0 10px", fontSize: 11, flex: "0 0 auto" }}
                onClick={() => setSettling(open ? null : { id: l.id, card: l.card })}
              >
                Списать
              </button>
            </div>

            {open && (
              <div className="loan-settle">
                <div className="fc-sub">{lent ? "Деньги вернулись на карту" : "Вы вернули деньги с карты"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    aria-label="Карта"
                    value={settling.card}
                    onChange={(e) => setSettling({ ...settling, card: e.target.value })}
                    style={{ height: 32, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, padding: "0 8px", fontSize: 13 }}
                  >
                    {CARDS.map((c) => (
                      <option key={c} value={c}>{cardLabel(settings, c)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                    onClick={() => { onRepay(l, settling.card, false); setSettling(null); }}
                  >
                    {lent ? "Вернули" : "Вернул"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                    onClick={() => { onRepay(l, settling.card, true); setSettling(null); }}
                  >
                    {lent ? "Простить" : "Мне простили"}
                  </button>
                  <button type="button" className="btn" aria-label="Отмена" style={{ height: 32, padding: "0 10px", fontSize: 12 }} onClick={() => setSettling(null)}>
                    ×
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
