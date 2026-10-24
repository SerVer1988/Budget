import { knownPeople } from "./loans.js";
import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CalendarClock,
  HandCoins,
  Pencil,
  SlidersHorizontal,
  Split,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { CategoryPanel, OzonPanel } from "./panels.jsx";
import { ReceiptField } from "./ReceiptViewer.jsx";
import { C, CARD_BUCKET, getIcon } from "./constants.js";
import { OpChips, OpDate, OpGroup, OpSelect, OpTabs, OpText, OpToggle, RoundIcon } from "./OpUi.jsx";
import { computeBalances } from "./finance.js";
import { SpaceContext } from "./spaces.jsx";
import { guessSharedCat } from "./shared.js";
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
    { id: "loan", label: "Долги" },
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

/* Сумма. Вычисления прямо в строке работают как раньше («1200+350» → 1 550), отдельных кнопок со знаками нет. */
export function AmountField({ label, value, onChange, big }) {
  const evaluated = evalMoneyExpr(value);
  const stripped = String(value ?? "").trim().replace(/^-/, "");
  const hasOp = /[+\-*/]/.test(stripped);
  const showPreview = String(value ?? "") !== "" && hasOp && Number.isFinite(evaluated);

  if (big) {
    return (
      <>
        <div className="op-amount-line">
          <input
            className="op-amount mono"
            inputMode="decimal"
            type="text"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
          />
          <span className="op-amount-cur">₽</span>
        </div>
        <div className="op-amount-hint">
          {label}
          {showPreview ? ` · = ${formatMoney(evaluated)}` : ""}
        </div>
      </>
    );
  }

  return (
    <div className="op-row">
      <RoundIcon icon={Banknote} color="#5B6B62" />
      <div className="op-body">
        <div className="op-label">{label}{showPreview ? ` · = ${formatMoney(evaluated)}` : ""}</div>
        <input
          className="op-input mono"
          inputMode="decimal"
          type="text"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
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
  const [notEarned, setNotEarned] = useState(!!initial?.excludeIncome); // доход «не заработок»: не делится и не входит в статистику
  // Личные долги: кто и в какую сторону ("lent" — вы дали в долг, "borrowed" — вам дали).
  const [loanDir, setLoanDir] = useState(initial?.direction || "lent");
  const [person, setPerson] = useState(initial?.person || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  // Галочка «Считать долгом» у перевода: по умолчанию включена (initial.debt === false её выключает).
  const [asDebt, setAsDebt] = useState(initial?.debt ?? true);
  // Галочка «Отображать в операциях» у корректировки: по умолчанию выключена.
  const [showInHistory, setShowInHistory] = useState(initial?.type === "adjustment" ? !initial?.hidden : false);

  // Фото чека: data — новое фото (dataURL), remove — убрать сохранённое.
  const [receipt, setReceipt] = useState({ data: null, remove: false });

  // Общая трата (пространство пары): расход остаётся в вашем бюджете и дополнительно записывается в «Общую».
  const spaceCtx = useContext(SpaceContext);
  const [sharedOn, setSharedOn] = useState(false);
  const [sharedCat, setSharedCat] = useState("");

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
    setNotEarned(!!initial?.excludeIncome);
    setLoanDir(initial?.direction || "lent");
    setPerson(initial?.person || "");
    setDueDate(initial?.dueDate || "");
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
  // Расход с общей карты («Совместный бюджет → Общие карты») сам попадает в «Общую»: выбираем только общую категорию.
  const sharedForced = !isEdit && type === "expense" && !!spaceCtx?.sharedAvailable && (spaceCtx.sharedCards || []).includes(card);
  const sharedCatValue = sharedCat || (spaceCtx?.sharedCats ? guessSharedCat(spaceCtx.sharedCats, category) : "");

  // Свайп влево/вправо по форме листает вкладки Трата → Доход → Перевод → Коррекция → Долги и обратно.
  const OPERATION_TAB_ORDER = ["expense", "income", "transfer", "adjustment", "loan"];
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

    if (type === "loan") {
      if (!person.trim()) {
        window.alert("Укажите, кто должен или кому должны");
        return;
      }
      if (dueDate && dueDate < date) {
        window.alert("Срок возврата не может быть раньше даты долга");
        return;
      }
      onSubmit({
        type: "loan",
        direction: loanDir,
        person: person.trim(),
        amount: amountNum,
        card,
        date,
        dueDate: dueDate || "",
        note: note.trim(),
      });
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
      ], { receipt, ...(sharedForced ? { shared: { catId: sharedCatValue } } : {}) });
      return;
    }

    if (type === "income") {
      onSubmit({
        type: "income",
        date,
        amount: amountNum,
        card,
        note: note.trim(),
        ...(notEarned ? { excludeIncome: true } : {}),
      });
    } else if (type === "expense") {
      onSubmit(
        {
          type: "expense",
          date,
          amount: amountNum,
          card,
          bucket,
          category,
          note: note.trim(),
        },
        { receipt, ...(sharedForced || (sharedOn && spaceCtx?.sharedAvailable) ? { shared: { catId: sharedCatValue } } : {}) }
      );
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

  const catObj = categories.find((c) => c.name === category);
  const catObj2 = categories2.find((c) => c.name === splitCategory2);
  const cardSelectOptions = cardOptions.map((c) => ({ value: c.id, label: c.label }));
  const cardColor = cardOptions.find((c) => c.id === card)?.color || C.sber;
  const catOptions = (list) => list.map((c) => ({ value: c.name, label: c.name }));
  const grey = "#5B6B62";

  return (
    <form className="form-card op-form" onSubmit={submit} onTouchStart={handleFormTouchStart} onTouchEnd={handleFormTouchEnd}>
      <div className="op-head">
        <h2>{isEdit ? "Изменить операцию" : "Новая операция"}</h2>
        <button type="button" onClick={onCancel} className="op-close" aria-label="Закрыть">
          <X size={17} />
        </button>
      </div>

      <OpTabs value={type} onChange={setType} />

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
      />

      {type === "expense" && (
        <>
          <OpGroup>
            <OpDate value={date} onChange={setDate} />
            <OpChips label="Бюджет" options={bucketOptions(settings)} value={bucket} onChange={setBucket} />
            <OpSelect
              icon={getIcon(catObj?.icon)}
              color={catObj?.color || C.sber}
              label={split ? "Категория (часть 1)" : "Категория"}
              options={catOptions(categories)}
              value={category}
              onChange={setCategory}
            />
            <OpSelect icon={Wallet} color={cardColor} label="С карты" options={cardSelectOptions} value={card} onChange={setCard} />
          </OpGroup>

          {anomalyParts.length > 0 && (
            <div className="notice" style={{ borderColor: C.amber, background: C.amberSoft, marginBottom: 10 }}>
              ⚠️ Вы платите картой «{cardLabel(settings, card)}» за другой бюджет — это запишется как долг:
              {anomalyParts.map((p, i) => (
                <div key={i} style={{ fontWeight: 700, marginTop: 3 }}>
                  «{bucketName(settings, p.bucket)}» должны «{bucketNameGen(settings, CARD_BUCKET[card])}»{p.amount > 0 ? ` ${formatMoney(p.amount)}` : ""}
                </div>
              ))}
              <div style={{ marginTop: 3 }}>Долг погасится автоматически из следующего дохода.</div>
            </div>
          )}

          <OpGroup>
            <OpToggle
              icon={Split}
              color="#2F6FD0"
              label="Разделить на две категории"
              checked={split}
              onChange={(checked) => {
                setSplit(checked);
                if (checked) setBucket2(bucket);
              }}
            />
            {split && (
              <>
                <AmountField label="Сумма (часть 2)" value={splitAmount2} onChange={setSplitAmount2} />
                <OpChips label="Бюджет" options={bucketOptions(settings)} value={bucket2} onChange={setBucket2} />
                <OpSelect
                  icon={getIcon(catObj2?.icon)}
                  color={catObj2?.color || C.sber}
                  label="Категория (часть 2)"
                  options={catOptions(categories2)}
                  value={splitCategory2}
                  onChange={setSplitCategory2}
                />
              </>
            )}
            {sharedForced && (
              <OpSelect
                icon={Users}
                color="#7B5CC9"
                label={`Общая категория · «${cardLabel(settings, card)}» — общая карта`}
                options={(spaceCtx.sharedCats || []).map((c) => ({ value: c.id, label: c.name }))}
                value={sharedCatValue}
                onChange={setSharedCat}
              />
            )}
            {!sharedForced && !split && !isEdit && spaceCtx?.sharedAvailable && (
              <>
                <OpToggle icon={Users} color="#7B5CC9" label={`Общая трата (${spaceCtx.names.shared})`} checked={sharedOn} onChange={setSharedOn} />
                {sharedOn && (
                  <OpSelect
                    icon={Users}
                    color="#7B5CC9"
                    label="Общая категория"
                    options={(spaceCtx.sharedCats || []).map((c) => ({ value: c.id, label: c.name }))}
                    value={sharedCatValue}
                    onChange={setSharedCat}
                  />
                )}
              </>
            )}
          </OpGroup>

          {split && (
            <div className="op-note">
              Часть 1: {formatMoney(Math.max(0, part1Num))} · спишется с «{cardLabel(settings, card)}»: {formatMoney(amountNum)}
            </div>
          )}
          {!sharedForced && !split && !isEdit && spaceCtx?.sharedAvailable && sharedOn && (
            <div className="op-note">Платили вы, расход делится пополам.</div>
          )}
        </>
      )}

      {type === "income" && (
        <OpGroup>
          <OpDate value={date} onChange={setDate} />
          <OpSelect icon={Wallet} color={cardColor} label="Куда пришёл доход" options={cardSelectOptions} value={card} onChange={setCard} />
          <OpToggle icon={Banknote} color={grey} label="Не заработок" checked={notEarned} onChange={setNotEarned} />
        </OpGroup>
      )}

      {type === "transfer" && (
        <OpGroup>
          <OpDate value={date} onChange={setDate} />
          <OpSelect icon={ArrowLeftRight} color="#2F6FD0" label="Откуда" options={cardSelectOptions} value={fromCard} onChange={setFromCard} />
          <OpSelect icon={Wallet} color={cardOptions.find((c) => c.id === toCard)?.color || C.sber} label="Куда" options={cardSelectOptions} value={toCard} onChange={setToCard} />
          <OpToggle icon={HandCoins} color={grey} label="Считать долгом" checked={asDebt} onChange={setAsDebt} />
        </OpGroup>
      )}

      {type === "adjustment" && (
        <>
          <OpGroup>
            <OpDate value={date} onChange={setDate} />
            <OpSelect icon={Wallet} color={cardColor} label="Карта" options={cardSelectOptions} value={card} onChange={setCard} />
            <OpToggle icon={SlidersHorizontal} color={grey} label="Отображать в операциях" checked={showInHistory} onChange={setShowInHistory} />
          </OpGroup>

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

      {type === "loan" && (
        <OpGroup>
          <OpDate value={date} onChange={setDate} />
          <OpChips
            options={[
              { id: "lent", label: "Вы дали в долг", color: "#7B5CC9" },
              { id: "borrowed", label: "Вам дали в долг", color: "#7B5CC9" },
            ]}
            value={loanDir}
            onChange={setLoanDir}
          />
          <OpText
            icon={User}
            color="#7B5CC9"
            label={loanDir === "lent" ? "Кто вам должен" : "Кому вы должны"}
            value={person}
            onChange={setPerson}
            placeholder="Имя"
            list="loan-people"
          />
          <datalist id="loan-people">
            {knownPeople(transactions || []).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <OpSelect
            icon={Wallet}
            color={cardColor}
            label={loanDir === "lent" ? "С какой карты дали" : "На какую карту пришли деньги"}
            options={cardSelectOptions}
            value={card}
            onChange={setCard}
          />
          <OpDate
            icon={CalendarClock}
            color="#7B5CC9"
            label={loanDir === "lent" ? "Когда вам вернут (необязательно)" : "Когда вы вернёте (необязательно)"}
            value={dueDate}
            onChange={setDueDate}
          />
        </OpGroup>
      )}

      <OpGroup>
        <OpText icon={Pencil} color={grey} label="Заметка" value={note} onChange={setNote} placeholder="Необязательно" />
        {type === "expense" && (
          <ReceiptField had={!!initial?.receipt} txId={initial?.editId} receipt={receipt} onChange={setReceipt} />
        )}
      </OpGroup>

      <button type="submit" className="op-save">Сохранить</button>
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
  onSaveSettings,
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
          onSaveSettings={onSaveSettings}
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
  const base = { type: tx.type, date: tx.date, amount: tx.amount, note: tx.note || "", editId: tx.id, receipt: !!tx.receipt };
  if (tx.type === "expense") {
    return { ...base, card: tx.card, bucket: tx.bucket || bucketOf(tx.card), category: tx.category };
  }
  if (tx.type === "income") {
    return { ...base, card: tx.card, excludeIncome: !!tx.excludeIncome };
  }
  if (tx.type === "transfer") {
    const linked = (transactions || []).some((t) => t.type === "debt" && t.sourceTxId === tx.id);
    return { ...base, fromCard: tx.fromCard, toCard: tx.toCard, debt: linked };
  }
  if (tx.type === "adjustment") {
    return { ...base, card: tx.card };
  }
  if (tx.type === "loan") {
    return { ...base, card: tx.card, direction: tx.direction, person: tx.person, dueDate: tx.dueDate || "" };
  }
  return base;
}
