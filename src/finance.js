import { loanCash, validRepayIds } from "./loans.js";
import { BUCKET_CARD } from "./constants.js";
import { bucketOf, cardLabel, dayOfMonth, formatMoney, monthKeyOf, needPctOf, shiftMonth, todayMonthKey } from "./format.js";

export function computeBalances(transactions, settings, uptoDateInclusive) {
  let sber = settings.openingBalance?.sber || 0;
  let alfa = settings.openingBalance?.alfa || 0;
  let ozon = settings.openingBalance?.ozon || 0;
  const list = uptoDateInclusive ? transactions.filter((t) => t.date <= uptoDateInclusive) : transactions;

  const add = (card, amt) => {
    if (card === "sber") sber += amt;
    else if (card === "alfa") alfa += amt;
    else if (card === "ozon") ozon += amt;
  };

  const validRepays = validRepayIds(transactions);

  list.forEach((t) => {
    if (t.type === "loan") {
      if (t.kind !== "repay" || validRepays.has(t.id)) add(t.card, loanCash(t));
    } else if (t.type === "income") add(t.card, t.amount);
    else if (t.type === "expense") add(t.card, -t.amount);
    else if (t.type === "adjustment") add(t.card, t.amount);
    else if (t.type === "transfer") {
      add(t.fromCard, -t.amount);
      add(t.toCard, t.amount);
    }
  });

  return { sber, alfa, ozon };
}

export function aggregateMonth(mk, transactions, settings) {
  const inMonth = transactions.filter((t) => monthKeyOf(t.date) === mk);

  const acc = {
    sber: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
    alfa: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
    ozon: { income: 0, transferIn: 0, transferOut: 0, spent: 0, adj: 0 },
  };

  let incomeTotal = 0;
  const needCatTotals = {};
  const wantCatTotals = {};
  settings.needCats.forEach((c) => { needCatTotals[c.name] = 0; });
  settings.wantCats.forEach((c) => { wantCatTotals[c.name] = 0; });

  inMonth.forEach((t) => {
    if (t.type === "income") {
      acc[t.card].income += t.amount;
      incomeTotal += t.amount;
    } else if (t.type === "expense") {
      acc[t.card].spent += t.amount;
      const bucket = t.bucket || (t.card === "alfa" ? "wants" : "needs");
      if (bucket === "needs") needCatTotals[t.category] = (needCatTotals[t.category] || 0) + t.amount;
      else if (bucket === "wants") wantCatTotals[t.category] = (wantCatTotals[t.category] || 0) + t.amount;
    } else if (t.type === "adjustment") {
      acc[t.card].adj += t.amount;
    } else if (t.type === "transfer") {
      acc[t.fromCard].transferOut += t.amount;
      acc[t.toCard].transferIn += t.amount;
    }
  });

  function derive(x) {
    const adjIn = x.adj > 0 ? x.adj : 0;
    const adjOut = x.adj < 0 ? -x.adj : 0;
    const avail = x.income + x.transferIn - x.transferOut;
    const inflow = x.income + x.transferIn + adjIn;
    const outflow = x.spent + x.transferOut + adjOut;
    const net = avail - x.spent + x.adj;
    return { avail, inflow, outflow, net, spent: x.spent };
  }

  const sberD = derive(acc.sber);
  const alfaD = derive(acc.alfa);
  const ozonD = derive(acc.ozon);

  const items = inMonth.filter((t) => !t.hidden).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return {
    incomeTotal,
    sberAvail: sberD.avail,
    alfaAvail: alfaD.avail,
    ozonAvail: ozonD.avail,
    sberInflow: sberD.inflow,
    alfaInflow: alfaD.inflow,
    ozonInflow: ozonD.inflow,
    sberOutflow: sberD.outflow,
    alfaOutflow: alfaD.outflow,
    ozonOutflow: ozonD.outflow,
    sberSpent: sberD.spent,
    alfaSpent: alfaD.spent,
    ozonSpent: ozonD.spent,
    sberNet: sberD.net,
    alfaNet: alfaD.net,
    ozonNet: ozonD.net,
    needCatTotals,
    wantCatTotals,
    needsSpent: Object.values(needCatTotals).reduce((a, b) => a + b, 0),
    wantsSpent: Object.values(wantCatTotals).reduce((a, b) => a + b, 0),
    needsLimit: incomeTotal * (needPctOf(settings) / 100),
    wantsLimit: incomeTotal * (settings.wantPct / 100),
    items,
  };
}

