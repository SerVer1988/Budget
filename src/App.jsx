import React, { useState, useEffect, useRef } from "react";
import { storage, auth } from "./storage.js";
import cardNeedsImg from "./assets/card-needs.webp";
import cardWantsImg from "./assets/card-wants.webp";
import cardSavingsImg from "./assets/card-savings.webp";
import bottomPlantsImg from "./assets/bottom-plants.webp";
import badgeSberImg from "./assets/badge-sber.webp";
import badgeAlfaImg from "./assets/badge-alfa.webp";
import badgeOzonImg from "./assets/badge-ozon.webp";
import { TabBar } from "./TabBar.jsx";
import { AddPageContent, FullAddForm, deriveFormInitialFromTx } from "./form.jsx";
import { IncomeDistributionModal } from "./panels.jsx";
import { Toast } from "./ui.jsx";
import { BUCKET_CARD, BUCKET_STYLE, C, DEFAULT_SETTINGS } from "./constants.js";
import { aggregateOpenDebts, computeIncomeSplitWithDebts, syncLinkedDebt } from "./debts.js";
import { bucketName, endOfMonthStr, monthLabel, todayMonthKey, todayStr, uid } from "./format.js";
import { migrateSettings, migrateTransactions } from "./migrate.js";
import { AppStyles } from "./AppStyles.jsx";
import { AnalysisView } from "./AnalysisView.jsx";
import { AuthScreen } from "./AuthScreen.jsx";
import { SettingsView } from "./SettingsView.jsx";

