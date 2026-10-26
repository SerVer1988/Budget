/* Сводка для виджета на главном экране: остатки по трём бюджетам, траты за сегодня и месяц.
   Считается здесь, в приложении (теми же функциями, что и экран «Анализ»), и отправляется на сервер, пока виджет подключён. */
import { aggregateMonth, computeBalances } from "./finance.js";
import { bucketName, todayStr } from "./format.js";

const rub = (n) => Math.round(Number(n) || 0);

export function buildWidgetSummary(transactions, settings, today = todayStr(), now = new Date()) {
  const list = transactions || [];
  const b = computeBalances(list, settings, null);
  const m = aggregateMonth(today.slice(0, 7), list, settings);
  const spentToday = list
    .filter((t) => t.type === "expense" && !t.hidden && t.date === today)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return {
    v: 1,
    at: now.toISOString(),
    names: { sber: bucketName(settings, "needs"), alfa: bucketName(settings, "wants"), ozon: bucketName(settings, "savings") },
    bal: { sber: rub(b.sber), alfa: rub(b.alfa), ozon: rub(b.ozon) },
    // «из …» на виджете: сколько поступило на карты «Нужд» и «Желаний» за месяц, и цель накоплений для «Подушки»
    av: { sber: rub(m.sberAvail), alfa: rub(m.alfaAvail) },
    goal: rub(settings.goal),
    today: rub(spentToday),
    income: rub(m.incomeTotal),
    spent: rub(m.sberSpent + m.alfaSpent + m.ozonSpent),
  };
}

/* Подпись сводки без времени: если она не изменилась, повторно на сервер не отправляем. */
export const summarySignature = (s) => JSON.stringify({ ...s, at: undefined });

/* Что открыть при запуске по ярлыку или кнопке виджета: «?add=expense | income | scan». */
export function parseLaunchAction(search) {
  const v = new URLSearchParams(search || "").get("add");
  if (v === "expense") return { type: "expense" };
  if (v === "income") return { type: "income" };
  if (v === "scan") return { type: "expense", autoScan: true };
  return null;
}