/* ============================================================ Smart Notes engine (50/30/20 cross-card control) */
export function computeCumulativeAllocation(transactions, settings) {
  // Needs/Wants track since the last reconciliation point (set when the user closes a
  // month, or manually reset in Settings) instead of since the beginning of time — this
  // stops long-unclosed surpluses/deficits from piling up into unrealistic numbers.
  // null = never reconciled yet = behaves exactly as before (full history).
  const sinceDate = settings.needsWantsResetDate || null;
  const recent = sinceDate ? transactions.filter((t) => t.date > sinceDate) : transactions;

  let recentIncome = 0;
  recent.forEach((t) => { if (t.type === "income") recentIncome += t.amount; });

  let needsSpent = 0;
  let wantsSpent = 0;
  recent.forEach((t) => {
    if (t.type !== "expense") return;
    const bucket = t.bucket || (t.card === "alfa" ? "wants" : "needs");
    if (bucket === "needs") needsSpent += t.amount;
    else if (bucket === "wants") wantsSpent += t.amount;
  });

  const needPct = needPctOf(settings);
  const needsAllocated = recentIncome * (needPct / 100);
  const wantsAllocated = recentIncome * (settings.wantPct / 100);

  // Savings intentionally stays fully cumulative, all-time — a "подушка" is meant to
  // keep growing across months, unlike Needs/Wants which should roughly zero out.
  let allTimeIncome = 0;
  transactions.forEach((t) => { if (t.type === "income") allTimeIncome += t.amount; });
  let saveSpent = 0;
  transactions.forEach((t) => {
    if (t.type === "adjustment" && t.card === "ozon" && t.amount < 0) saveSpent += -t.amount;
    if (t.type === "transfer" && t.fromCard === "ozon") saveSpent += t.amount;
  });
  const saveAllocated = allTimeIncome * (settings.savePct / 100);

  const baseline = sinceDate ? computeBalances(transactions, settings, sinceDate) : { sber: 0, alfa: 0 };

  return {
    needsTarget: needsAllocated - needsSpent,
    wantsTarget: wantsAllocated - wantsSpent,
    saveTarget: saveAllocated - saveSpent,
    baselineSber: baseline.sber,
    baselineAlfa: baseline.alfa,
    sinceDate,
  };
}

/* Derives a per-category monthly limit: each category's historical share (last 3
   completed months, i.e. excluding the current in-progress one) of its bucket's total
   spend, applied to this month's bucket plan. Cold start (no history yet) splits the
   bucket plan evenly across the bucket's configured categories. */
export function computeCategoryLimits(transactions, settings, categories, bucket, currentMonthKey, bucketLimitThisMonth) {
  const limits = {};
  if (!categories.length || bucketLimitThisMonth <= 0) {
    categories.forEach((c) => { limits[c.name] = 0; });
    return limits;
  }

  const catTotals = {};
  categories.forEach((c) => { catTotals[c.name] = 0; });
  let bucketHistTotal = 0;

  let mk = shiftMonth(currentMonthKey, -1);
  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    const totals = bucket === "wants" ? agg.wantCatTotals : agg.needCatTotals;
    categories.forEach((c) => {
      const v = totals[c.name] || 0;
      catTotals[c.name] += v;
      bucketHistTotal += v;
    });
    mk = shiftMonth(mk, -1);
  }

  if (bucketHistTotal > 0) {
    categories.forEach((c) => {
      limits[c.name] = bucketLimitThisMonth * (catTotals[c.name] / bucketHistTotal);
    });
  } else {
    const evenShare = bucketLimitThisMonth / categories.length;
    categories.forEach((c) => { limits[c.name] = evenShare; });
  }

  return limits;
}

/* ============================================================ Insights engine (rotating tips) */

/* Средняя трата по каждой категории за прошлые месяцы: до трёх последних месяцев, в которых были
   расходы (месяцы без единой траты, например до начала учёта, не считаются).
   Возвращает { avg: { [название категории]: число }, months: сколько месяцев учтено }. */
