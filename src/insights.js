import { C, FINANCE_TIPS, SMART_NOTE_THRESHOLD } from "./constants.js";
import { computeRecurring } from "./recurring.js";
import { comparisonPeriodText, computeForecast, computeMonthComparison, nextPaydayInfo, shortDate } from "./forecast.js";
import { aggregateOpenDebts, computeIncomeSplit } from "./debts.js";
import { aggregateMonth, computeBalances, computeCategoryLimits, computeCumulativeAllocation, estimateAvgMonthlyNeeds } from "./finance.js";
import { bucketName, bucketNameGen, cardLabel, dayOfMonth, dayOfYear, formatDateRu, formatMoney, needPctOf, ruPlural, todayMonthKey, todayStr } from "./format.js";

export function smartNoteFor(settings, bucketLabel, card, balance, target, overspend, sinceLabel) {
  const suffix = sinceLabel ? ` (с ${sinceLabel})` : "";

  if (overspend > 0) {
    return {
      type: "over",
      color: C.danger,
      soft: C.dangerSoft,
      text: `Внимание! По категории «${bucketLabel}» расходы превышают план на ${formatMoney(overspend)}${suffix}. Сократите траты или компенсируйте из другой категории.`,
    };
  }

  const diff = balance - Math.max(0, target);

  if (diff < -SMART_NOTE_THRESHOLD) {
    return {
      type: "under",
      color: C.amber,
      soft: C.amberSoft,
      text: `Вы забыли перевести деньги! На карте ${cardLabel(settings, card)} на ${formatMoney(-diff)} меньше, чем запланировано по бюджету «${bucketLabel}»${suffix}.`,
    };
  }

  // «Сбережения» копятся нарастающим итогом, и баланс выше плана там — это хорошо
  // (остатки месяцев, стартовый баланс), поэтому напоминание про излишек только для Нужд/Желаний.
  if (diff > SMART_NOTE_THRESHOLD && card !== "ozon") {
    return {
      type: "excess",
      color: "#2D8C6F",
      soft: "#E4F2EC",
      text: `Баланс карты ${cardLabel(settings, card)} выше плана «${bucketLabel}» на ${formatMoney(diff)}${suffix}. Возможно, вы забыли распределить эти деньги по другим картам.`,
    };
  }

  return {
    type: "ok",
    color: C.inkMuted,
    soft: C.surface2,
    text: `Баланс ${cardLabel(settings, card)} соответствует плану «${bucketLabel}».`,
  };
}

export function computeSmartNotes(transactions, settings) {
  const alloc = computeCumulativeAllocation(transactions, settings);
  const balances = computeBalances(transactions, settings, null);
  const sinceLabel = alloc.sinceDate ? formatDateRu(alloc.sinceDate) : null;

  const needsOver = alloc.needsTarget < 0 ? -alloc.needsTarget : 0;
  const wantsOver = alloc.wantsTarget < 0 ? -alloc.wantsTarget : 0;
  const saveOver = alloc.saveTarget < 0 ? -alloc.saveTarget : 0;

  return {
    sber: smartNoteFor(settings, bucketName(settings, "needs"), "sber", balances.sber - alloc.baselineSber, alloc.needsTarget, needsOver, sinceLabel),
    alfa: smartNoteFor(settings, bucketName(settings, "wants"), "alfa", balances.alfa - alloc.baselineAlfa, alloc.wantsTarget, wantsOver, sinceLabel),
    ozon: smartNoteFor(settings, bucketName(settings, "savings"), "ozon", balances.ozon, alloc.saveTarget, saveOver, null),
  };
}

export function computePaydayCountdownInsight(settings, balances) {
  const info = nextPaydayInfo(settings);
  if (!info || info.daysLeft < 1) return null;

  const dailyLimit = Math.floor(Math.max(0, balances.sber) / info.daysLeft);

  return {
    id: "payday-countdown",
    color: C.amber,
    soft: C.amberSoft,
    text: `До аванса ${info.day}-го числа осталось ${info.daysLeft} ${ruPlural(info.daysLeft, "день", "дня", "дней")}. Ваш безопасный лимит на день по карте ${bucketNameGen(settings, "needs")} — ${formatMoney(dailyLimit)}.`,
  };
}

/* Разбор трат месяца по категориям: где явно вышли за обычную долю, и куда ушло
   больше всего денег в каждом бюджете. */
