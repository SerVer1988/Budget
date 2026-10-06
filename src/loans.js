/* Личные долги с людьми («Вы дали в долг» / «Вам дали в долг»).
   Запись долга: { type: "loan", direction: "lent" | "borrowed", person, amount, card, date, note }.
   Возврат — отдельная запись: { type: "loan", kind: "repay", loanId, direction, person, amount, card, date, forgiven? }.
   Долг открыт, пока на него нет возврата. Деньги двигаются по карте так:
     дали в долг — с карты ушли; вам дали — на карту пришли; возврат — наоборот; «простили» — деньги не двигаются.
   В расходы и доходы месяца такие записи не попадают: это не траты и не заработок. */

export const isLoan = (t) => t.type === "loan";
export const isRepay = (t) => t.type === "loan" && t.kind === "repay";

/* Как запись меняет баланс своей карты. */
export function loanCash(t) {
  if (t.type !== "loan") return 0;
  if (t.kind === "repay") {
    if (t.forgiven) return 0;
    return t.direction === "lent" ? t.amount : -t.amount;
  }
  return t.direction === "lent" ? -t.amount : t.amount;
}

/* Возвраты, которые считаются: по одному на долг (если двое одновременно закрыли один долг, второй не в счёт)
   и только у долгов, которые ещё существуют. */
export function validRepayIds(transactions) {
  const loanIds = new Set(transactions.filter((t) => isLoan(t) && !isRepay(t)).map((t) => t.id));
  const first = new Map();
  transactions
    .filter((t) => isRepay(t) && loanIds.has(t.loanId))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1))
    .forEach((t) => { if (!first.has(t.loanId)) first.set(t.loanId, t.id); });
  return new Set(first.values());
}

/* Открытые долги (для «Фонда»), от старых к новым. */
export function openLoans(transactions) {
  const valid = validRepayIds(transactions);
  const reallyClosed = new Set(transactions.filter((t) => valid.has(t.id)).map((t) => t.loanId));
  return transactions
    .filter((t) => isLoan(t) && !isRepay(t) && !reallyClosed.has(t.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* Имена людей из прошлых долгов — подсказки при вводе. */
export function knownPeople(transactions) {
  return [...new Set(transactions.filter((t) => isLoan(t) && t.person).map((t) => t.person))].sort();
}

/* Какой «тип» у записи для фильтра в списке операций: личные долги идут вместе с «Долгами». */
export function filterTypeOf(t) {
  return t.type === "loan" ? "debt" : t.type;
}

/* Сколько дней до срока возврата (отрицательное — просрочен); null — срок не указан. */
export function daysUntilDue(loan, todayDateStr) {
  if (!loan.dueDate) return null;
  const p = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(loan.dueDate) - p(todayDateStr)) / 86400000);
}

export function buildRepay(loan, card, todayDateStr, forgiven) {
  return {
    type: "loan",
    kind: "repay",
    loanId: loan.id,
    direction: loan.direction,
    person: loan.person,
    amount: loan.amount,
    card,
    date: todayDateStr,
    note: "",
    ...(forgiven ? { forgiven: true } : {}),
  };
}