export function computeCategoryAverages(transactions, settings, categories, bucket, currentMonthKey) {
  const keys = [];
  let mk = currentMonthKey;
  for (let i = 0; i < 6 && keys.length < 3; i++) {
    mk = shiftMonth(mk, -1);
    if (transactions.some((t) => t.type === "expense" && monthKeyOf(t.date) === mk)) keys.push(mk);
  }

  const avg = {};
  categories.forEach((c) => { avg[c.name] = 0; });
  if (!keys.length) return { avg, months: 0 };

  keys.forEach((k) => {
    const agg = aggregateMonth(k, transactions, settings);
    const totals = bucket === "wants" ? agg.wantCatTotals : agg.needCatTotals;
    categories.forEach((c) => { avg[c.name] += totals[c.name] || 0; });
  });
  categories.forEach((c) => { avg[c.name] /= keys.length; });
  return { avg, months: keys.length };
}

export function categoryStats(transactions, bucket) {
  const byName = {};
  transactions.filter((t) => t.type === "expense" && (t.bucket || bucketOf(t.card)) === bucket).forEach((t) => {
    if (!byName[t.category]) byName[t.category] = {};
    byName[t.category][t.amount] = (byName[t.category][t.amount] || 0) + 1;
  });

  const stats = {};
  Object.entries(byName).forEach(([name, amounts]) => {
    let count = 0;
    let modalAmount = null;
    let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) {
        modalCount = c;
        modalAmount = Number(amtStr);
      }
    });
    stats[name] = { count, modalAmount };
  });

  return stats;
}

export function ozonDayStats(transactions) {
  const byDay = {};
  transactions.forEach((t) => {
    let amt = null;
    if (t.type === "transfer" && t.toCard === "ozon") amt = t.amount;
    else if (t.type === "adjustment" && t.card === "ozon" && t.amount > 0) amt = t.amount;
    if (amt == null) return;

    const day = dayOfMonth(t.date);
    if (!byDay[day]) byDay[day] = {};
    byDay[day][amt] = (byDay[day][amt] || 0) + 1;
  });

  const result = {};
  Object.entries(byDay).forEach(([day, amounts]) => {
    let count = 0;
    let modalAmount = null;
    let modalCount = 0;
    Object.entries(amounts).forEach(([amtStr, c]) => {
      count += c;
      if (c > modalCount) {
        modalCount = c;
        modalAmount = Number(amtStr);
      }
    });
    result[day] = { count, modalAmount };
  });

  return result;
}

export function estimateMonthlyRate(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    if (agg.ozonNet !== 0) {
      sum += agg.ozonNet;
      count += 1;
    }
    mk = shiftMonth(mk, -1);
  }

  return count > 0 ? sum / count : 0;
}

export function estimateAvgMonthlyNeeds(transactions, settings, fromMonthKey) {
  let mk = fromMonthKey;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < 3; i++) {
    const agg = aggregateMonth(mk, transactions, settings);
    if (agg.needsSpent > 0) {
      sum += agg.needsSpent;
      count += 1;
    }
    mk = shiftMonth(mk, -1);
  }

  return count > 0 ? sum / count : 0;
}

export function getAllMonthKeys(transactions) {
  const set = new Set(transactions.map((t) => monthKeyOf(t.date)));
  set.add(todayMonthKey());
  return Array.from(set).sort();
}

/* Карты, которых касается операция (для фильтра по картам). */
export function txCardsOf(t) {
  if (t.type === "transfer") return [t.fromCard, t.toCard];
  if (t.type === "debt") return [BUCKET_CARD[t.fromBucket], BUCKET_CARD[t.toBucket]].filter(Boolean);
  return t.card ? [t.card] : [];
}

/* Строка, по которой ищем: заметка, категория, названия карт, сумма. */
export function txSearchText(t, settings) {
  const cards = txCardsOf(t).map((c) => cardLabel(settings, c));
  return [t.note, t.category, t.person, ...cards, String(Math.abs(t.amount ?? 0)), formatMoney(Math.abs(t.amount ?? 0))]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* Влияние операции на сумму. Если выбраны карты, перевод между выбранной и
   невыбранной картой тоже учитывается; между двумя выбранными — взаимно гасится. */
export function txImpactFor(t, cardFilters) {
  if (t.type === "transfer" && cardFilters.length > 0) {
    return (cardFilters.includes(t.toCard) ? t.amount : 0) - (cardFilters.includes(t.fromCard) ? t.amount : 0);
  }
  return txNetImpact(t);
}

export function txNetImpact(t) {
  if (t.type === "expense") return -t.amount;
  if (t.type === "income") return t.amount;
  if (t.type === "adjustment") return t.amount;
  return 0; // перевод между своими картами не меняет общую сумму
}
