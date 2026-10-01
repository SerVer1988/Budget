import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
} from "lucide-react";
import { CategoryPanel, OzonPanel } from "./panels.jsx";
import { C, CARD_BUCKET } from "./constants.js";
import { computeBalances } from "./finance.js";
import { bucketName, bucketNameGen, bucketOf, cardLabel, catListOf, evalMoneyExpr, formatMoney, homeCardOf, moneyNum, todayStr, uid } from "./format.js";

/* ============================================================ Add form */
export function cardOptionsFor(settings) {
  return [
    { id: "sber", label: bucketName(settings, "needs"), color: C.sber, soft: C.sberSoft },
    { id: "alfa", label: bucketName(settings, "wants"), color: C.alfa, soft: C.alfaSoft },
    { id: "ozon", label: bucketName(settings, "savings"), color: C.ozon, soft: C.ozonSoft },
  ];
}

export function CardPicker({ options, value, onChange }) {
  return (
    <div className="card-picker">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`card-picker-item ${value === o.id ? "active" : ""}`}
          style={{ "--pick-color": o.color, "--pick-soft": o.soft }}
        >
          <div className="main" style={{ color: value === o.id ? o.color : C.ink }}>{o.label}</div>
          {o.sub && <div className="sub">{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

export function OperationTabs({ value, onChange }) {
  const tabs = [
    { id: "expense", label: "Трата" },
    { id: "income", label: "Доход" },
    { id: "transfer", label: "Перевод" },
    { id: "adjustment", label: "Коррекция" },
  ];

  return (
    <div className="operation-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={value === t.id ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function bucketOptions(settings) {
  return [
    { id: "needs", label: bucketName(settings, "needs"), color: C.sber, soft: C.sberSoft },
    { id: "wants", label: bucketName(settings, "wants"), color: C.alfa, soft: C.alfaSoft },
  ];
}

export function AmountField({ label, value, onChange, big, withSave }) {
  const evaluated = evalMoneyExpr(value);
  const stripped = String(value ?? "").trim().replace(/^-/, "");
  const hasOp = /[+\-*/]/.test(stripped);
  const showPreview = String(value ?? "") !== "" && hasOp && Number.isFinite(evaluated);

  const input = (
    <input
      className={big ? "amount-input mono" : "mono"}
      inputMode="decimal"
      type="text"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <div className="field">
      <label>{label}</label>
      {withSave ? (
        <div className="amount-row">
          {input}
          <button type="submit" className="btn primary amount-save">Сохранить</button>
        </div>
      ) : (
        input
      )}
      {showPreview && (
        <div className="small-note" style={{ marginTop: -1 }}>
          = {formatMoney(evaluated)}
        </div>
      )}
    </div>
  );
}

export function FullAddForm({ settings, transactions, initial, onSubmit, onCancel }) {
  const cardOptions = cardOptionsFor(settings);
  const defaultCategoryFor = (bucket) => catListOf(settings, bucket)[0]?.name || "";
  const initialBucket = initial?.bucket || bucketOf(initial?.card || "sber");

  const [type, setType] = useState(initial?.type || "expense");
  const [date, setDate] = useState(initial?.date || todayStr());
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [card, setCard] = useState(initial?.card || homeCardOf(initialBucket));
  const [bucket, setBucket] = useState(initialBucket);
  const [fromCard, setFromCard] = useState(initial?.fromCard || "sber");
  const [toCard, setToCard] = useState(initial?.toCard || "alfa");
  const [category, setCategory] = useState(initial?.category || defaultCategoryFor(initialBucket));
  const [note, setNote] = useState(initial?.note || "");
  // Галочка «Считать долгом» у перевода: по умолчанию включена (initial.debt === false её выключает).
  const [asDebt, setAsDebt] = useState(initial?.debt ?? true);
  // Галочка «Отображать в операциях» у корректировки: по умолчанию выключена.
  const [showInHistory, setShowInHistory] = useState(initial?.type === "adjustment" ? !initial?.hidden : false);

  const [split, setSplit] = useState(false);
  const [splitAmount2, setSplitAmount2] = useState("");
  const [bucket2, setBucket2] = useState(initialBucket);
  const [splitCategory2, setSplitCategory2] = useState("");

  useEffect(() => {
    const b = initial?.bucket || bucketOf(initial?.card || "sber");
    setType(initial?.type || "expense");
    setDate(initial?.date || todayStr());
    setAmount(initial?.amount ?? "");
    setCard(initial?.card || homeCardOf(b));
    setBucket(b);
    setBucket2(b);
    setFromCard(initial?.fromCard || "sber");
    setToCard(initial?.toCard || "alfa");
    setCategory(initial?.category || defaultCategoryFor(b));
    setNote(initial?.note || "");
    setAsDebt(initial?.debt ?? true);
    setShowInHistory(initial?.type === "adjustment" ? !initial?.hidden : false);
    setSplit(false);
    setSplitAmount2("");
    setSplitCategory2("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (type !== "expense") return;
    const list = catListOf(settings, bucket);
    if (!list.some((c) => c.name === category)) {
      setCategory(list[0]?.name || "");
    }
  }, [type, bucket, category, settings.needCats, settings.wantCats]);

  useEffect(() => {
    const list = catListOf(settings, bucket2);
    if (!list.some((c) => c.name === splitCategory2)) {
      setSplitCategory2(list[0]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket2, split, settings.needCats, settings.wantCats]);

  const amountNum = moneyNum(amount);
  const splitAmountNum = moneyNum(splitAmount2);
  // При разбивке «Сумма» — это общая сумма траты, а часть 1 = всего − часть 2.
  const part1Num = split ? amountNum - splitAmountNum : amountNum;
  const categories = catListOf(settings, bucket);
  const categories2 = catListOf(settings, bucket2);

  const isEdit = !!initial?.editId;

  // Свайп влево/вправо по форме листает вкладки Трата → Доход → Перевод → Коррекция и обратно.
  const OPERATION_TAB_ORDER = ["expense", "income", "transfer", "adjustment"];
  const formTouchRef = useRef(null);

  function handleFormTouchStart(e) {
    const t = e.touches[0];
    formTouchRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleFormTouchEnd(e) {
    const start = formTouchRef.current;
    formTouchRef.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.3) return;

    const idx = OPERATION_TAB_ORDER.indexOf(type);
    const next = (idx + (dx < 0 ? 1 : -1) + OPERATION_TAB_ORDER.length) % OPERATION_TAB_ORDER.length;
    setType(OPERATION_TAB_ORDER[next]);
  }

  // Части траты, оплаченные картой «чужого» бюджета, — каждая такая часть станет внутренним долгом.
  const expenseParts = type === "expense"
    ? [{ bucket, amount: part1Num }, ...(split ? [{ bucket: bucket2, amount: splitAmountNum }] : [])]
    : [];
  const anomalyParts = expenseParts.filter((p) => CARD_BUCKET[card] !== p.bucket);

  const transferDebtActive = type === "transfer" && asDebt && fromCard !== toCard;

  const computedBalance = useMemo(
    () => computeBalances(transactions || [], settings, date)[card],
    [transactions, settings, date, card]
  );
  const hasRealBalanceInput = amount !== "" && Number.isFinite(evalMoneyExpr(amount));
  const balanceDiff = Math.round(amountNum - computedBalance);
  const hasEditAmountInput = amount !== "" && Number.isFinite(evalMoneyExpr(amount)) && evalMoneyExpr(amount) !== 0;

  function submit(e) {
    e.preventDefault();

    if (type !== "adjustment" && (!amountNum || amountNum <= 0)) {
      window.alert("Введите сумму больше 0");
      return;
    }

    if (type === "transfer" && fromCard === toCard) {
      window.alert("Выберите разные карты для перевода");
      return;
    }

    if (type === "expense" && split) {
      if (!splitAmountNum || splitAmountNum <= 0) {
        window.alert("Укажите сумму второй части разбивки");
        return;
      }
      if (splitAmountNum >= amountNum) {
        window.alert("Вторая часть должна быть меньше общей суммы");
        return;
      }
      const groupId = uid();
      onSubmit([
        {
          type: "expense",
          date,
          amount: part1Num,
          card,
          bucket,
          category,
          note: note.trim(),
          splitGroup: groupId,
        },
        {
          type: "expense",
          date,
          amount: splitAmountNum,
          card,
          bucket: bucket2,
          category: splitCategory2,
          note: note.trim(),
          splitGroup: groupId,
        },
      ]);
      return;
    }

    if (type === "income") {
      onSubmit({
        type: "income",
        date,
        amount: amountNum,
        card,
        note: note.trim(),
      });
    } else if (type === "expense") {
      onSubmit({
        type: "expense",
        date,
        amount: amountNum,
        card,
        bucket,
        category,
        note: note.trim(),
      });
    } else if (type === "transfer") {
      onSubmit(
        {
          type: "transfer",
          date,
          amount: amountNum,
          fromCard,
          toCard,
          note: note.trim(),
        },
        { asDebt }
      );
    } else if (type === "adjustment" && isEdit) {
      if (!hasEditAmountInput) {
        window.alert("Введите сумму корректировки (не равную 0)");
        return;
      }
      onSubmit({
        type: "adjustment",
        date,
        amount: amountNum,
        card,
        note: note.trim() || "Сверка баланса",
        hidden: !showInHistory,
      });
    } else if (type === "adjustment") {
      if (!hasRealBalanceInput) {
        window.alert("Введите реальный баланс карты");
        return;
      }
      if (balanceDiff === 0) {
        onCancel();
        return;
      }
      onSubmit({
        type: "adjustment",
        date,
        amount: balanceDiff,
        card,
        note: note.trim() || "Сверка баланса",
        hidden: !showInHistory,
      });
    }
  }

  return (
    <form className="form-card" onSubmit={submit} onTouchStart={handleFormTouchStart} onTouchEnd={handleFormTouchEnd}>
      <div className="form-title-row">
        <h2>{isEdit ? "Изменить операцию" : "Новая операция"}</h2>
        <button type="button" onClick={onCancel} className="icon-button" aria-label="Закрыть">
          <X size={18} />
        </button>
      </div>

      <OperationTabs value={type} onChange={setType} />

      <AmountField
        label={
          type === "adjustment"
            ? (isEdit ? "Сумма корректировки" : "Реальный баланс карты сейчас")
            : type === "expense" && split
            ? "Сумма (всего)"
            : "Сумма"
        }
        value={amount}
        onChange={setAmount}
        big
        withSave
      />

      <div className="field">
        <label>Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {type === "expense" && (
        <>
          <div className="field">
            <label>{split ? "Категория бюджета (часть 1)" : "Категория бюджета"}</label>
            <CardPicker options={bucketOptions(settings)} value={bucket} onChange={setBucket} />
          </div>

          <div className="field">
            <label>{split ? "Категория (часть 1)" : "Категория"}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Карта списания</label>
            <CardPicker options={cardOptions} value={card} onChange={setCard} />
          </div>

          {anomalyParts.length > 0 && (
            <div
              className="notice"
              style={{ borderColor: C.amber, background: C.amberSoft, marginBottom: 11 }}
            >
              ⚠️ Вы платите картой «{cardLabel(settings, card)}» за другой бюджет — это запишется как долг:
              {anomalyParts.map((p, i) => (
                <div key={i} style={{ fontWeight: 700, marginTop: 3 }}>
                  «{bucketName(settings, p.bucket)}» должны «{bucketNameGen(settings, CARD_BUCKET[card])}»{p.amount > 0 ? ` ${formatMoney(p.amount)}` : ""}
                </div>
              ))}
              <div style={{ marginTop: 3 }}>Долг погасится автоматически из следующего дохода.</div>
            </div>
          )}

          <div className="field" style={{ marginBottom: split ? 11 : 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={split}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSplit(checked);
                  if (checked) setBucket2(bucket);
                }}
                style={{ width: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Разделить</span>
            </label>
          </div>

          {split && (
            <>
              <AmountField
                label="Сумма (часть 2)"
                value={splitAmount2}
                onChange={setSplitAmount2}
              />
              <div className="field">
                <label>Категория бюджета (часть 2)</label>
                <CardPicker options={bucketOptions(settings)} value={bucket2} onChange={setBucket2} />
              </div>
              <div className="field">
                <label>Категория (часть 2)</label>
                <select value={splitCategory2} onChange={(e) => setSplitCategory2(e.target.value)}>
                  {categories2.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="small-note" style={{ marginBottom: 11 }}>
                Часть 1: {formatMoney(Math.max(0, part1Num))} · спишется с «{cardLabel(settings, card)}»: {formatMoney(amountNum)}
              </div>
            </>
          )}
        </>
      )}

      {type === "income" && (
        <div className="field">
          <label>Куда пришёл доход</label>
          <CardPicker options={cardOptions} value={card} onChange={setCard} />
        </div>
      )}

      {type === "transfer" && (
        <div className="form-grid-2">
          <div className="field">
            <label>Откуда</label>
            <select value={fromCard} onChange={(e) => setFromCard(e.target.value)}>
              {cardOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Куда</label>
            <select value={toCard} onChange={(e) => setToCard(e.target.value)}>
              {cardOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {type === "transfer" && (
        <>
          <div className="field" style={{ marginBottom: transferDebtActive ? 6 : 11 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={asDebt}
                onChange={(e) => setAsDebt(e.target.checked)}
                style={{ width: "auto", height: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Считать долгом</span>
            </label>
          </div>

        </>
      )}

      {type === "adjustment" && (
        <>
          <div className="field">
            <label>Карта</label>
            <CardPicker options={cardOptions} value={card} onChange={setCard} />
          </div>

          <div className="field" style={{ marginBottom: 11 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showInHistory}
                onChange={(e) => setShowInHistory(e.target.checked)}
                style={{ width: "auto", height: "auto" }}
              />
              <span style={{ textTransform: "none", letterSpacing: 0 }}>Отображать в операциях</span>
            </label>
          </div>

          {!isEdit && (
            <div
              className="notice"
              style={
                !hasRealBalanceInput
                  ? {}
                  : balanceDiff === 0
                  ? { borderColor: "#2D8C6F", background: "#E4F2EC", color: "#1F5C46" }
                  : balanceDiff > 0
                  ? { borderColor: C.sber, background: C.sberSoft, color: "#1E5C39" }
                  : { borderColor: C.danger, background: C.dangerSoft, color: "#7A241C" }
              }
            >
              <div style={{ marginBottom: 4 }}>
                В приложении на {date}: <b className="mono">{formatMoney(computedBalance)}</b>
              </div>
              {!hasRealBalanceInput ? (
                <div>Введите баланс, который видите в банке — сравним с расчётом приложения.</div>
              ) : balanceDiff === 0 ? (
                <div>Совпадает с приложением. Корректировка не нужна — просто закройте форму.</div>
              ) : balanceDiff > 0 ? (
                <div>
                  На карте на {formatMoney(balanceDiff)} больше, чем в приложении. «Сохранить» внесёт пополнение
                  на эту сумму в историю.
                </div>
              ) : (
                <div>
                  На карте на {formatMoney(Math.abs(balanceDiff))} меньше, чем в приложении. «Сохранить» внесёт
                  списание на эту сумму в историю.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="field">
        <label>Заметка</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
      </div>
    </form>
  );
}

/* ============================================================ Add view */
export function AddPageContent({
  pageIndex,
  settings,
  transactions,
  openForm,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelectPage,
  onDeleteTx,
  onEditTx,
}) {
  const balances = useMemo(() => computeBalances(transactions, settings, null), [transactions, settings]);

  const pages = [
    {
      render: () => (
        <CategoryPanel
          title={bucketName(settings, "needs")}
          card="sber"
          categories={settings.needCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          onDeleteTx={onDeleteTx}
          onEditTx={onEditTx}
        />
      ),
    },
    {
      render: () => (
        <CategoryPanel
          title={bucketName(settings, "wants")}
          card="alfa"
          categories={settings.wantCats}
          transactions={transactions}
          settings={settings}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          onDeleteTx={onDeleteTx}
          onEditTx={onEditTx}
        />
      ),
    },
    {
      render: () => (
        <OzonPanel
          settings={settings}
          transactions={transactions}
          balances={balances}
          activeIndex={pageIndex}
          onSelectBucket={onSelectPage}
          onOpenFull={openForm}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      ),
    },
  ];

  const current = pages[pageIndex];

  return (
    <div className="screen-stack">
      {current.render()}
    </div>
  );
}

/* Builds a FullAddForm "initial" seed from an existing transaction, for editing.
   Для перевода галочка «Считать долгом» включена, только если к нему уже привязан долг. */
export function deriveFormInitialFromTx(tx, transactions) {
  const base = { type: tx.type, date: tx.date, amount: tx.amount, note: tx.note || "", editId: tx.id };
  if (tx.type === "expense") {
    return { ...base, card: tx.card, bucket: tx.bucket || bucketOf(tx.card), category: tx.category };
  }
  if (tx.type === "income") {
    return { ...base, card: tx.card };
  }
  if (tx.type === "transfer") {
    const linked = (transactions || []).some((t) => t.type === "debt" && t.sourceTxId === tx.id);
    return { ...base, fromCard: tx.fromCard, toCard: tx.toCard, debt: linked };
  }
  if (tx.type === "adjustment") {
    return { ...base, card: tx.card };
  }
  return base;
}
