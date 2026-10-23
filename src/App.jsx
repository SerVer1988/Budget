import React, { useState, useEffect, useRef } from "react";
import { storage, auth, household, inbox, partner, push, shared } from "./storage.js";
import { learnMerchant } from "./bankParse.js";
import { rememberOp } from "./dedupe.js";
import { receivedParts } from "./InboxPanel.jsx";
import cardNeedsImg from "./assets/card-needs.webp";
import cardWantsImg from "./assets/card-wants.webp";
import cardSavingsImg from "./assets/card-savings.webp";
import bottomPlantsImg from "./assets/bottom-plants.webp";

// Картинки шапок и нижней панели начинают грузиться сразу при запуске, а не когда дойдёт до экрана.
if (typeof Image !== "undefined") {
  [cardNeedsImg, cardWantsImg, cardSavingsImg, bottomPlantsImg].forEach((src) => { const im = new Image(); im.src = src; });
}
import badgeNeedsImg from "./assets/badge-needs.webp";
import badgeWantsImg from "./assets/badge-wants.webp";
import badgeSavingsImg from "./assets/badge-savings.webp";
import { TabBar } from "./TabBar.jsx";
import { AddPageContent, FullAddForm, deriveFormInitialFromTx } from "./form.jsx";
import { IncomeDistributionModal } from "./panels.jsx";
import { ConfirmSheet, Toast } from "./ui.jsx";
import { BUCKET_CARD, BUCKET_STYLE, C, DEFAULT_SETTINGS } from "./constants.js";
import { aggregateOpenDebts, computeIncomeSplitWithDebts, syncLinkedDebt } from "./debts.js";
import { bucketName, cardLabel, endOfMonthStr, formatMoney, monthLabel, todayMonthKey, todayStr, uid } from "./format.js";
import { migrateSettings, migrateTransactions } from "./migrate.js";
import { buildRecurringExpense, markPosted } from "./recurring.js";
import { removeReceipt, saveReceipt } from "./receipts.js";
import { buildRepay } from "./loans.js";
import { ReceiptContext, ReceiptModal } from "./ReceiptViewer.jsx";
import { buildNotices, deliverNotes, showDeviceNotice, showNotices } from "./notify.js";
import { planPartnerNotices, readFeedState, writeFeedState } from "./partnerFeed.js";
import { computeAllInsights } from "./insights.js";
import { AppStyles } from "./AppStyles.jsx";
import { AnalysisView } from "./AnalysisView.jsx";
import { AuthScreen } from "./AuthScreen.jsx";
import { SettingsView } from "./SettingsView.jsx";
import { SpaceContext, SpaceSwitch, spaceNamesOf } from "./spaces.jsx";
import { SharedView } from "./SharedView.jsx";
import { guessSharedCat, sharedCatsOf } from "./shared.js";

