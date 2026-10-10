import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { bucketName, cardLabel, formatMoney } from "./format.js";
import { findTransferPairs, looksDuplicate, parseBankText } from "./bankParse.js";
import { MONTHS_SHORT } from "./constants.js";
import { duplicateIds, rememberOp } from "./dedupe.js";

const SOURCE_NAME = { sber: "Сбер", alfa: "Альфа", ozon: "Озон", other: "Банк" };

/* Дата и время получения в местном часовом поясе. */
export function receivedParts(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

/* «Лист ожидания»: уведомления банков, которые ещё не стали операциями.
   ✓ — внести как есть (если угадана категория), ✎ — открыть форму и поправить, ✕ — убрать. */
export function InboxPanel({ pending, settings, transactions, onAccept, onEdit, onDismiss, onAcceptTransfer, onEditTransfer, onDismissTransfer }) {
  const [open, setOpen] = useState({}); // id записи → показан исходный текст
  const rows = useMemo(
    () =>
      pending.map((row) => {
        const parsed = parseBankText(row.raw_text, row.source, settings);
        const when = receivedParts(row.received_at);
        return { row, parsed, when, dup: looksDuplicate(parsed, when.date, transactions) };
      }),
    [pending, settings, transactions]
  );

  // Повторы: та же операция пришла и SMS, и push (или дважды подряд) — оставляем одну, самую подробную.
  const dupIds = useMemo(() => duplicateIds(rows), [rows]);

  // Служебные уведомления (вход в приложение, коды) и повторы убираем сами: денег в них нет / операция уже есть.
  const dismissedRef = useRef(new Set());
  useEffect(() => {
    rows.forEach((r) => {
      if ((r.parsed.ignorable || dupIds.has(r.row.id)) && !dismissedRef.current.has(r.row.id)) {
        dismissedRef.current.add(r.row.id);
        onDismiss(r.row);
      }
    });
  }, [rows, dupIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Перевод между своими картами = два уведомления (списано + поступило): показываем одной строкой.
  const visible = useMemo(() => rows.filter((r) => !r.parsed.ignorable && !dupIds.has(r.row.id)), [rows, dupIds]);
  const pairs = useMemo(() => findTransferPairs(visible), [visible]);
  const pairedIds = new Set(pairs.flatMap((p) => [p.out.row.id, p.in.row.id]));
  const singles = visible.filter((r) => !pairedIds.has(r.row.id));
  const total = singles.length + pairs.length;

  if (!total) return null;

  return (
    <div className="panel panel-compact">
      <SectionTitle>Лист ожидания · {total}</SectionTitle>
      <div className="fc-list">
        {pairs.map((p) => {
          const from = cardLabel(settings, p.out.parsed.card);
          const to = cardLabel(settings, p.in.parsed.card);
          return (
            <div className="fc-row" key={`${p.out.row.id}+${p.in.row.id}`} style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="fc-name">Перевод между своими картами</div>
                <div className="fc-sub">{from} → {to} · {p.out.when.label}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                <span className="fc-val mono">{formatMoney(p.amount)}</span>
                <button type="button" className="btn primary" aria-label="Внести перевод" title="Внести перевод" style={{ width: 34, height: 32, padding: 0 }} onClick={() => onAcceptTransfer(p)}>
                  <Check size={15} />
                </button>
                <button type="button" className="btn" aria-label="Править перевод" style={{ width: 34, height: 32, padding: 0 }} onClick={() => onEditTransfer(p)}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="btn" aria-label="Убрать перевод" style={{ width: 34, height: 32, padding: 0 }} onClick={() => onDismissTransfer(p)}>
                  <X size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {singles.map(({ row, parsed, when, dup }) => {
          const canAccept = parsed.type === "expense" && parsed.understood && !!parsed.suggestion && !!parsed.card;
          const sign = parsed.type === "income" ? "+" : "−";
          const color = parsed.type === "income" ? C.sber : C.danger;
          const title = parsed.understood ? parsed.merchant || (parsed.type === "income" ? "Поступление" : "Расход") : "Не распознано";
          let sub = `${SOURCE_NAME[row.source] || "Банк"} · ${when.label}`;
          if (parsed.understood && parsed.type === "expense") {
            sub += parsed.suggestion
              ? ` · ${parsed.suggestion.category}`
              : " · выберите категорию";
          } else if (parsed.understood) {
            sub += " · доход";
          }
          return (
            <div className="fc-row" key={row.id} style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  className="fc-name"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                  onClick={() => setOpen((o) => ({ ...o, [row.id]: !o[row.id] }))}
                >
                  {title}
                </div>
                <div className="fc-sub">{sub}</div>
                {(!parsed.understood || open[row.id]) && (
                  <div className="fc-sub" style={{ marginTop: 2, wordBreak: "break-word" }}>{open[row.id] ? row.raw_text : row.raw_text.slice(0, 110)}</div>
                )}
                {dup && <div className="fc-sub" style={{ color: C.danger }}>возможно, уже внесено</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                {parsed.understood && (
                  <span className="fc-val mono" style={{ color }}>{sign}{formatMoney(parsed.amount)}</span>
                )}
                <button
                  type="button"
                  className="btn primary"
                  aria-label="Внести как есть"
                  title={canAccept ? "Внести как есть" : "Сначала выберите категорию (✎)"}
                  disabled={!canAccept}
                  style={{ width: 34, height: 32, padding: 0 }}
                  onClick={() => onAccept(row, parsed)}
                >
                  <Check size={15} />
                </button>
                <button type="button" className="btn" aria-label="Править" style={{ width: 34, height: 32, padding: 0 }} onClick={() => onEdit(row, parsed)}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="btn" aria-label="Убрать" style={{ width: 34, height: 32, padding: 0 }} onClick={() => {
                  if (parsed.understood) rememberOp({ source: row.source, type: parsed.type, amount: parsed.amount, balance: parsed.balance, receivedAt: row.received_at });
                  onDismiss(row);
                }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
