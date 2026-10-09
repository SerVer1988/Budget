import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { computePayPlan } from "./payplan.js";
import { shortDate } from "./forecast.js";
import { bucketName, formatMoney, ruPlural } from "./format.js";

const ceil100 = (n) => Math.ceil(n / 100) * 100;

function Row({ name, sub, value, color }) {
  return (
    <div className="fc-row">
      <div style={{ minWidth: 0 }}>
        <div className="fc-name">{name}</div>
        {sub && <div className="fc-sub">{sub}</div>}
      </div>
      <div className="fc-val" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function Heading({ children }) {
  return <div className="small-note" style={{ fontWeight: 800, margin: "14px 0 2px", color: C.ink }}>{children}</div>;
}

/* «План до выплаты»: хватит ли «Нужд» до ближайшей выплаты, где «утекают» деньги и сколько из выплаты
   отправить в «Нужды», чтобы хватило до следующей. */
export function PayPlanCard({ transactions, settings }) {
  const [open, setOpen] = useState(false);
  const plan = useMemo(() => computePayPlan(transactions, settings), [transactions, settings]);
  if (!plan) return null;

  const needs = bucketName(settings, "needs");
  const wants = bucketName(settings, "wants");
  const savings = bucketName(settings, "savings");

  const header = (
    <button type="button" className="section-title-toggle" onClick={() => setOpen((v) => !v)}>
      <SectionTitle>План до выплаты</SectionTitle>
      <ChevronDown size={16} className={`section-chevron${open ? " open" : ""}`} />
    </button>
  );

  if (plan.status === "nodata") {
    return (
      <div className="panel">
        {header}
        {open && <div className="small-note">Нужна хотя бы неделя трат, чтобы составить план до выплаты.</div>}
      </div>
    );
  }

  const d = plan.next.daysLeft;
  const days = `${d} ${ruPlural(d, "день", "дня", "дней")}`;
  const short = plan.status === "short";
  const a = plan.after;

  return (
    <div className="panel">
      {header}

      <div style={{ fontSize: 14, fontWeight: 800, color: short ? C.danger : C.sber, margin: "2px 0 4px" }}>
        {short
          ? `До ${shortDate(plan.next.date)} (${days}) не хватает ≈ ${formatMoney(Math.round(plan.gap))}`
          : `Хватит до ${shortDate(plan.next.date)} (${days}), запас ≈ ${formatMoney(Math.round(plan.surplus))}`}
      </div>

      {open && (
        <>
          <div className="fc-list">
            <Row name={`На карте «${needs}»`} value={formatMoney(Math.round(plan.have))} />
            <Row
              name="Обязательные платежи до выплаты"
              sub={plan.obligations.length ? plan.obligations.map((o) => `${o.name} · ${o.overdue ? "пора" : shortDate(o.date)} · ${formatMoney(Math.round(o.amount))}`).join("; ") : "ничего не ожидается"}
              value={formatMoney(Math.round(plan.obligationsTotal))}
            />
            <Row
              name="Обычные траты"
              sub={`≈ ${formatMoney(Math.round(plan.rate))} в день × ${d} (по последним ${plan.span} ${ruPlural(plan.span, "дню", "дням", "дням")})`}
              value={formatMoney(Math.round(plan.rate * d))}
            />
            <Row name="Нужно до выплаты" value={formatMoney(Math.round(plan.need))} color={short ? C.danger : undefined} />
          </div>

          {short && (
            <>
              <Heading>Чтобы дотянуть</Heading>
              <div className="small-note">
                Тратьте не больше {formatMoney(plan.safeDaily)} в день
                {plan.limits.length ? `: ${plan.limits.map((l) => `${l.name} до ${formatMoney(l.limit)}`).join(", ")}` : ""}.
                Или добавьте ≈ {formatMoney(ceil100(plan.gap))} в «{needs}» из «{wants}».
              </div>
            </>
          )}

          {plan.lastMonth.top.length > 0 && (
            <>
              <Heading>Больше всего ушло в прошлом месяце</Heading>
              <div className="fc-list">
                {plan.lastMonth.top.map((c) => (
                  <Row key={c.name} name={c.name} sub={c.mandatory ? "обязательная" : null} value={formatMoney(Math.round(c.sum))} />
                ))}
              </div>
            </>
          )}

          {a && (
            <>
              <Heading>
                Выплата {shortDate(plan.next.date)}
                {a.expected ? ` (≈ ${formatMoney(a.expected)})` : ""}: как распределить, чтобы хватило до {shortDate(a.date)}
              </Heading>
              {a.expected ? (
                <div className="fc-list">
                  <Row
                    name={`В «${needs}»`}
                    sub={`${a.daysNext} ${ruPlural(a.daysNext, "день", "дня", "дней")}: обычные траты ≈ ${formatMoney(Math.round((a.needNext - a.obligationsTotal)))}${a.obligationsTotal > 0 ? `, обязательные ${formatMoney(Math.round(a.obligationsTotal))}` : ""}. По правилу 50/30/20 было бы ${formatMoney(a.byRule.needs)}`}
                    value={formatMoney(a.toNeeds)}
                  />
                  <Row name={`В «${wants}»`} sub={`по правилу ${formatMoney(a.byRule.wants)}`} value={formatMoney(a.toWants)} />
                  <Row name={`В «${savings}»`} sub={`по правилу ${formatMoney(a.byRule.savings)}`} value={formatMoney(a.toSavings)} />
                </div>
              ) : (
                <div className="small-note">
                  До {shortDate(a.date)} понадобится ≈ {formatMoney(Math.round(a.needNext))}. Когда в истории появятся доходы в дни выплат, подскажу, как распределить каждую выплату.
                </div>
              )}
            </>
          )}

          {a && a.notes && a.notes.length > 0 && (
            <div className="small-note" style={{ marginTop: 8 }}>
              {a.monthPlan && (
                <div style={{ marginBottom: 4, fontWeight: 700 }}>
                  План месяца (≈ {formatMoney(Math.round(a.monthPlan.monthTotal))}): {needs} {formatMoney(Math.round(a.monthPlan.needTarget))}, {wants} {formatMoney(Math.round(a.monthPlan.wantTarget))}, {savings} {formatMoney(Math.round(a.monthPlan.saveTarget))}
                </div>
              )}
              {a.notes.map((n, i) => (
                <div key={i} style={{ marginBottom: 4 }}>{n}</div>
              ))}
            </div>
          )}

          <div className="small-note" style={{ marginTop: 10, marginBottom: 0 }}>
            Суммы выплат и «обязательные» платежи берутся из ваших операций. Отметить категорию обязательной можно в настройках («Категории нужд»).
          </div>
        </>
      )}
    </div>
  );
}
