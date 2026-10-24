import React, { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { MonthNav, SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { formatMoney, monthLabel, todayMonthKey, todayStr, uid } from "./format.js";
import { SHARED_CAT_COLORS, balanceFor, isSettle, itemsOfMonth, monthSummary, sharedCatsOf } from "./shared.js";
import { SpaceSwitch } from "./spaces.jsx";

const POOL = "__pool"; // «платили с общей карты»
const dayLabel = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "");

/* Экран пространства «Общая»: баланс «кто кому должен», траты месяца по категориям, список, форма добавления. */
export function SharedView({
  items,
  cats,
  names,
  myId,
  partnerId,
  state, // loading | ready | error
  errorText,
  onRetry,
  selectedMonth,
  setSelectedMonth,
  formOpen,
  setFormOpen,
  onAddItem,
  onDeleteItem,
  onAddCat,
}) {
  const catList = sharedCatsOf(cats);
  const catById = useMemo(() => Object.fromEntries(catList.map((c) => [c.id, c])), [catList]);
  const payerName = (id) => (id === myId ? names.me : names.partner);

  const monthItems = useMemo(
    () => itemsOfMonth(items, selectedMonth).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [items, selectedMonth]
  );
  const sum = useMemo(() => monthSummary(monthItems, myId), [monthItems, myId]);
  const net = useMemo(() => balanceFor(items, myId), [items, myId]);
  const catRows = Object.entries(sum.byCat).sort((a, b) => b[1] - a[1]);

  function settle() {
    const debtor = net < 0 ? myId : partnerId;
    const who = net < 0 ? names.me : names.partner;
    const text = `Отметить, что «${who}» рассчитался на ${formatMoney(Math.abs(net))}?`;
    if (!window.confirm(text)) return;
    onAddItem({ id: uid(), kind: "settle", date: todayStr(), amount: Math.abs(Math.round(net * 100) / 100), paidBy: debtor, note: "Расчёт" });
  }

  return (
    <div className="screen-stack">
      <div className="month-row">
        <MonthNav compact value={selectedMonth} onChange={setSelectedMonth} />
        <SpaceSwitch variant="compact" />
      </div>

      {state === "loading" && <div className="panel muted" style={{ textAlign: "center", fontSize: 13 }}>Загружаю общую книгу…</div>}

      {state === "error" && (
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{errorText || "Не получилось загрузить общую книгу."}</div>
          <button type="button" className="btn" onClick={onRetry}>Повторить</button>
        </div>
      )}

      {state === "ready" && (
        <>
          <div className="panel">
            <SectionTitle>Баланс</SectionTitle>
            {Math.abs(net) < 1 ? (
              <div style={{ fontSize: 15, fontWeight: 700 }}>Расчёты равны</div>
            ) : (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: net > 0 ? C.sber : C.danger }}>
                  {net > 0 ? "+" : "−"}{formatMoney(Math.abs(net))}
                </div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  {net > 0 ? `«${names.partner}» должен вам` : `Вы должны «${names.partner}»`}
                </div>
                <button type="button" className="btn" style={{ width: "100%" }} onClick={settle}>Рассчитались</button>
              </>
            )}
          </div>

          <div className="panel">
            <SectionTitle>{monthLabel(selectedMonth)}: общие траты</SectionTitle>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{formatMoney(sum.total)}</div>
            {sum.total > 0 && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                {sum.pool > 0 && `С общих карт: ${formatMoney(sum.pool)}`}
                {sum.pool > 0 && (sum.mine > 0 || sum.theirs > 0) && " · "}
                {(sum.mine > 0 || sum.theirs > 0) && `Заплатили: ${names.me} ${formatMoney(sum.mine)} · ${names.partner} ${formatMoney(sum.theirs)}`}
              </div>
            )}
            {catRows.length === 0 && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>В этом месяце общих трат пока нет.</div>}
            {catRows.map(([id, v]) => {
              const cat = catById[id] || { name: "Без категории", color: C.inkMuted };
              return (
                <div key={id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700 }}>{cat.name}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(v)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.border }}>
                    <div style={{ height: 6, borderRadius: 3, width: `${Math.max(3, (v / sum.total) * 100)}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="btn primary" style={{ width: "100%" }} onClick={() => setFormOpen(true)}>
            Добавить общую трату
          </button>

          {monthItems.length > 0 && (
            <div className="panel">
              <SectionTitle>Операции</SectionTitle>
              {monthItems.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isSettle(i) ? "Расчёт" : (catById[i.catId]?.name || "Без категории")}
                      {i.note && !isSettle(i) ? ` · ${i.note}` : ""}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {dayLabel(i.date)} · {isSettle(i) ? `${payerName(i.paidBy)} отдал(а)` : i.pool ? `с общей карты · ${payerName(i.paidBy)}` : `платил(а) ${payerName(i.paidBy)}`}
                      {!isSettle(i) && !i.pool && Number(i.split ?? 50) !== 50 ? ` · доля платившего ${Math.round(Number(i.split ?? 50))}%` : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: "tabular-nums", color: isSettle(i) ? C.ozon : C.ink }}>
                    {formatMoney(i.amount)}
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить"
                    onClick={() => { if (window.confirm("Удалить запись из общей книги?")) onDeleteItem(i.id); }}
                    style={{ border: 0, background: "transparent", color: C.inkMuted, padding: 6, cursor: "pointer" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <SharedForm
          cats={catList}
          names={names}
          myId={myId}
          partnerId={partnerId}
          defaultMonth={selectedMonth}
          onCancel={() => setFormOpen(false)}
          onAddCat={onAddCat}
          onSubmit={(item) => { onAddItem(item); setFormOpen(false); }}
        />
      )}
    </div>
  );
}

function SharedForm({ cats, names, myId, partnerId, defaultMonth, onCancel, onAddCat, onSubmit }) {
  const today = todayStr();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultMonth === todayMonthKey() ? today : `${defaultMonth}-01`);
  const [catId, setCatId] = useState(cats[0]?.id || "other");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState(myId);
  const [split, setSplit] = useState("50");

  async function addCategory() {
    const name = (window.prompt("Название новой общей категории") || "").trim();
    if (!name) return;
    const id = uid();
    const color = SHARED_CAT_COLORS[cats.length % SHARED_CAT_COLORS.length];
    await onAddCat({ id, name, color });
    setCatId(id);
  }

  function submit(e) {
    e.preventDefault();
    const a = Number(String(amount).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) { window.alert("Введите сумму больше 0"); return; }
    const pool = paidBy === POOL;
    const sp = Number(String(split).replace(",", "."));
    if (!pool && (!Number.isFinite(sp) || sp < 0 || sp > 100)) { window.alert("Доля платившего: от 0 до 100 %"); return; }
    onSubmit({
      id: uid(),
      kind: "expense",
      date,
      amount: Math.round(a * 100) / 100,
      catId,
      note: note.trim(),
      paidBy: pool ? myId : paidBy,
      split: pool ? 50 : sp,
      ...(pool ? { pool: true } : {}),
      createdBy: myId,
    });
  }

  return (
    <form className="panel" onSubmit={submit} style={{ border: `2px solid ${C.ozon}` }}>
      <SectionTitle>Новая общая трата</SectionTitle>
      <div className="field">
        <label>Сумма</label>
        <input type="text" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Категория</label>
        <select value={catId} onChange={(e) => (e.target.value === "__new" ? addCategory() : setCatId(e.target.value))}>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__new">＋ Новая категория…</option>
        </select>
      </div>
      <div className="field">
        <label>Кто платил</label>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          <option value={myId}>{names.me}</option>
          <option value={partnerId}>{names.partner}</option>
          <option value={POOL}>Общая карта</option>
        </select>
      </div>
      {paidBy !== POOL && (
        <div className="field">
          <label>Доля платившего, % (50 — пополам)</label>
          <input type="text" inputMode="decimal" value={split} onChange={(e) => setSplit(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Заметка</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="button-row" style={{ marginTop: 0 }}>
        <button type="button" className="btn" onClick={onCancel}>Отмена</button>
        <button type="submit" className="btn primary">Добавить</button>
      </div>
    </form>
  );
}
