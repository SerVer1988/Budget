import React, { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { C } from "./constants.js";
import { bucketName, clampPct, formatMoney, moneyNum, todayStr, uid } from "./format.js";
import {
  changeGoalSaved,
  computeSavingsSeries,
  deadlineLabel,
  freeFunds,
  monthlyNeed,
  totalAllocated,
} from "./savings.js";

function compactMoney(v) {
  const a = Math.abs(v);
  if (a >= 1000000) return `${Math.round(v / 100000) / 10} млн`;
  if (a >= 1000) return `${Math.round(v / 1000)} т`;
  return String(Math.round(v));
}

/* ---------- график роста сбережений ---------- */
export function SavingsChart({ transactions, settings }) {
  const series = useMemo(() => computeSavingsSeries(transactions, settings), [transactions, settings]);
  const { points, goal, eta, monthsLeft, reachesGoalInWindow } = series;
  if (points.length < 2) return null;

  let footer;
  if (monthsLeft === 0) footer = "Цель достигнута";
  else if (eta) footer = `При текущем темпе цель будет достигнута в ${eta.monthPrep} ${eta.year}`;
  else footer = "Темп накоплений пока не позволяет оценить дату цели";

  return (
    <div className="soft-card" style={{ padding: "12px 10px 10px" }}>
      <div className="section-title" style={{ margin: "0 4px 8px" }}>Рост «{bucketName(settings, "savings")}»</div>
      <div style={{ width: "100%", height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: -6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.inkMuted }} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} tickFormatter={compactMoney} width={42} domain={[0, "auto"]} />
            <Tooltip formatter={(v) => formatMoney(v)} labelStyle={{ fontWeight: 700 }} />
            {reachesGoalInWindow && goal > 0 && <ReferenceLine y={goal} stroke={C.amber} strokeDasharray="4 3" />}
            <Line type="monotone" dataKey="fact" name="Баланс" stroke={C.ozon} strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls={false} />
            <Line type="monotone" dataKey="plan" name="Прогноз" stroke={C.ozon} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 11.5, color: C.inkMuted, margin: "6px 4px 0" }}>{footer}</div>
    </div>
  );
}

/* ---------- цели внутри «Сбережений» ---------- */
export function GoalsPanel({ settings, savingsBalance, onSaveSettings }) {
  const goals = settings.goals || [];
  const today = todayStr();
  const free = freeFunds(settings, savingsBalance);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", target: "", deadline: "" });
  const [editor, setEditor] = useState(null); // { id, mode: "add" | "take", amount }
  const [error, setError] = useState("");

  function save(nextGoals) {
    onSaveSettings({ ...settings, goals: nextGoals });
  }

  function createGoal() {
    const name = form.name.trim();
    const target = moneyNum(form.target);
    if (!name) { setError("Введите название цели"); return; }
    if (!(target > 0)) { setError("Укажите сумму цели"); return; }
    save([...goals, { id: uid(), name, target, saved: 0, deadline: form.deadline || "" }]);
    setForm({ name: "", target: "", deadline: "" });
    setAdding(false);
    setError("");
  }

  function applyEditor() {
    const amount = moneyNum(editor.amount);
    const res = changeGoalSaved(settings, savingsBalance, editor.id, editor.mode === "add" ? amount : -amount);
    if (res.error) { setError(res.error); return; }
    save(res.goals);
    setEditor(null);
    setError("");
  }

  function removeGoal(g) {
    if (!window.confirm(`Удалить цель «${g.name}»? Накопленное (${formatMoney(g.saved)}) вернётся в свободные деньги.`)) return;
    save(goals.filter((x) => x.id !== g.id));
  }

  return (
    <div>
      <div className="section-title">Цели</div>

      {goals.length > 0 && (
        <div style={{ fontSize: 12, color: free < 0 ? C.danger : C.inkMuted, margin: "0 2px 8px" }}>
          Свободно: <span className="mono" style={{ fontWeight: 800 }}>{formatMoney(free)}</span>
          {" "}из {formatMoney(savingsBalance)} · в целях {formatMoney(totalAllocated(goals))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {goals.map((g) => {
          const pct = g.target > 0 ? g.saved / g.target : 0;
          const done = g.saved >= g.target;
          const need = monthlyNeed(g, today);
          const isEditing = editor && editor.id === g.id;
          return (
            <div key={g.id} className="soft-card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.name}
                </div>
                <div className="mono" style={{ fontSize: 12, color: C.inkMuted, whiteSpace: "nowrap" }}>
                  {formatMoney(g.saved)} / {formatMoney(g.target)}
                </div>
              </div>

              <div className="progress" style={{ margin: "8px 0 6px" }}>
                <div style={{ width: `${clampPct(pct) * 100}%`, background: done ? C.sber : C.ozon }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: C.inkMuted }}>
                <span className="mono">{Math.round(clampPct(pct) * 100)}%</span>
                <span style={{ textAlign: "right" }}>
                  {done
                    ? "цель собрана"
                    : need
                    ? need.overdue
                      ? `срок прошёл, не хватает ${formatMoney(need.rest)}`
                      : `≈ ${formatMoney(need.perMonth)} в месяц до ${deadlineLabel(g.deadline, today)}`
                    : `осталось ${formatMoney(g.target - g.saved)}`}
                </span>
              </div>

              {isEditing ? (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <input
                    className="amount-input"
                    style={{ flex: 1, minWidth: 0, height: 36, padding: "0 10px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14 }}
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    placeholder={editor.mode === "add" ? "Сколько отложить" : "Сколько снять"}
                    value={editor.amount}
                    onChange={(e) => setEditor({ ...editor, amount: e.target.value })}
                  />
                  <button type="button" className="btn primary" style={{ height: 36 }} onClick={applyEditor}>OK</button>
                  <button type="button" className="btn" style={{ height: 36 }} onClick={() => { setEditor(null); setError(""); }}>Отмена</button>
                </div>
              ) : (
                <div className="button-row" style={{ marginTop: 10 }}>
                  <button type="button" className="btn" onClick={() => { setEditor({ id: g.id, mode: "add", amount: "" }); setError(""); }}>
                    Отложить
                  </button>
                  <button type="button" className="btn" disabled={g.saved <= 0} onClick={() => { setEditor({ id: g.id, mode: "take", amount: "" }); setError(""); }}>
                    Снять
                  </button>
                  <button type="button" className="btn" aria-label="Удалить цель" style={{ flex: "0 0 40px" }} onClick={() => removeGoal(g)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {adding ? (
          <div className="soft-card" style={{ padding: 12 }}>
            <div className="field">
              <label>Название цели</label>
              <input type="text" value={form.name} placeholder="Отпуск, ноутбук…" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Сумма цели</label>
              <input type="text" inputMode="decimal" value={form.target} placeholder="150000" onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </div>
            <div className="field">
              <label>Срок (необязательно)</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="button-row" style={{ marginTop: 0 }}>
              <button type="button" className="btn primary" onClick={createGoal}>Создать</button>
              <button type="button" className="btn" onClick={() => { setAdding(false); setError(""); }}>Отмена</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => { setAdding(true); setError(""); }}>
            + Новая цель
          </button>
        )}
      </div>

      {error && <div className="muted" style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