export function computeCategoryInsights(transactions, settings) {
  const mk = todayMonthKey();
  const agg = aggregateMonth(mk, transactions, settings);
  const insights = [];

  function buildFor(bucketKey, bucketLabel, categories, totals, limitTotal) {
    const limits = computeCategoryLimits(transactions, settings, categories, bucketKey, mk, limitTotal);
    const spentList = categories
      .map((cat) => ({ name: cat.name, spent: totals[cat.name] || 0, limit: limits[cat.name] || 0 }))
      .filter((c) => c.spent > 0);

    spentList.forEach((c) => {
      if (c.limit > 0 && c.spent > c.limit * 1.15 && c.spent - c.limit >= 300) {
        insights.push({
          id: `cat-over-${bucketKey}-${c.name}`,
          color: C.danger,
          soft: C.dangerSoft,
          text: `В этом месяце на «${c.name}» ушло ${formatMoney(c.spent)} — заметно больше обычного (около ${formatMoney(c.limit)}). Возможно, стоит сократить траты в этой категории.`,
        });
      }
    });

    if (spentList.length) {
      const top = spentList.reduce((a, b) => (b.spent > a.spent ? b : a));
      const alreadyFlagged = insights.some((i) => i.id === `cat-over-${bucketKey}-${top.name}`);
      if (!alreadyFlagged) {
        const pct = limitTotal > 0 ? Math.round((top.spent / limitTotal) * 100) : null;
        insights.push({
          id: `cat-top-${bucketKey}`,
          color: C.ozon,
          soft: C.ozonSoft,
          text: `Больше всего среди «${bucketLabel}» в этом месяце ушло на «${top.name}»: ${formatMoney(top.spent)}${pct != null ? ` (${pct}% от плана «${bucketLabel}»)` : ""}.`,
        });
      }
    }
  }

  buildFor("needs", bucketName(settings, "needs"), settings.needCats, agg.needCatTotals, agg.needsLimit);
  buildFor("wants", bucketName(settings, "wants"), settings.wantCats, agg.wantCatTotals, agg.wantsLimit);

  return insights;
}

/* Собирает все подсказки в один список для карусели: аванс, баланс карт
   относительно плана, разбор категорий, непогашенные внутренние долги. */
/* Прогноз: хватит ли денег до выплаты. «Потребности» — всегда, «Хотения» — только если не хватит. */
export function computeForecastInsights(transactions, settings) {
  const out = [];
  computeForecast(transactions, settings).forEach((f) => {
    if (f.status === "ok" && f.bucket === "needs") {
      out.push({
        id: `forecast-${f.card}`,
        color: C.sber,
        soft: C.sberSoft,
        text: `Денег на карте «${f.name}» хватит до аванса ${f.payDay}-го: при темпе около ${formatMoney(Math.round(f.rate))} в день к нему останется примерно ${formatMoney(Math.round(f.left))}.`,
      });
    } else if (f.status === "short") {
      out.push({
        id: `forecast-${f.card}`,
        color: C.danger,
        soft: C.dangerSoft,
        text: `При темпе около ${formatMoney(Math.round(f.rate))} в день деньги на карте «${f.name}» закончатся ${shortDate(f.runOutDate)} — за ${f.shortDays} ${ruPlural(f.shortDays, "день", "дня", "дней")} до аванса ${f.payDay}-го. Чтобы дотянуть, тратьте не больше ${formatMoney(f.safeDaily)} в день.`,
      });
    }
  });
  return out;
}

/* Сравнение с прошлыми месяцами: общий итог и самые заметные категории. */
export function computeComparisonInsights(transactions) {
  const cmp = computeMonthComparison(transactions);
  if (!cmp) return [];
  const out = [];
  const period = comparisonPeriodText(cmp.months);
  const days = `${cmp.day} ${ruPlural(cmp.day, "день", "дня", "дней")}`;

  const t = cmp.total;
  if (t.pct != null && Math.abs(t.pct) >= 10 && Math.abs(t.diff) >= 500) {
    const up = t.diff > 0;
    out.push({
      id: "cmp-total",
      color: up ? C.amber : C.sber,
      soft: up ? C.amberSoft : C.sberSoft,
      text: `За ${days} месяца потрачено ${formatMoney(Math.round(t.cur))} — на ${Math.abs(t.pct)}% ${up ? "больше" : "меньше"}, чем ${period} к этому дню.`,
    });
  }

  const noteworthy = (r) => r.pct != null && Math.abs(r.pct) >= 15 && Math.abs(r.diff) >= 500;
  const up = cmp.rows.find((r) => r.diff > 0 && noteworthy(r));
  const down = cmp.rows.find((r) => r.diff < 0 && noteworthy(r));
  if (up) {
    out.push({
      id: "cmp-up",
      color: C.danger,
      soft: C.dangerSoft,
      text: `На «${up.name}» в этом месяце на ${up.pct}% больше, чем ${period}: ${formatMoney(Math.round(up.cur))} вместо ${formatMoney(Math.round(up.avg))} к этому дню.`,
    });
  }
  if (down) {
    out.push({
      id: "cmp-down",
      color: C.sber,
      soft: C.sberSoft,
      text: `На «${down.name}» вы тратите на ${Math.abs(down.pct)}% меньше, чем ${period}: ${formatMoney(Math.round(down.cur))} вместо ${formatMoney(Math.round(down.avg))} к этому дню.`,
    });
  }
  return out;
}

