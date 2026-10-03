import React, { useMemo } from "react";
import {
  PiggyBank,
  ArrowUp,
} from "lucide-react";
import { FolderHero } from "./cards.jsx";
import { CategoryDonut } from "./charts.jsx";
import { GoalsPanel, SavingsChart } from "./SavingsPanel.jsx";
import { computeSavingsSeries } from "./savings.js";
import { CategoryTile, ListTile, StatBox } from "./ui.jsx";
import { BUCKET_STYLE, C, getIcon } from "./constants.js";
import { computeIncomeSplitWithDebts } from "./debts.js";
import { aggregateMonth, categoryStats, computeCategoryAverages, estimateMonthlyRate, ozonDayStats } from "./finance.js";
import { bucketName, bucketOf, cardLabel, clampPct, formatMoney, todayMonthKey } from "./format.js";

/* ============================================================ NEW: Income Modal & Limit Status */
export function IncomeDistributionModal({ incomeTx, settings, transactions, onDistribute, onClose }) {
  if (!incomeTx) return null;

  const split = computeIncomeSplitWithDebts(incomeTx.amount, settings, transactions);
  const pctOf = (v) => (incomeTx.amount > 0 ? Math.round((v / incomeTx.amount) * 100) : 0);
  const hasRepayments = split.repayments.length > 0;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, background: C.sberSoft, color: C.sber, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <ArrowUp size={24} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: C.ink }}>
            Поступило {formatMoney(incomeTx.amount)}
          </h3>
          <p style={{ fontSize: 13, color: C.inkMuted, margin: 0 }}>
            {hasRepayments ? "Часть пойдёт на погашение долга:" : "Рекомендуем распределить:"}
          </p>
        </div>

        <div style={{ background: C.bg, borderRadius: 16, padding: 16, marginBottom: hasRepayments ? 10 : 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В «{bucketName(settings, "needs")}» ({pctOf(split.toSber)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.sber }}>{formatMoney(split.toSber)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В «{bucketName(settings, "wants")}» ({pctOf(split.toAlfa)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.alfa }}>{formatMoney(split.toAlfa)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>В «{bucketName(settings, "savings")}» ({pctOf(split.toOzon)}%)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ozon }}>{formatMoney(split.toOzon)}</span>
          </div>
        </div>

        {hasRepayments && (
          <div className="notice" style={{ marginBottom: 20, borderColor: C.amber, background: C.amberSoft }}>
            Пропорция временно изменена (вместо обычной): {split.repayments.map((r, i) => (
              <span key={r.debtId}>{i > 0 ? ", " : ""}{formatMoney(r.amount)} на погашение долга</span>
            ))}.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn primary" onClick={onDistribute}>Распределить автоматически</button>
          <button className="btn" style={{ background: "transparent", border: "none" }} onClick={onClose}>Сделаю сам</button>
        </div>
      </div>
    </div>
  );
}

export function CategoryPanel({
  title,
  card,
  categories,
  transactions,
  settings,
  balances,
  activeIndex,
  onSelectBucket,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
  onDeleteTx,
  onEditTx,
}) {
  const bucket = bucketOf(card);
  const style = BUCKET_STYLE[bucket];

  const stats = useMemo(() => categoryStats(transactions, bucket), [transactions, bucket]);
  const ordered = useMemo(
    () => [...categories].sort((a, b) => (stats[b.name]?.count || 0) - (stats[a.name]?.count || 0)),
    [categories, stats]
  );

  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);
  const inflow = card === "sber" ? agg.sberInflow : agg.alfaInflow;
  const outflow = card === "sber" ? agg.sberOutflow : agg.alfaOutflow;
  const monthlyTotals = card === "sber" ? agg.needCatTotals : agg.wantCatTotals;
  const catAverages = useMemo(
    () => computeCategoryAverages(transactions, settings, categories, bucket, todayMonthKey()).avg,
    [transactions, settings, categories, bucket]
  );

  return (
    <div className="add-panel">
      <FolderHero
        art={style.art}
        card={card}
        settings={settings}
        title={title}
        titleColor={style.titleColor}
        inflow={inflow}
        outflow={outflow}
        balances={balances}
        activeIndex={activeIndex}
        onSelectBucket={onSelectBucket}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onAdd={() => onOpenFull({ type: "expense", card, bucket })}
        addLabel="Новое"
      />

      <div className="cat-list">
        {ordered.map((cat) => {
          const s = stats[cat.name];
          const Icon = getIcon(cat.icon);

          return (
            <CategoryTile
              key={cat.name}
              icon={Icon}
              color={cat.color}
              name={cat.name}
              spent={monthlyTotals[cat.name] || 0}
              avg={catAverages[cat.name] || 0}
              onClick={() => {
                onOpenFull({
                  type: "expense",
                  card,
                  bucket,
                  category: cat.name,
                  amount: s?.modalAmount ?? "",
                });
              }}
            />
          );
        })}
      </div>

      <CategoryDonut
        categories={categories}
        totals={monthlyTotals}
        bucketLabel={title}
        transactions={transactions}
        bucket={bucket}
        settings={settings}
        onDeleteTx={onDeleteTx}
        onEditTx={onEditTx}
      />
    </div>
  );
}

export function OzonPanel({
  settings,
  transactions,
  balances,
  activeIndex,
  onSelectBucket,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenFull,
  onSaveSettings,
}) {
  const dayStats = useMemo(() => ozonDayStats(transactions), [transactions]);
  const days = settings.reminderDays.length ? settings.reminderDays : [5, 15, 30];
  const agg = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);

  const balance = balances.ozon || 0;

  const pct = settings.goal > 0 ? balance / settings.goal : 0;
  const left = settings.goal - balance;
  const series = useMemo(() => computeSavingsSeries(transactions, settings), [transactions, settings]);
  const thisMonth = useMemo(() => aggregateMonth(todayMonthKey(), transactions, settings), [transactions, settings]);

  const ozonEntries = useMemo(() => {
    const list = transactions.filter((t) =>
      (t.type === "adjustment" && t.card === "ozon") ||
      (t.type === "transfer" && (t.fromCard === "ozon" || t.toCard === "ozon"))
    );
    return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions]);

  const visibleDays = days.slice(0, 4);
  while (visibleDays.length < 4) visibleDays.push(null);

  return (
    <div className="add-panel">
      {/* Пополнение подушки — обычный перевод, а не заём, поэтому галочка «Считать долгом» здесь выключена */}
      <FolderHero
        art={BUCKET_STYLE.savings.art}
        card="ozon"
        settings={settings}
        title={bucketName(settings, "savings")}
        titleColor={BUCKET_STYLE.savings.titleColor}
        inflow={agg.ozonInflow}
        outflow={agg.ozonOutflow}
        balances={balances}
        activeIndex={activeIndex}
        onSelectBucket={onSelectBucket}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onAdd={() => onOpenFull({ type: "transfer", fromCard: "sber", toCard: "ozon", debt: false })}
        addLabel="Новый перевод"
      />

      <div className="quick-grid">
        {visibleDays.map((d, i) => {
          if (!d) return <ListTile key={`empty-day-${i}`} empty />;

          const s = dayStats[d];

          return (
            <ListTile
              key={d}
              icon={PiggyBank}
              color={C.ozon}
              name={`${d} числа`}
              amount={s?.modalAmount ?? null}
              onClick={() => {
                onOpenFull({
                  type: "transfer",
                  fromCard: "sber",
                  toCard: "ozon",
                  debt: false,
                  amount: s?.modalAmount ?? "",
                });
              }}
            />
          );
        })}
      </div>

      <div className="ozon-detail">
        <div className="soft-card" style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 4 }}>Баланс «{bucketName(settings, "savings")}»</div>
          <div className="mono" style={{ fontSize: 27, lineHeight: 1.1, fontWeight: 900, color: C.ozon }}>
            {formatMoney(balance)}
          </div>
          <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4, marginBottom: 11 }}>
            из цели {formatMoney(settings.goal)}
          </div>
          <div className="progress">
            <div style={{ width: `${clampPct(pct) * 100}%` }} />
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 9,
            fontSize: 11,
            color: C.inkMuted,
          }}>
            <span className="mono">{Math.round(clampPct(pct) * 100)}%</span>
            <span className="mono" style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {left > 0 ? `осталось ${formatMoney(left)}` : "цель достигнута"}
            </span>
          </div>
        </div>

        <div className="stat-grid">
          <StatBox
            label="В этом месяце"
            value={`${thisMonth.ozonNet >= 0 ? "+" : ""}${formatMoney(thisMonth.ozonNet)}`}
            color={C.ozon}
          />
          <StatBox
            label="Прогноз до цели"
            value={series.monthsLeft === 0 ? "готово" : series.eta ? series.eta.short : "—"}
            color={C.ozon}
          />
        </div>

        <SavingsChart transactions={transactions} settings={settings} />

        <GoalsPanel settings={settings} savingsBalance={balance} onSaveSettings={onSaveSettings} />

        <div>
          <div className="section-title">История «{bucketName(settings, "savings")}»</div>
          {ozonEntries.length === 0 ? (
            <div className="history-list" style={{ padding: 16, textAlign: "center", fontSize: 12, color: C.inkMuted }}>
              Переводы и корректировки, которые касаются «{bucketName(settings, "savings")}», появятся здесь.
            </div>
          ) : (
            <div className="history-list">
              {ozonEntries.slice(0, 8).map((t) => {
                const isTransferOut = t.type === "transfer" && t.fromCard === "ozon";
                const signedAmt = isTransferOut ? -t.amount : t.amount;
                const label = t.type === "adjustment"
                  ? (t.note || (t.amount < 0 ? "Списание" : "Пополнение"))
                  : isTransferOut ? (t.note || `Перевод в ${cardLabel(settings, t.toCard)}`)
                  : (t.note || `Перевод из ${cardLabel(settings, t.fromCard)}`);

                return (
                  <div key={t.id} className="tx-row">
                    <div className="tx-main">
                      <div className="tx-label">{label} {t.hidden ? "(скрыто)" : ""}</div>
                      <div className="tx-sub">{t.date}</div>
                    </div>
                    <div className="tx-amount" style={{ color: signedAmt < 0 ? C.danger : C.ozon }}>
                      {signedAmt < 0 ? "−" : "+"}{formatMoney(Math.abs(signedAmt))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
