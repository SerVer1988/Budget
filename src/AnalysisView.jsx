import React, { useState, useMemo } from "react";
import {
  X,
  ArrowRight,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BankCard, BankCardDetail, TotalBalanceCard, TxRow } from "./cards.jsx";
import { ForecastPanel } from "./ForecastPanel.jsx";
import { RecurringPanel } from "./RecurringPanel.jsx";
import { ChartsCarousel, DailyExpenseChart } from "./charts.jsx";
import { NotifyNudge } from "./NotifyNudge.jsx";
import { InboxPanel } from "./InboxPanel.jsx";
import { computeForecast } from "./forecast.js";
import { BankBadge, EmptyState, MonthNav, SectionTitle, StatBox } from "./ui.jsx";
import { BUCKET_CARD, C, TX_TYPE_FILTERS } from "./constants.js";
import { aggregateOpenDebts } from "./debts.js";
import { aggregateMonth, computeBalances, txCardsOf, txImpactFor, txNetImpact, txSearchText } from "./finance.js";
import { bucketIconSrc, bucketName, dayOfMonth, daysInMonth, endOfMonthStr, formatMoney, monthLabel, shiftMonth, todayMonthKey, todayStr } from "./format.js";

export function AnalysisView({
  settings,
  transactions,
  selectedMonth,
  setSelectedMonth,
  onDelete,
  onEditTx,
  onToggleInclude,
  onCloseMonth,
  onWriteOffDebtGroup,
  onPostRecurring,
  pending,
  onAcceptPending,
  onEditPending,
  onDismissPending,
  onAcceptTransfer,
  onEditTransfer,
  onDismissTransfer,
  goToAdd,
}) {
  const agg = useMemo(() => aggregateMonth(selectedMonth, transactions, settings), [selectedMonth, transactions, settings]);
  const prevAgg = useMemo(
    () => aggregateMonth(shiftMonth(selectedMonth, -1), transactions, settings),
    [selectedMonth, transactions, settings]
  );
  const isCurrentMonth = selectedMonth === todayMonthKey();
  const daysLeftInMonth = isCurrentMonth
    ? Math.max(1, daysInMonth(selectedMonth) - dayOfMonth(todayStr()) + 1)
    : 0;
  const [expandedCards, setExpandedCards] = useState({});
  function toggleCard(key) {
    setExpandedCards((s) => ({ ...s, [key]: !s[key] }));
  }
  const balances = useMemo(
    () => computeBalances(transactions, settings, endOfMonthStr(selectedMonth)),
    [transactions, settings, selectedMonth]
  );
  // Прогноз до аванса показываем прямо в карточках «Потребности» и «Хотения».
  const forecastByCard = useMemo(() => {
    const m = {};
    if (isCurrentMonth) computeForecast(transactions, settings).forEach((f) => { m[f.card] = f; });
    return m;
  }, [isCurrentMonth, transactions, settings]);
  const openDebts = useMemo(
    () => transactions.filter((t) => t.type === "debt" && !t.repaid).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );
  const debtGroups = useMemo(() => aggregateOpenDebts(openDebts), [openDebts]);
  const isPastMonth = selectedMonth < todayMonthKey();
  const monthNeedsLeftover = agg.needsLimit - agg.needsSpent;
  const monthWantsLeftover = agg.wantsLimit - agg.wantsSpent;
  const showCloseBanner =
    isPastMonth &&
    !(settings.closedMonths || []).includes(selectedMonth) &&
    (monthNeedsLeftover > 1 || monthWantsLeftover > 1);

  const totalBalance = ["sber", "alfa", "ozon"].reduce((sum, key) => {
    if (!settings.includeInTotal?.[key]) return sum;
    return sum + (balances[key] || 0);
  }, 0);

  const chartData = [
    { name: bucketName(settings, "needs"), value: agg.needsSpent, fill: C.sber },
    { name: bucketName(settings, "wants"), value: agg.wantsSpent, fill: C.alfa },
    { name: bucketName(settings, "savings"), value: Math.max(0, agg.ozonNet), fill: C.ozon },
  ];

  const monthItems = agg.items;
  const [typeFilters, setTypeFilters] = useState([]);
  const [cardFilters, setCardFilters] = useState([]);
  const [searchText, setSearchText] = useState("");

  function toggleFilter(list, setList, id) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const searchWords = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filteredItems = monthItems.filter((t) => {
    if (typeFilters.length > 0 && !typeFilters.includes(t.type)) return false;
    if (cardFilters.length > 0 && !txCardsOf(t).some((c) => cardFilters.includes(c))) return false;
    if (searchWords.length > 0) {
      const hay = txSearchText(t, settings);
      if (!searchWords.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  const filteredTotal = filteredItems.reduce((sum, t) => sum + txImpactFor(t, cardFilters), 0);

  const groupedItems = useMemo(() => {
    const groups = [];
    let currentDate = null;
    filteredItems.forEach((tx) => {
      if (tx.date !== currentDate) {
        currentDate = tx.date;
        groups.push({ date: tx.date, items: [] });
      }
      groups[groups.length - 1].items.push(tx);
    });
    return groups.map((g) => {
      let income = 0;
      let expense = 0;
      g.items.forEach((t) => {
        const impact = txNetImpact(t);
        if (impact >= 0) income += impact;
        else expense += impact;
      });
      return { ...g, income, expense };
    });
  }, [filteredItems]);

  return (
    <div className="screen-stack">
      <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      <NotifyNudge />

      <InboxPanel
        pending={pending || []}
        settings={settings}
        transactions={transactions}
        onAccept={onAcceptPending}
        onEdit={onEditPending}
        onDismiss={onDismissPending}
        onAcceptTransfer={onAcceptTransfer}
        onEditTransfer={onEditTransfer}
        onDismissTransfer={onDismissTransfer}
      />

      {showCloseBanner && (
        <div className="notice" style={{ borderColor: C.ozon, background: C.ozonSoft, color: "#0F3E70" }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{monthLabel(selectedMonth)} завершён</div>
          <div style={{ marginBottom: 10 }}>
            Остаток: {bucketName(settings, "needs")} {formatMoney(Math.max(0, monthNeedsLeftover))}, {bucketName(settings, "wants")} {formatMoney(Math.max(0, monthWantsLeftover))}.
            Перенести на текущий месяц или отправить в «{bucketName(settings, "savings")}»?
          </div>
          <div className="button-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              onClick={() => onCloseMonth(selectedMonth, "keep", monthNeedsLeftover, monthWantsLeftover)}
            >
              Перенести
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => onCloseMonth(selectedMonth, "toSavings", monthNeedsLeftover, monthWantsLeftover)}
            >
              В «{bucketName(settings, "savings")}»
            </button>
          </div>
        </div>
      )}

      <div className="summary-row">
        <TotalBalanceCard total={totalBalance} settings={settings} onToggle={onToggleInclude} />
        <div className="summary-side">
          <StatBox compact label="Доход" value={`+${formatMoney(agg.incomeTotal)}`} color={C.sber} />
          <StatBox compact label="Расходы" value={`−${formatMoney(agg.sberSpent + agg.alfaSpent + agg.ozonSpent)}`} color={C.danger} />
        </div>
      </div>

      {isCurrentMonth && <ForecastPanel transactions={transactions} />}

      {debtGroups.length > 0 && (
        <div className="panel">
          <SectionTitle>Фонд</SectionTitle>
          <div className="history-list">
            {debtGroups.map((g) => (
              <div key={g.key} className="tx-row debt-row">
                <div className="debt-main">
                  <span className="debt-label">Долг</span>
                  <span className="debt-icon" style={{ "--debt-color": C[BUCKET_CARD[g.toBucket]] }}>
                    <BankBadge src={bucketIconSrc(settings, g.toBucket)} />
                  </span>
                  <ArrowRight size={16} className="debt-arrow" />
                  <span className="debt-icon" style={{ "--debt-color": C[BUCKET_CARD[g.fromBucket]] }}>
                    <BankBadge src={bucketIconSrc(settings, g.fromBucket)} />
                  </span>
                </div>
                <div className="tx-amount" style={{ color: C.amber }}>{formatMoney(g.amount)}</div>
                <button
                  type="button"
                  className="btn"
                  style={{ height: 30, padding: "0 10px", fontSize: 11, flex: "0 0 auto" }}
                  onClick={() => onWriteOffDebtGroup(g)}
                >
                  Списать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <BankCard
        stripe={C.sber}
        icon={bucketIconSrc(settings, "needs")}
        name={bucketName(settings, "needs")}
        bigValue={balances.sber}
        forecast={forecastByCard.sber}
        expanded={!!expandedCards.sber}
        onToggle={() => toggleCard("sber")}
      >
        <BankCardDetail
          stripe={C.sber}
          soft={C.sberSoft}
          spent={agg.sberSpent}
          avail={agg.sberAvail}
          prevSpent={prevAgg.sberSpent}
          bucketSpent={agg.needsSpent}
          prevBucketSpent={prevAgg.needsSpent}
          bucketLabel={bucketName(settings, "needs")}
          daysLeft={daysLeftInMonth}
          isCurrentMonth={isCurrentMonth}
          dangerColor={C.danger}
        />
      </BankCard>

      <BankCard
        stripe={C.alfa}
        icon={bucketIconSrc(settings, "wants")}
        name={bucketName(settings, "wants")}
        bigValue={balances.alfa}
        forecast={forecastByCard.alfa}
        expanded={!!expandedCards.alfa}
        onToggle={() => toggleCard("alfa")}
      >
        <BankCardDetail
          stripe={C.alfa}
          soft={C.alfaSoft}
          spent={agg.alfaSpent}
          avail={agg.alfaAvail}
          prevSpent={prevAgg.alfaSpent}
          bucketSpent={agg.wantsSpent}
          prevBucketSpent={prevAgg.wantsSpent}
          bucketLabel={bucketName(settings, "wants")}
          daysLeft={daysLeftInMonth}
          isCurrentMonth={isCurrentMonth}
          dangerColor={C.danger}
        />
      </BankCard>

      <BankCard
        stripe={C.ozon}
        icon={bucketIconSrc(settings, "savings")}
        name={bucketName(settings, "savings")}
        bigValue={balances.ozon}
        expanded={!!expandedCards.ozon}
        onToggle={() => toggleCard("ozon")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="bank-progress" style={{ background: C.ozonSoft }}>
            <div
              style={{
                width: `${settings.goal > 0 ? Math.min(100, (balances.ozon / settings.goal) * 100) : 0}%`,
                background: C.ozon,
              }}
            />
          </div>
        </div>
        <div className="small-note" style={{ marginTop: 4 }}>
          Цель: {formatMoney(settings.goal)} · за месяц {agg.ozonNet >= 0 ? "+" : ""}{formatMoney(agg.ozonNet)}
          {prevAgg.ozonNet !== 0 && (
            <>
              {" "}
              ({agg.ozonNet - prevAgg.ozonNet >= 0 ? "+" : ""}
              {Math.round(((agg.ozonNet - prevAgg.ozonNet) / Math.abs(prevAgg.ozonNet)) * 100)}% к прошлому мес.)
            </>
          )}
        </div>
      </BankCard>

      <ChartsCarousel
        slides={[
          {
            title: "Динамика расходов",
            render: () => <DailyExpenseChart monthItems={monthItems} monthKey={selectedMonth} settings={settings} />,
          },
          {
            title: "Структура месяца",
            render: () => (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 4, bottom: 4, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.inkMuted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} width={42} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="value" name="Сумма" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ),
          },
        ]}
      />

      {isCurrentMonth && <RecurringPanel settings={settings} onPost={onPostRecurring} />}

      <div>
        <SectionTitle>Операции</SectionTitle>

        {monthItems.length > 0 && (
          <>
            <div className="ops-sticky">
              <div className="ops-search">
                <Search size={15} />
                <input
                  type="text"
                  inputMode="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Поиск по заметке, категории, сумме"
                  aria-label="Поиск по операциям"
                />
                {searchText && (
                  <button type="button" onClick={() => setSearchText("")} aria-label="Очистить поиск">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="ops-chips ops-chips-scroll">
                {TX_TYPE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`type-filter-chip ${typeFilters.includes(f.id) ? "active" : ""}`}
                    onClick={() => toggleFilter(typeFilters, setTypeFilters, f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="ops-chips ops-chips-cards">
                {[
                  { id: "sber", bucket: "needs", color: C.sber },
                  { id: "alfa", bucket: "wants", color: C.alfa },
                  { id: "ozon", bucket: "savings", color: C.ozon },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`type-filter-chip ${cardFilters.includes(c.id) ? "active" : ""}`}
                    onClick={() => toggleFilter(cardFilters, setCardFilters, c.id)}
                  >
                    <span className="chip-dot" style={{ background: c.color }} />
                    {bucketName(settings, c.bucket)}
                  </button>
                ))}
                <span
                  className="mono ops-total"
                  style={{ color: filteredTotal >= 0 ? C.sber : C.danger }}
                  title="Итого по показанным"
                >
                  {filteredTotal >= 0 ? "+" : "−"}{formatMoney(Math.abs(filteredTotal))}
                </span>
              </div>
            </div>
          </>
        )}

        {monthItems.length === 0 ? (
          <EmptyState onAdd={goToAdd} />
        ) : filteredItems.length === 0 ? (
          <div className="soft-card" style={{ padding: 20, textAlign: "center" }}>
            <span className="muted" style={{ fontSize: 13 }}>Ничего не подходит под выбранные фильтры.</span>
          </div>
        ) : (
          <div className="history-list">
            {groupedItems.map((g) => (
              <React.Fragment key={g.date}>
                <div className="day-total-header">
                  {g.income > 0 && (
                    <span style={{ color: C.sber }}>+{formatMoney(g.income)}</span>
                  )}
                  {g.income > 0 && g.expense < 0 && <span className="day-total-sep"> / </span>}
                  {g.expense < 0 && (
                    <span style={{ color: C.danger }}>−{formatMoney(Math.abs(g.expense))}</span>
                  )}
                  {g.income === 0 && g.expense === 0 && (
                    <span style={{ color: C.inkMuted }}>0 ₽</span>
                  )}
                </div>
                {g.items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} settings={settings} onDelete={onDelete} onEdit={onEditTx} />
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