/* Платежи, которые пора провести или наступят в ближайшие дни. */
export function computeRecurringInsights(settings, today) {
  const out = [];
  computeRecurring(settings, today).forEach((r) => {
    const amount = formatMoney(r.amount);
    let text = null;
    if (r.daysUntil < 0) {
      const n = -r.daysUntil;
      text = `Платёж «${r.name}» (${amount}) ждёт проведения уже ${n} ${ruPlural(n, "день", "дня", "дней")}. Проведите его в разделе «Платежи» на вкладке «Анализ».`;
    } else if (r.daysUntil === 0) {
      text = `Сегодня платёж «${r.name}» — ${amount}. Проведите его в разделе «Платежи» на вкладке «Анализ».`;
    } else if (r.daysUntil <= 3) {
      text = `Через ${r.daysUntil} ${ruPlural(r.daysUntil, "день", "дня", "дней")} платёж «${r.name}» — ${amount}.`;
    }
    if (text) out.push({ id: `recurring-${r.id}`, color: C.amber, soft: C.amberSoft, text });
  });
  return out;
}

export function computeAllInsights(transactions, settings) {
  const balances = computeBalances(transactions, settings, null);
  const smartNotes = computeSmartNotes(transactions, settings);
  const today = todayStr();
  const day = dayOfMonth(today);
  const insights = [];

  if (settings.reminderDays.includes(day)) {
    const todayIncome = transactions
      .filter((t) => t.type === "income" && t.date === today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayIncome <= 0) {
      insights.push({
        id: "payday-today",
        color: C.amber,
        soft: C.amberSoft,
        text: `Сегодня день выплаты — не забудьте занести доход на вкладке «Добавить», приложение подскажет, сколько перевести в «${bucketName(settings, "wants")}» и «${bucketName(settings, "savings")}».`,
      });
    } else {
      const split = computeIncomeSplit(todayIncome, settings);
      const needPct = needPctOf(settings);
      insights.push({
        id: "payday-distribute",
        color: C.amber,
        soft: C.amberSoft,
        text: `Из сегодняшнего дохода (${formatMoney(todayIncome)}): ${formatMoney(split.toAlfa)} в «${bucketName(settings, "wants")}», ${formatMoney(split.toOzon)} в «${bucketName(settings, "savings")}». Остальное (${needPct}%) остаётся на карте зачисления.`,
      });
    }
  } else {
    const countdown = computePaydayCountdownInsight(settings, balances);
    if (countdown) insights.push(countdown);
  }

  insights.push(...computeRecurringInsights(settings, today));
  insights.push(...computeForecastInsights(transactions, settings));

  ["sber", "alfa", "ozon"].forEach((card) => {
    const note = smartNotes[card];
    if (note && note.type !== "ok") {
      insights.push({ id: `smart-${card}`, color: note.color, soft: note.soft, text: note.text });
    }
  });

  const openDebts = transactions.filter((t) => t.type === "debt" && !t.repaid && t.remainingAmount > 0);
  aggregateOpenDebts(openDebts).forEach((g) => {
    insights.push({
      id: `debt-${g.key}`,
      color: C.amber,
      soft: C.amberSoft,
      text: `Долг: «${bucketName(settings, g.toBucket)}» → «${bucketName(settings, g.fromBucket)}» ${formatMoney(g.amount)}. Гасится автоматически при следующем доходе.`,
    });
  });

  insights.push(...computeCategoryInsights(transactions, settings));
  insights.push(...computeComparisonInsights(transactions));

  // Сколько прожить на «Сбережения» без работы, и правило неприкосновенности.
  const avgMonthlyNeeds = estimateAvgMonthlyNeeds(transactions, settings, todayMonthKey());
  insights.push({
    id: "runway",
    color: C.ozon,
    soft: C.ozonSoft,
    text: runwayText(settings, balances.ozon, avgMonthlyNeeds),
  });
  insights.push({
    id: "savings-rule",
    color: C.ozon,
    soft: C.ozonSoft,
    text: `Деньги из «${bucketName(settings, "savings")}» не трогаем ни при каких условиях, кроме реального форс-мажора — потери работы или проблем со здоровьем.`,
  });

  insights.push({
    id: "tip",
    color: "#2D8C6F",
    soft: "#E4F2EC",
    text: `Совет: ${FINANCE_TIPS[dayOfYear(today) % FINANCE_TIPS.length]}`,
  });

  return insights;
}

export function runwayText(settings, balance, avgMonthlyNeeds) {
  if (avgMonthlyNeeds <= 0) {
    return `Добавьте несколько трат в «${bucketName(settings, "needs")}» — тогда посчитаем, на сколько хватит «${bucketName(settings, "savings")}».`;
  }

  const totalMonths = Math.max(0, balance) / avgMonthlyNeeds;
  const months = Math.floor(totalMonths);
  const days = Math.round((totalMonths - months) * 30);

  if (months === 0 && days === 0) {
    return `«${bucketName(settings, "savings")}» пока не покрывает даже дня обязательных расходов.`;
  }

  const parts = [];
  if (months > 0) parts.push(`${months} ${ruPlural(months, "месяц", "месяца", "месяцев")}`);
  if (days > 0) parts.push(`${days} ${ruPlural(days, "день", "дня", "дней")}`);

  return `«${bucketName(settings, "savings")}» позволит вам полностью не работать ${parts.join(" и ")}.`;
}