/* ============================================================ App */
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [transactions, setTransactions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [receiptViewId, setReceiptViewId] = useState(null);
  const [pending, setPending] = useState([]); // «лист ожидания»: уведомления банков, ещё не ставшие операциями
  const [pageIndex, setPageIndex] = useState(1); // 0 Анализ, 1 Нужды, 2 Желания, 3 Подушка, 4 Настройки; по умолчанию — Добавить (Нужды)
  const [lastAddPage, setLastAddPage] = useState(1);
  const [formInitial, setFormInitial] = useState(null);
  const [newIncomeTx, setNewIncomeTx] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey());
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // id операции, ожидающей подтверждения удаления
  const toastTimerRef = useRef(null);

  // Плашка снизу. С undo — висит дольше и показывает кнопку «Отменить».
  function showToast(text, opts = {}) {
    clearTimeout(toastTimerRef.current);
    const undoFn = opts.undo;
    setToast({
      text,
      undo: undoFn ? () => { clearTimeout(toastTimerRef.current); setToast(null); undoFn(); } : null,
    });
    toastTimerRef.current = setTimeout(() => setToast(null), opts.ms || (undoFn ? 6500 : 2600));
  }

  // «Транспорт 40 ₽», «Доход 5 000 ₽», «Перевод 1 000 ₽» — что именно произошло
  function describeTx(tx) {
    if (!tx) return "Операция";
    const money = formatMoney(Math.abs(tx.amount || 0));
    if (tx.type === "transfer") return `Перевод ${money}`;
    if (tx.type === "adjustment") return `Корректировка ${money}`;
    if (tx.type === "income") return `${tx.category || "Доход"} ${money}`;
    if (tx.type === "expense") return `${tx.category || "Расход"} ${money}`;
    return `Долг ${money}`;
  }
  function describeTxs(list) {
    if (!list.length) return "Операции";
    return list.length === 1 ? describeTx(list[0]) : `${describeTx(list[0])} и ещё ${list.length - 1}`;
  }
  const touchRef = useRef(null);
  const [authUser, setAuthUser] = useState(undefined); // undefined — проверяем сессию, null — не вошли
  const [stale, setStale] = useState(false); // на другом устройстве данные уже изменились

  // Пространства пары: «me» — мой бюджет, «partner» — бюджет партнёра (только просмотр).
  const [partnerInfo, setPartnerInfo] = useState(null); // { partner: { id, email }, i_share, partner_shares } | null
  const [space, setSpace] = useState("me");
  const [partnerData, setPartnerData] = useState(null); // { settings, transactions } партнёра, только чтение
  const [partnerState, setPartnerState] = useState("idle"); // idle | loading | ready | noaccess | error
  const [sharedData, setSharedData] = useState({ items: [], cats: [] }); // «Общая» книга пары
  const [sharedState, setSharedState] = useState("idle"); // idle | loading | ready | error
  const [sharedError, setSharedError] = useState("");
  const [sharedFormOpen, setSharedFormOpen] = useState(false);
  const readOnly = space === "partner" && pageIndex !== 4; // на странице «Настройки» всегда мои данные
  const readOnlyRef = useRef(false);
  readOnlyRef.current = readOnly;
  const spaceRef = useRef("me");
  spaceRef.current = space;
  const partnerInfoRef = useRef(null);
  partnerInfoRef.current = partnerInfo;
  const spaceNames = spaceNamesOf(settings);

  // Картинки трёх страниц (Нужды/Желания/Подушка) и значки банков — в кэш браузера сразу,
  // ещё до первого свайпа, иначе при переключении страниц был бы короткий мерцающий момент.
  useEffect(() => {
    [cardNeedsImg, cardWantsImg, cardSavingsImg, bottomPlantsImg, badgeNeedsImg, badgeWantsImg, badgeSavingsImg].forEach(
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
    // В совместном бюджете чужие правки подтягиваем сами; в личном — предлагаем обновиться плашкой.
    function onStale() { refreshData(); } // чужие правки (другое устройство, партнёр) подтягиваем сами
    function check() {
      if (document.visibilityState === "visible") {
        storage.checkStale().then((isStale) => { if (isStale) onStale(); });
      }
    }
    function onMerged() { refreshData(); }
    const timer = setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("budget-conflict", onStale);
    window.addEventListener("budget-merged", onMerged);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("budget-conflict", onStale);
      window.removeEventListener("budget-merged", onMerged);
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
      const { s, t } = await loadAll();

      if (alive) {
        setSettings(s);
        setTransactions(t);
        setLoaded(true);
      }
    })();

    return () => { alive = false; };
  }, [authUser?.id]);

  // Уведомления: при запуске и при возвращении в приложение (один раз за день на каждый сигнал).
  useEffect(() => {
    if (!loaded) return undefined;
    function run() {
      if (document.visibilityState !== "visible") return;
      const today = todayStr();
      showNotices(buildNotices(transactions, settings, today), today);
      deliverNotes(computeAllInsights(transactions, settings));
    }
    run();
    const timer = setInterval(run, 10 * 60 * 1000); // пока приложение открыто, слоты дня наступают вовремя
    document.addEventListener("visibilitychange", run);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", run); };
  }, [loaded, transactions, settings]);

  // Привязанный партнёр: сведения о связи (если выполнен supabase-partner.sql и аккаунты привязаны).
  useEffect(() => {
    if (!authUser || !loaded || household.scope() === "household") return undefined;
    let alive = true;
    partner.info().then((i) => { if (alive) setPartnerInfo(i); }).catch(() => { if (alive) setPartnerInfo(null); });
    return () => { alive = false; };
  }, [authUser?.id, loaded]);

  // Бюджет партнёра обновляем, когда возвращаемся в приложение (пока открыто его пространство).
  useEffect(() => {
    if (space !== "partner") return undefined;
    function onVisible() { if (document.visibilityState === "visible") loadPartnerData(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [space, partnerInfo?.partner?.id]);

  async function loadPartnerData() {
    if (!partnerInfo?.partner) return;
    setPartnerState((st) => (st === "ready" ? st : "loading"));
    try {
      const d = await partner.loadData(partnerInfo.partner.id);
      if (!d.settings && !d.transactions) { setPartnerData(null); setPartnerState("noaccess"); return; }
      const s = d.settings ? migrateSettings(JSON.parse(d.settings)) : DEFAULT_SETTINGS;
      const t = d.transactions ? migrateTransactions(JSON.parse(d.transactions), s) : [];
      setPartnerData({ settings: s, transactions: t });
      setPartnerState("ready");
    } catch (e) {
      console.warn("Не удалось загрузить бюджет партнёра", e);
      setPartnerState((st) => (st === "ready" ? st : "error"));
    }
  }

  // «Общая» книга: загружаем, как только известно, что аккаунты привязаны.
  useEffect(() => {
    if (partnerInfo?.partner) loadShared();
  }, [partnerInfo?.partner?.id]);

  // Уведомления о тратах партнёра: что нового с прошлого раза (первый запуск молчит). Если уведомления
  // выключены в настройках, «увиденное» всё равно запоминаем, чтобы при включении не пришёл поток старого.
  const feedCfgRef = useRef({});
  feedCfgRef.current = {
    uid: authUser?.id,
    partnerId: partnerInfo?.partner?.id,
    names: spaceNames,
    enabled: settings.partnerNotify !== false,
    cats: sharedData.cats,
  };

  function feedDeliver(personal, sharedList) {
    const cfg = feedCfgRef.current;
    if (!cfg.uid || !cfg.partnerId) return;
    const catNameOf = (id) => sharedCatsOf(cfg.cats).find((c) => c.id === id)?.name || "Без категории";
    const { lines, extra, state } = planPartnerNotices({
      state: readFeedState(cfg.uid, cfg.partnerId),
      personal,
      shared: sharedList,
      partnerId: cfg.partnerId,
      names: cfg.names,
      catNameOf,
      today: todayStr(),
    });
    writeFeedState(cfg.uid, cfg.partnerId, state);
    if (!cfg.enabled || !lines.length) return;
    const total = lines.length + extra;
    showToast(total === 1 ? lines[0] : `${lines[0]} и ещё ${total - 1}`, { ms: 6000 });
    showDeviceNotice({ key: `partner:${Date.now()}`, title: "Совместный бюджет", body: lines.join("\n") + (extra ? `\nи ещё ${extra}` : "") });
  }

  // Общая книга: новые траты партнёра.
  useEffect(() => {
    if (sharedState === "ready") feedDeliver(null, sharedData.items);
  }, [sharedData.items, sharedState]);

  // Раз в полминуты, пока приложение открыто (и при возвращении в него): связь, личные траты партнёра, общая книга.
  useEffect(() => {
    if (!partnerInfo?.partner) return undefined;
    let alive = true;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const info = await partner.info();
        if (!alive || !info) return;
        if (JSON.stringify(info) !== JSON.stringify(partnerInfoRef.current)) setPartnerInfo(info);
        if (info.partner_shares) {
          const d = await partner.loadData(info.partner.id);
          let txs = null;
          try { txs = d.transactions ? JSON.parse(d.transactions) : []; } catch { /* ignore */ }
          if (alive && Array.isArray(txs)) feedDeliver(txs, null);
          if (alive && spaceRef.current === "partner") loadPartnerData();
        }
        loadShared(true);
      } catch { /* нет сети — попробуем в следующий раз */ }
    }
    tick();
    const timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [partnerInfo?.partner?.id]);

  async function loadShared(silent) {
    if (!silent) setSharedState((st) => (st === "ready" ? st : "loading"));
    try {
      const d = await shared.load();
      setSharedData({ items: d["shared-items"] || [], cats: d["shared-cats"] || [] });
      setSharedState("ready");
      setSharedError("");
    } catch (e) {
      setSharedState((st) => (st === "ready" ? st : "error"));
      setSharedError(e?.message || "Не получилось загрузить общую книгу.");
    }
  }

  // Изменить общий список (траты или категории): применяем правку к свежим данным на сервере.
  async function sharedMutate(key, fn) {
    try {
      const next = await shared.update(key, fn);
      setSharedData((d) => ({ ...d, [key === "shared-items" ? "items" : "cats"]: next }));
      return true;
    } catch (e) {
      showToast(e?.message || "Не удалось сохранить в общую книгу", { ms: 3500 });
      return false;
    }
  }
  // Сообщаем партнёру push-уведомлением о моей новой общей трате (если уведомления настроены).
  const notifySharedItem = (it) => {
    if (!it || it.kind === "settle") return;
    const catName = sharedCatsOf(sharedData.cats).find((c) => c.id === it.catId)?.name || "";
    push.notifyPartner({ kind: "shared", amount: it.amount, category: catName });
  };
  const addSharedItem = async (item) => {
    const ok = await sharedMutate("shared-items", (arr) => (arr.some((i) => i.id === item.id) ? arr : [...arr, item]));
    if (ok) notifySharedItem(item);
    return ok;
  };
  const deleteSharedItem = (id) => sharedMutate("shared-items", (arr) => arr.filter((i) => i.id !== id));
  async function addSharedCat(cat) {
    await sharedMutate("shared-cats", (arr) => {
      const base = arr.length ? arr : sharedCatsOf([]);   // первую правку начинаем со стандартного списка
      return [...base, cat];
    });
  }

  function selectSpace(id) {
    if (id === space) return;
    setFormInitial(null);
    if (id === "shared") {
      setSpace("shared");
      setPageIndex(0);
      loadShared(true);
      return;
    }
    if (id === "partner") {
      if (!partnerInfo?.partner_shares) { showToast(`«${spaceNames.partner}» пока не открыл доступ к бюджету`); return; }
      setPartnerData(null);
      setPartnerState("loading");
      setSpace("partner");
      loadPartnerData();
    } else {
      setSpace("me");
    }
  }

  // Чужой бюджет — только просмотр: любое изменяющее действие даёт подсказку и ничего не делает.
  const blocked = () => showToast(`Бюджет «${spaceNames.partner}» — только просмотр`);
  const ro = (fn) => (...args) => (readOnlyRef.current ? blocked() : fn(...args));

  // Читает настройки и операции из хранилища. failed — если что-то не удалось прочитать
  // (например, нет сети): тогда обновлять экран по этим данным нельзя.
  async function loadAll() {
    let s = DEFAULT_SETTINGS;
    let t = [];
    let failed = false;

    try {
      const r = await storage.get("settings");
      if (r && r.value) s = migrateSettings(JSON.parse(r.value));
    } catch (e) {
      if (e?.message !== "not found") { failed = true; console.warn("Не удалось загрузить настройки", e); }
    }

    try {
      const r = await storage.get("transactions");
      if (r && r.value) t = migrateTransactions(JSON.parse(r.value), s);
    } catch (e) {
      if (e?.message !== "not found") { failed = true; console.warn("Не удалось загрузить операции", e); }
    }

    return { s, t, failed };
  }

  // Подтянуть свежие данные (правки партнёра или другого устройства).
  async function refreshData() {
    const { s, t, failed } = await loadAll();
    if (failed) return;
    setSettings(s);
    setTransactions(t);
    setStale(false);
  }

  // Удалить всю историю операций (настройки остаются). Пока висит плашка, можно отменить.
  function wipeHistory() {
    const prevT = transactions;
    const withReceipts = transactions.filter((t) => t.receipt).map((t) => t.id);
    const timer = withReceipts.length ? setTimeout(() => withReceipts.forEach((id) => removeReceipt(id)), 9000) : null;
    persistTransactions([]);
    showToast("История операций удалена", { ms: 9000, undo: () => { if (timer) clearTimeout(timer); persistTransactions(prevT); } });
  }

  async function persistTransactions(next) {
    if (readOnlyRef.current) { showToast(`Бюджет «${spaceNames.partner}» — только просмотр`); return; }
    setTransactions(next);
    try {
      const res = await storage.set("transactions", JSON.stringify(next));
      // Параллельно что-то изменил партнёр: правки уже слиты, показываем общий результат.
      if (res && res.merged) setTransactions(migrateTransactions(JSON.parse(res.value), settings));
    } catch (e) {
      console.warn("Не удалось сохранить операции", e);
    }
  }

  async function persistSettings(next) {
    if (readOnlyRef.current) { showToast(`Бюджет «${spaceNames.partner}» — только просмотр`); return; }
    setSettings(next);
    try {
      const res = await storage.set("settings", JSON.stringify(next));
      if (res && res.merged) setSettings(migrateSettings(JSON.parse(res.value)));
    } catch (e) {
      console.warn("Не удалось сохранить настройки", e);
    }
  }

  // Восстановление из JSON-копии: заменяет настройки и операции.
  function importBackup(data) {
    const prevS = settings;
    const prevT = transactions;
    const s = migrateSettings(data.settings);
    persistSettings(s);
    persistTransactions(migrateTransactions(data.transactions, s));
    showToast("Данные восстановлены", { undo: () => { persistSettings(prevS); persistTransactions(prevT); } });
  }

  // Корректировка баланса из листа ожидания (сверка остатка с банком — см. reconcile.js)
  function fixBalance(card, diff) {
    addTransaction({ type: "adjustment", date: todayStr(), amount: diff, card, note: "Сверка с банком", hidden: false });
  }

  // Лист ожидания: подтягиваем при запуске, при возвращении в приложение и раз в минуту.
  async function refreshPending() {
    try { setPending(await inbox.list()); } catch { /* таблицы нет или нет сети: лист просто пуст */ }
  }
  useEffect(() => {
    if (!authUser || !loaded) return undefined;
    refreshPending();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refreshPending(); }, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") refreshPending(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [authUser?.id, loaded]);

  async function dropPending(id) {
    setPending((list) => list.filter((p) => p.id !== id));
    try { await inbox.remove(id); } catch { /* не удалилось — появится снова при следующем обновлении */ }
  }

  // ✓ «внести как есть»: категория угадана (или запомнена раньше).
  function acceptPending(row, parsed) {
    if (!parsed.understood || parsed.type !== "expense" || !parsed.suggestion || !parsed.card) return;
    const { bucket, category } = parsed.suggestion;
    addTransaction({
      type: "expense",
      date: receivedParts(row.received_at).date,
      amount: parsed.amount,
      card: parsed.card,
      bucket,
      category,
      note: parsed.merchant,
    });
    const learned = learnMerchant(settings, parsed.merchant, bucket, category);
    if (learned !== settings) persistSettings(learned);
    rememberOp({ source: row.source, type: "expense", amount: parsed.amount, balance: parsed.balance, receivedAt: row.received_at });
    dropPending(row.id);
  }

  // «Списать» личный долг (Фонд): возврат денег на/с карты или «простили» (деньги не двигаются).
  function repayLoan(loan, card, forgiven) {
    const prevT = transactions;
    addTransactions([buildRepay(loan, card, todayStr(), forgiven)]);
    showToast(forgiven ? "Долг закрыт без движения денег" : "Долг закрыт", { undo: () => persistTransactions(prevT) });
  }

  // Пара уведомлений «списано + поступило» = перевод между своими картами.
  function acceptTransfer(p) {
    addTransaction({
      type: "transfer",
      date: receivedParts(p.out.row.received_at).date,
      amount: p.amount,
      fromCard: p.out.parsed.card,
      toCard: p.in.parsed.card,
      note: "",
    });
    [p.out, p.in].forEach((leg) =>
      rememberOp({ source: leg.row.source, type: leg.parsed.type, amount: leg.parsed.amount, balance: leg.parsed.balance, receivedAt: leg.row.received_at })
    );
    dropPending(p.out.row.id);
    dropPending(p.in.row.id);
  }

  function editTransfer(p) {
    openForm({
      type: "transfer",
      date: receivedParts(p.out.row.received_at).date,
      amount: p.amount,
      fromCard: p.out.parsed.card,
      toCard: p.in.parsed.card,
      note: "",
      pendingId: p.out.row.id,
      pendingIds: [p.out.row.id, p.in.row.id],
      opFps: [p.out, p.in].map((leg) => ({ source: leg.row.source, type: leg.parsed.type, amount: leg.parsed.amount, balance: leg.parsed.balance, receivedAt: leg.row.received_at })),
    });
  }

  // После сохранения операции из листа ожидания: запомнить «место → категория» и убрать запись из листа.
  function finishPending(tx) {
    const pid = formInitial?.pendingId;
    if (!pid || formInitial?.editId) return;
    if (tx.type === "expense" && formInitial.merchant) {
      const learned = learnMerchant(settings, formInitial.merchant, tx.bucket, tx.category);
      if (learned !== settings) persistSettings(learned);
    }
    (formInitial.opFps || (formInitial.opFp ? [formInitial.opFp] : [])).forEach((op) => rememberOp(op));
    (formInitial.pendingIds || [pid]).forEach((id) => dropPending(id));
  }

  // ✎ «править»: открываем обычную форму с подставленными данными; после сохранения запись уйдёт из листа.
  function editPending(row, parsed) {
    const card = parsed.card || "sber";
    openForm({
      type: parsed.type,
      date: receivedParts(row.received_at).date,
      amount: parsed.amount ?? "",
      card,
      bucket: parsed.suggestion?.bucket,
      category: parsed.suggestion?.category,
      note: parsed.merchant || "",
      merchant: parsed.merchant || "",
      pendingId: row.id,
      opFp: { source: row.source, type: parsed.type, amount: parsed.amount, balance: parsed.balance, receivedAt: row.received_at },
    });
  }

  // «Провести» регулярный платёж: создаёт обычную трату (с учётом долгов между бюджетами)
  // и отмечает платёж проведённым за этот месяц.
  function postRecurring(item) {
    addTransaction(buildRecurringExpense(item, todayStr()));
    persistSettings({ ...settings, recurring: markPosted(settings.recurring, item.id, todayMonthKey()) });
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
    // «Общая» книга: расход, помеченный галочкой «Общая трата» (meta.shared), и любой расход с общей карты
    // попадает туда сам. Деньги с общей карты общие — долгов между вами это не создаёт (pool).
    const poolCards = partnerInfo ? settings.sharedCards || [] : [];
    const sharedToAdd = [];
    let notShared = false;
    const withIds = newTxs.map((tx) => {
      const base = { ...tx, id: tx.id || uid() };
      if (base.type !== "expense" || base.sharedId || base.hidden) return base;
      const pool = poolCards.includes(base.card);
      if (!pool && !meta?.shared) return base;
      if (sharedState !== "ready") { notShared = true; return base; }
      const sid = uid();
      sharedToAdd.push({
        id: sid,
        kind: "expense",
        date: base.date,
        amount: base.amount,
        catId: meta?.shared?.catId || guessSharedCat(sharedData.cats, base.category),
        note: base.note || "",
        paidBy: authUser.id,
        split: 50,
        ...(pool ? { pool: true } : {}),
        createdBy: authUser.id,
      });
      return { ...base, sharedId: sid };
    });
    if (sharedToAdd.length) {
      sharedMutate("shared-items", (arr) => [...arr, ...sharedToAdd.filter((n) => !arr.some((i) => i.id === n.id))]).then((ok) => {
        if (ok) sharedToAdd.forEach(notifySharedItem);
      });
    }
    // Личные расходы (если я открыл бюджет партнёру): сообщаем только о тех, что не ушли в «Общую».
    if (partnerInfo?.i_share) {
      withIds.forEach((tx) => {
        if (tx.type === "expense" && !tx.hidden && !tx.sharedId) push.notifyPartner({ kind: "personal", amount: tx.amount, category: tx.category || "" });
      });
    }
    let next = [...transactions, ...withIds];
    withIds.forEach((tx) => { next = syncLinkedDebt(next, tx, meta?.asDebt); });
    const prevT = transactions;
    persistTransactions(next);
    showToast(`Добавлено: ${describeTxs(withIds)}${notShared ? " · в «Общую» не попало: нет связи" : ""}`, {
      undo: () => {
        if (sharedToAdd.length) sharedMutate("shared-items", (arr) => arr.filter((i) => !sharedToAdd.some((n) => n.id === i.id)));
        persistTransactions(prevT);
      },
    });
  }

  function addTransaction(tx, meta) {
    addTransactions([tx], meta);
  }

  // Вместе с операцией удаляется и привязанный к ней долг (трата чужой картой / перевод-заём).
  function deleteTransaction(id) {
    const prevT = transactions;
    const tx = transactions.find((t) => t.id === id);
    const receiptTimer = tx?.receipt ? setTimeout(() => removeReceipt(id), 7000) : null;
    const sharedItem = tx?.sharedId ? sharedData.items.find((i) => i.id === tx.sharedId) : null;
    if (sharedItem) deleteSharedItem(sharedItem.id);
    persistTransactions(
      transactions.filter(
        (t) =>
          t.id !== id &&
          !(t.type === "debt" && t.sourceTxId === id) &&
          !(t.type === "loan" && t.kind === "repay" && t.loanId === id) // удалили долг — уходят и его возвраты
      )
    );
    showToast(`Удалено: ${describeTx(tx)}`, {
      undo: () => {
        if (receiptTimer) clearTimeout(receiptTimer);
        if (sharedItem) addSharedItem(sharedItem);
        persistTransactions(prevT);
      },
    });
  }

  // Сначала спрашиваем «Вы хотите удалить?», потом удаляем.
  function requestDelete(id) {
    setConfirmDel(id);
  }

  function updateTransaction(id, updatedTx, meta) {
    const old = transactions.find((t) => t.id === id);
    if (old?.sharedId) {
      // расход связан с записью в «Общей»: подтягиваем сумму, дату и заметку
      sharedMutate("shared-items", (arr) => arr.map((i) => (i.id === old.sharedId ? { ...i, amount: updatedTx.amount, date: updatedTx.date, note: updatedTx.note || "" } : i)));
    }
    const replaced = transactions.map((t) => (t.id === id ? { ...updatedTx, id, ...(old?.sharedId ? { sharedId: old.sharedId } : {}) } : t));
    const prevT = transactions;
    persistTransactions(syncLinkedDebt(replaced, { ...updatedTx, id }, meta?.asDebt));
    showToast(`Изменено: ${describeTx(updatedTx)}`, { undo: () => persistTransactions(prevT) });
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
    const prevT = transactions;
    persistTransactions(next);
    showToast(`Изменено: ${describeTxs([updatedFirst, ...newOnes])}`, { undo: () => persistTransactions(prevT) });
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
    const prevT = transactions;
    persistTransactions([...updated, ...created, settleTx]);
    showToast(
      `Переведено ${formatMoney(settleTx.amount)}: «${cardLabel(settings, debtorCard)}» → «${cardLabel(settings, creditorCard)}». Запись есть в операциях.`,
      { ms: 7000, undo: () => persistTransactions(prevT) }
    );
  }

  function closeMonth(mk, mode, leftoverNeeds, leftoverWants) {
    const prevS = settings;
    const prevT = transactions;
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
    showToast("Месяц закрыт", { undo: () => { persistSettings(prevS); persistTransactions(prevT); } });
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

  function openForm(initial) {
    if (readOnlyRef.current) { showToast(`Бюджет «${spaceNames.partner}» — только просмотр`); return; }
    setFormInitial(initial || { type: "expense", card: "sber", bucket: "needs" });
  }

  function closeForm() {
    setFormInitial(null);
  }

  async function submitForm(txIn, metaIn) {
    // Фото чека: загружаем до сохранения операции; не вышло — форма остаётся открытой.
    const rec = metaIn?.receipt;
    const editId = formInitial?.editId;
    const hadReceipt = !!(editId && transactions.find((t) => t.id === editId)?.receipt);
    const first = Array.isArray(txIn) ? txIn[0] : txIn;
    let receiptId = null;
    let keepFlag = false;
    if (first.type === "expense" && rec) {
      if (rec.data) {
        receiptId = editId || uid();
        try {
          await saveReceipt(receiptId, rec.data);
        } catch {
          showToast("Не удалось сохранить фото чека — нужен интернет", { ms: 3500 });
          return;
        }
        keepFlag = true;
      } else if (hadReceipt && rec.remove) {
        removeReceipt(editId);
      } else if (hadReceipt) {
        keepFlag = true;
      }
    }
    const tagFirst = (t) => (t === first && keepFlag ? { ...t, receipt: true, ...(receiptId && !editId ? { id: receiptId } : {}) } : t);
    const tx = Array.isArray(txIn) ? txIn.map(tagFirst) : tagFirst(txIn);
    const meta = metaIn && { ...metaIn, receipt: undefined };

    if (Array.isArray(tx)) {
      if (formInitial?.editId) {
        updateTransactionAsSplit(formInitial.editId, tx);
      } else {
        addTransactions(tx, meta);
        finishPending(tx[0]);
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
    finishPending(tx);
    // Если это доход — показываем модалку автоматического распределения
    if (tx.type === "income" && !tx.excludeIncome) {
      setNewIncomeTx(tx);
    }
    closeForm();
  }

  function handleAutoDistribute() {
    if (!newIncomeTx) return;
    const split = computeIncomeSplitWithDebts(newIncomeTx.amount, settings, transactions, { date: newIncomeTx.date, incomeId: newIncomeTx.id, match: { date: newIncomeTx.date, amount: newIncomeTx.amount, card: newIncomeTx.card } });
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
    if (space === "shared") { setPageIndex(0); setSharedFormOpen(true); return; }
    if (!formInitial && pageIndex >= 1 && pageIndex <= 3) {
      openForm(defaultAddFormFor(pageIndex));
    } else {
      selectPage(lastAddPage);
    }
  }

  function goPage(delta) {
    if (formInitial || space === "shared") return;
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

  const viewSettings = readOnly && partnerData ? partnerData.settings : settings;
  const viewTransactions = readOnly && partnerData ? partnerData.transactions : transactions;
  const spaceCtx = partnerInfo
    ? {
        enabled: true,
        current: space,
        names: spaceNames,
        partnerShares: !!partnerInfo.partner_shares,
        onSelect: selectSpace,
        sharedAvailable: sharedState === "ready",
        sharedCards: settings.sharedCards || [],
        sharedCats: sharedCatsOf(sharedData.cats),
      }
    : null;
  const showPartnerPlaceholder = readOnly && !partnerData && !formInitial && pageIndex !== 4;
  const openReceipt = readOnly ? () => showToast("Фото чеков партнёра недоступны") : setReceiptViewId;

  return (
    <SpaceContext.Provider value={spaceCtx}>
    <ReceiptContext.Provider value={openReceipt}>
      <AppStyles />

      {receiptViewId && <ReceiptModal txId={receiptViewId} onClose={() => setReceiptViewId(null)} />}



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

            {showPartnerPlaceholder ? (
              <div className="screen-stack">
                <SpaceSwitch />
                <div className="panel" style={{ textAlign: "center" }}>
                  {partnerState === "noaccess" ? (
                    <div className="muted" style={{ fontSize: 13 }}>«{spaceNames.partner}» пока не открыл доступ к бюджету.</div>
                  ) : partnerState === "error" ? (
                    <>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Не получилось загрузить бюджет «{spaceNames.partner}».</div>
                      <button type="button" className="btn" onClick={loadPartnerData}>Повторить</button>
                    </>
                  ) : (
                    <div className="muted" style={{ fontSize: 13 }}>Загружаю бюджет «{spaceNames.partner}»…</div>
                  )}
                </div>
              </div>
            ) : formInitial ? (
              <div className="screen-stack">
                <FullAddForm
                  settings={settings}
                  transactions={transactions}
                  initial={formInitial}
                  onSubmit={submitForm}
                  onCancel={closeForm}
                />
              </div>
            ) : space === "shared" && pageIndex !== 4 ? (
              <SharedView
                items={sharedData.items}
                cats={sharedData.cats}
                names={spaceNames}
                myId={authUser?.id}
                partnerId={partnerInfo?.partner?.id}
                state={sharedState === "idle" ? "loading" : sharedState}
                errorText={sharedError}
                onRetry={() => loadShared()}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                formOpen={sharedFormOpen}
                setFormOpen={setSharedFormOpen}
                onAddItem={addSharedItem}
                onDeleteItem={deleteSharedItem}
                onAddCat={addSharedCat}
              />
            ) : pageIndex === 0 ? (
              <AnalysisView
                readOnly={readOnly}
                onPostRecurring={ro(postRecurring)}
                onFixBalance={ro(fixBalance)}
                onBalanceOk={(text) => showToast(text)}
                pending={readOnly ? [] : pending}
                onAcceptPending={ro(acceptPending)}
                onEditPending={ro(editPending)}
                onDismissPending={ro((row) => dropPending(row.id))}
                onRepayLoan={ro(repayLoan)}
                onAcceptTransfer={ro(acceptTransfer)}
                onEditTransfer={ro(editTransfer)}
                onDismissTransfer={ro((p) => { dropPending(p.out.row.id); dropPending(p.in.row.id); })}
                settings={viewSettings}
                transactions={viewTransactions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onDelete={ro(requestDelete)}
                onEditTx={ro((tx) => openForm(deriveFormInitialFromTx(tx, transactions)))}
                onToggleInclude={ro(toggleIncludeInTotal)}
                onCloseMonth={ro(closeMonth)}
                onWriteOffDebtGroup={ro(writeOffDebtGroup)}
                goToAdd={() => selectPage(1)}
              />
            ) : pageIndex >= 1 && pageIndex <= 3 ? (
              <AddPageContent
                pageIndex={pageIndex - 1}
                settings={viewSettings}
                transactions={viewTransactions}
                openForm={openForm}
                canPrev={pageIndex > 0}
                canNext={pageIndex < 4}
                onPrev={() => goPage(-1)}
                onNext={() => goPage(1)}
                onSelectPage={(i) => selectPage(i + 1)}
                onDeleteTx={ro(requestDelete)}
                onEditTx={ro((tx) => openForm(deriveFormInitialFromTx(tx, transactions)))}
                onSaveSettings={persistSettings}
              />
            ) : (
              <SettingsView
                settings={settings}
                transactions={transactions}
                onImport={importBackup}
                onSaveSettings={persistSettings}
                onSave={persistSettings}
                onWipeAll={wipeHistory}
                user={authUser}
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
            locked={readOnly}
            onSelectAdd={handleSelectAdd}
            onSelectAnalysis={() => selectPage(0)}
            onSelectSettings={() => selectPage(4)}
          />
          <Toast toast={toast} />
          {confirmDel && (() => {
            const tx = transactions.find((t) => t.id === confirmDel);
            if (!tx) return null;
            const when = tx.date ? new Date(`${tx.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "";
            return (
              <ConfirmSheet
                title="Вы хотите удалить?"
                text={`${describeTx(tx)}${when ? ` · ${when}` : ""}`}
                confirmLabel="Удалить"
                onCancel={() => setConfirmDel(null)}
                onConfirm={() => { setConfirmDel(null); deleteTransaction(confirmDel); }}
              />
            );
          })()}
        </div>
      </div>
    </ReceiptContext.Provider>
    </SpaceContext.Provider>
  );
}