/* ============================================================ App */
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(1); // 0 Анализ, 1 Нужды, 2 Желания, 3 Подушка, 4 Настройки; по умолчанию — Добавить (Нужды)
  const [lastAddPage, setLastAddPage] = useState(1);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);
  const touchRef = useRef(null);
  const [authUser, setAuthUser] = useState(undefined); // undefined — проверяем сессию, null — не вошли
  const [stale, setStale] = useState(false); // на другом устройстве данные уже изменились

  // Картинки трёх страниц (Нужды/Желания/Подушка) и значки банков — в кэш браузера сразу,
  // ещё до первого свайпа, иначе при переключении страниц был бы короткий мерцающий момент.
  useEffect(() => {
    [cardNeedsImg, cardWantsImg, cardSavingsImg, bottomPlantsImg, badgeSberImg, badgeAlfaImg, badgeOzonImg].forEach(
      (src) => { const img = new Image(); img.src = src; }
    );
  }, []);

  useEffect(() => {
    let alive = true;
    auth.init().then((u) => { if (alive) setAuthUser(u); });
    const unsub = auth.subscribe((u) => setAuthUser(u));
    return () => { alive = false; unsub(); };
  }, []);

  // Возвращаемся в приложение или запись отклонена как устаревшая — предлагаем обновиться.
  useEffect(() => {
    if (!authUser) return undefined;
    function check() {
      if (document.visibilityState === "visible") {
        storage.checkStale().then((isStale) => { if (isStale) setStale(true); });
      }
    }
    function onConflict() { setStale(true); }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("budget-conflict", onConflict);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("budget-conflict", onConflict);
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (pageIndex >= 1 && pageIndex <= 3) setLastAddPage(pageIndex);
  }, [pageIndex]);

  useEffect(() => {
    if (!authUser) return undefined;
    let alive = true;
    setLoaded(false);
    setStale(false);

    (async () => {
      let s = DEFAULT_SETTINGS;
      let t = [];

      try {
        const r = await storage.get("settings");
        if (r && r.value) s = migrateSettings(JSON.parse(r.value));
      } catch (e) {
        if (e?.message !== "not found") console.warn("Не удалось загрузить настройки", e);
      }

      try {
        const r = await storage.get("transactions");
        if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s);
      } catch (e) {
        if (e?.message !== "not found") console.warn("Не удалось загрузить операции", e);
      }

      if (alive) {
        setSettings(s);
        setTransactions(t);
        setLoaded(true);
      }
    })();

    return () => { alive = false; };
  }, [authUser?.id]);

  async function persistTransactions(next) {
    setTransactions(next);
    try {
      await storage.set("transactions", JSON.stringify(next));
    } catch (e) {
      console.warn("Не удалось сохранить операции", e);
    }
  }

  async function persistSettings(next) {
    setSettings(next);
    try {
      await storage.set("settings", JSON.stringify(next));
    } catch (e) {
      console.warn("Не удалось сохранить настройки", e);
    }
  }

  // Восстановление из JSON-копии: заменяет настройки и операции.
  function importBackup(data) {
    const s = migrateSettings(data.settings);
    persistSettings(s);
    persistTransactions(migrateTransactions(data.transactions, s));
    setToast("Данные восстановлены");
    setTimeout(() => setToast(null), 1400);
  }

  // Добавляет сразу несколько операций одним обновлением состояния. Важно делать это
  // атомарно: если вызвать addTransaction() несколько раз подряд в одном обработчике,
  // каждый вызов берёт `transactions` из одного и того же устаревшего замыкания, и
  // последующие вызовы перезатирают предыдущие — часть операций (например, вторая
  // половина разбивки) молча пропадает.
  //
  // meta.asDebt — галочка «Считать долгом» у перевода. Долг за трату «чужой» картой
  // создаётся автоматически (см. debtSpecFor), для остальных типов операций долг не нужен.
  function addTransactions(newTxs, meta) {
    const withIds = newTxs.map((tx) => ({ ...tx, id: uid() }));
    let next = [...transactions, ...withIds];
    withIds.forEach((tx) => { next = syncLinkedDebt(next, tx, meta?.asDebt); });
    persistTransactions(next);
    setToast("Добавлено");
    setTimeout(() => setToast(null), 1400);
  }

  function addTransaction(tx, meta) {
    addTransactions([tx], meta);
  }

  // Вместе с операцией удаляется и привязанный к ней долг (трата чужой картой / перевод-заём).
  function deleteTransaction(id) {
    persistTransactions(
      transactions.filter((t) => t.id !== id && !(t.type === "debt" && t.sourceTxId === id))
    );
    setToast("Удалено");
    setTimeout(() => setToast(null), 1200);
  }

  function updateTransaction(id, updatedTx, meta) {
    const replaced = transactions.map((t) => (t.id === id ? { ...updatedTx, id } : t));
    persistTransactions(syncLinkedDebt(replaced, { ...updatedTx, id }, meta?.asDebt));
    setToast("Изменено");
    setTimeout(() => setToast(null), 1200);
  }

  // Разбивка существующей операции при редактировании: первая часть занимает место
  // старой записи (тот же id), вторая (и далее) добавляется как новая — одним
  // атомарным обновлением состояния.
  function updateTransactionAsSplit(id, parts) {
    const [first, ...rest] = parts;
    const groupId = first.splitGroup || uid();
    const updatedFirst = { ...first, id, splitGroup: groupId };
    const newOnes = rest.map((tx) => ({ ...tx, splitGroup: groupId, id: uid() }));
    let next = transactions.map((t) => (t.id === id ? updatedFirst : t)).concat(newOnes);
    [updatedFirst, ...newOnes].forEach((tx) => { next = syncLinkedDebt(next, tx, false); });
    persistTransactions(next);
    setToast("Изменено");
    setTimeout(() => setToast(null), 1200);
  }

  // Списание долга между бюджетами: создаёт реальный перевод денег с карты
  // должника на карту кредитора (без учёта как нового долга). Остальные открытые
  // долги пересчитываются как «план без посредников»: старые записи закрываются,
  // а то, что осталось платить по другим направлениям, остаётся одной записью на направление.
  function writeOffDebtGroup(group) {
    const debtorCard = BUCKET_CARD[group.toBucket];
    const creditorCard = BUCKET_CARD[group.fromBucket];
    const today = todayStr();
    const settleTx = {
      type: "transfer",
      date: today,
      amount: Math.round(group.amount),
      fromCard: debtorCard,
      toCard: creditorCard,
      note: "Погашение долга",
      id: uid(),
    };

    const open = transactions.filter((t) => t.type === "debt" && !t.repaid && t.remainingAmount > 0);
    const rest = aggregateOpenDebts(open).filter((g) => g.key !== group.key);

    // Если оставшееся направление уже есть отдельной записью на ту же сумму — не трогаем её.
    const keep = new Set();
    const created = [];
    rest.forEach((g) => {
      const same = open.find(
        (t) => !keep.has(t.id) && t.fromBucket === g.fromBucket && t.toBucket === g.toBucket && Math.round(t.remainingAmount) === g.amount
      );
      if (same) {
        keep.add(same.id);
      } else {
        created.push({
          id: uid(),
          type: "debt",
          date: today,
          amount: g.amount,
          remainingAmount: g.amount,
          fromBucket: g.fromBucket,
          toBucket: g.toBucket,
          repaid: false,
          note: "",
        });
      }
    });

    const closeIds = new Set(group.ids.filter((id) => !keep.has(id)));
    const updated = transactions.map((t) =>
      closeIds.has(t.id) ? { ...t, repaid: true, remainingAmount: 0 } : t
    );
    persistTransactions([...updated, ...created, settleTx]);
    setToast("Долг погашен переводом");
    setTimeout(() => setToast(null), 1200);
  }

  function closeMonth(mk, mode, leftoverNeeds, leftoverWants) {
    if (mode === "toSavings") {
      const date = endOfMonthStr(mk);
      const extra = [];
      if (leftoverNeeds > 1) {
        extra.push({ type: "transfer", date, amount: Math.round(leftoverNeeds), fromCard: "sber", toCard: "ozon", note: `Остаток «${bucketName(settings, "needs")}» за ${monthLabel(mk)}`, id: uid() });
      }
      if (leftoverWants > 1) {
        extra.push({ type: "transfer", date, amount: Math.round(leftoverWants), fromCard: "alfa", toCard: "ozon", note: `Остаток «${bucketName(settings, "wants")}» за ${monthLabel(mk)}`, id: uid() });
      }
      if (extra.length) persistTransactions([...transactions, ...extra]);
    }

    const newResetDate = endOfMonthStr(mk);
    const advancedReset =
      !settings.needsWantsResetDate || newResetDate > settings.needsWantsResetDate
        ? newResetDate
        : settings.needsWantsResetDate;

    persistSettings({
      ...settings,
      closedMonths: [...(settings.closedMonths || []), mk],
      needsWantsResetDate: advancedReset,
    });
    setToast("Месяц закрыт");
    setTimeout(() => setToast(null), 1200);
  }

  function toggleIncludeInTotal(key) {
    const next = {
      ...settings,
      includeInTotal: {
        ...settings.includeInTotal,
        [key]: !settings.includeInTotal?.[key],
      },
    };
    persistSettings(next);
  }

  function resetNeedsWantsTracking() {
    persistSettings({ ...settings, needsWantsResetDate: todayStr() });
    setToast("Отсчёт сброшен");
    setTimeout(() => setToast(null), 1200);
  }

  function openForm(initial) {
    setFormInitial(initial || { type: "expense", card: "sber", bucket: "needs" });
  }

  function closeForm() {
    setFormInitial(null);
  }

  function submitForm(tx, meta) {
    if (Array.isArray(tx)) {
      if (formInitial?.editId) {
        updateTransactionAsSplit(formInitial.editId, tx);
      } else {
        addTransactions(tx);
      }
      closeForm();
      return;
    }

    if (formInitial?.editId) {
      updateTransaction(formInitial.editId, tx, meta);
      closeForm();
      return;
    }

    addTransaction(tx, meta);
    // Если это доход — показываем модалку автоматического распределения
    if (tx.type === "income") {
      setNewIncomeTx(tx);
    }
    closeForm();
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplitWithDebts(newIncomeTx.amount, settings, transactions);
    const sourceCard = newIncomeTx.card;
    const date = newIncomeTx.date;

    const transfers = [];
    if (sourceCard !== "sber" && split.toSber > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toSber), fromCard: sourceCard, toCard: "sber", note: "Авто-распределение", id: uid() });
    }
    if (sourceCard !== "alfa" && split.toAlfa > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toAlfa), fromCard: sourceCard, toCard: "alfa", note: "Авто-распределение", id: uid() });
    }
    if (sourceCard !== "ozon" && split.toOzon > 0) {
      transfers.push({ type: "transfer", date, amount: Math.round(split.toOzon), fromCard: sourceCard, toCard: "ozon", note: "Авто-распределение", id: uid() });
    }

    const debtUpdates = split.repayments.map(({ debtId, amount: repay }) => {
      const debt = transactions.find((t) => t.id === debtId);
      const nextRemaining = Math.max(0, Math.round(debt.remainingAmount - repay));
      return { id: debtId, updatedTx: { ...debt, remainingAmount: nextRemaining, repaid: nextRemaining <= 0 } };
    });

    const next = transactions
      .map((t) => {
        const upd = debtUpdates.find((u) => u.id === t.id);
        return upd ? { ...upd.updatedTx, id: t.id } : t;
      })
      .concat(transfers);

    persistTransactions(next);
    setNewIncomeTx(null);
  }

  function selectPage(i) {
    setFormInitial(null);
    setPageIndex(Math.max(0, Math.min(4, i)));
  }

  // Тот же вариант операции, что открывает большая "+"-кнопка на самой странице
  // (Нужды/Желания/Подушка), — используется при повторном нажатии на "Добавить".
  function defaultAddFormFor(pi) {
    if (pi === 2) return { type: "expense", card: "alfa", bucket: "wants" };
    if (pi === 3) return { type: "transfer", fromCard: "sber", toCard: "ozon", debt: false };
    return { type: "expense", card: "sber", bucket: "needs" };
  }

  // Первое нажатие на "Добавить" (если мы не в разделе Добавить) — переход на последнюю
  // открытую страницу (Нужды/Желания/Подушка). Повторное нажатие (мы уже там и форма
  // закрыта) — сразу открывает "Новую операцию".
  function handleSelectAdd() {
    if (!formInitial && pageIndex >= 1 && pageIndex <= 3) {
      openForm(defaultAddFormFor(pageIndex));
    } else {
      selectPage(lastAddPage);
    }
  }

  function goPage(delta) {
    if (formInitial) return;
    setPageIndex((i) => Math.max(0, Math.min(4, i + delta)));
  }

  function handleTouchStart(e) {
    if (formInitial) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || formInitial) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < 50) return; // слишком короткий свайп
    if (Math.abs(dx) < Math.abs(dy) * 1.3) return; // скорее вертикальный скролл

    goPage(dx < 0 ? 1 : -1);
  }

  if (authUser === null) {
    return (
      <>
        <AppStyles />
        <div className="app-viewport">
          <div className="app-shell">
            <main className="app-main">
              <AuthScreen />
            </main>
          </div>
        </div>
      </>
    );
  }

  if (authUser === undefined || !loaded) {
    return (
      <>
        <AppStyles />
        <div className="app-viewport">
          <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: C.inkMuted, fontSize: 14 }}>Загрузка…</div>
          </div>
        </div>
      </>
    );
  }

  const folderBucketKey = pageIndex === 1 ? "needs" : pageIndex === 2 ? "wants" : pageIndex === 3 ? "savings" : null;
  const heroBg = folderBucketKey ? BUCKET_STYLE[folderBucketKey].folderBg : undefined;

  return (
    <>
      <AppStyles />

      {stale && (
        <div className="sync-banner">
          <span>Данные изменились на другом устройстве. Обновите, чтобы не потерять правки.</span>
          <button type="button" onClick={() => window.location.reload()}>Обновить</button>
        </div>
      )}

      <div className="app-viewport">
        <div className="app-shell">
          <main
            className="app-main"
            style={heroBg ? { background: heroBg } : undefined}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {newIncomeTx && (
              <IncomeDistributionModal
                incomeTx={newIncomeTx}
                settings={settings}
                transactions={transactions}
                onDistribute={handleAutoDistribute}
                onClose={() => setNewIncomeTx(null)}
              />
            )}

            {formInitial ? (
              <div className="screen-stack">
                <FullAddForm
                  settings={settings}
                  transactions={transactions}
                  initial={formInitial}
                  onSubmit={submitForm}
                  onCancel={closeForm}
                />
              </div>
            ) : pageIndex === 0 ? (
              <AnalysisView
                settings={settings}
                transactions={transactions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onDelete={deleteTransaction}
                onEditTx={(tx) => openForm(deriveFormInitialFromTx(tx, transactions))}
                onToggleInclude={toggleIncludeInTotal}
                onCloseMonth={closeMonth}
                onWriteOffDebtGroup={writeOffDebtGroup}
                goToAdd={() => selectPage(1)}
              />
            ) : pageIndex >= 1 && pageIndex <= 3 ? (
              <AddPageContent
                pageIndex={pageIndex - 1}
                settings={settings}
                transactions={transactions}
                openForm={openForm}
                canPrev={pageIndex > 0}
                canNext={pageIndex < 4}
                onPrev={() => goPage(-1)}
                onNext={() => goPage(1)}
                onSelectPage={(i) => selectPage(i + 1)}
                onDeleteTx={deleteTransaction}
                onEditTx={(tx) => openForm(deriveFormInitialFromTx(tx, transactions))}
                onSaveSettings={persistSettings}
              />
            ) : (
              <SettingsView
                settings={settings}
                transactions={transactions}
                onImport={importBackup}
                onSave={persistSettings}
                onWipeAll={() => persistTransactions([])}
                onResetTracking={resetNeedsWantsTracking}
                userEmail={authUser?.email}
                onSignOut={async () => {
                  await auth.signOut();
                  window.location.reload();
                }}
              />
            )}
          </main>

          <TabBar
            pageIndex={pageIndex}
            onSelectAdd={handleSelectAdd}
            onSelectAnalysis={() => selectPage(0)}
            onSelectSettings={() => selectPage(4)}
          />
          <Toast text={toast} />
        </div>
      </div>
    </>
  );
}
