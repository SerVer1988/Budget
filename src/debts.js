import { CARD_BUCKET, DEBT_PAYER_ORDER, DEBT_REPAY_CAP } from "./constants.js";
import { bucketOf, uid } from "./format.js";

export function computeIncomeSplit(amount, settings) {
  const toOzon = amount * (settings.savePct / 100);
  const toAlfa = amount * (settings.wantPct / 100);
  const toSber = amount - toOzon - toAlfa;
  return { toSber, toAlfa, toOzon };
}

/* Как обычный computeIncomeSplit, но если есть непогашенные "внутренние займы" между
   бюджетами — часть доли бакета-должника перенаправляется бакету-кредитору, пока долг
   не погасится. Возвращает ещё и repayments: сколько и по какому долгу ушло на погашение. */
export function computeIncomeSplitWithDebts(amount, settings, transactions) {
  const base = computeIncomeSplit(amount, settings);
  const shareOf = { needs: base.toSber, wants: base.toAlfa, savings: base.toOzon };

  const activeDebts = (transactions || []).filter(
    (t) => t.type === "debt" && !t.repaid && t.remainingAmount > 0
  );

  if (activeDebts.length === 0) {
    return { toSber: shareOf.needs, toAlfa: shareOf.wants, toOzon: shareOf.savings, repayments: [] };
  }

  const redirectedFrom = { needs: 0, wants: 0, savings: 0 };
  const repayments = [];
  const shareKey = { needs: "toSber", wants: "toAlfa", savings: "toOzon" };

  activeDebts.forEach((debt) => {
    const debtor = debt.toBucket;
    const lender = debt.fromBucket;
    if (!(debtor in shareOf) || !(lender in shareOf)) return;

    const debtorShare = base[shareKey[debtor]];
    const maxRedirect = debtorShare * DEBT_REPAY_CAP - redirectedFrom[debtor];
    if (maxRedirect <= 0) return;

    const repay = Math.min(debt.remainingAmount, maxRedirect);
    if (repay < 1) return;

    shareOf[debtor] -= repay;
    shareOf[lender] += repay;
    redirectedFrom[debtor] += repay;
    repayments.push({ debtId: debt.id, amount: repay });
  });

  return { toSber: shareOf.needs, toAlfa: shareOf.wants, toOzon: shareOf.savings, repayments };
}

/* ------------------------------------------------------------ внутренние долги, связанные с операциями
   Какой долг между бюджетами должна породить операция (или null, если никакой):
   • Трата, оплаченная картой «чужого» бюджета (например, «Нужды» с карты Альфа):
     кредитор — бюджет, которому принадлежит карта, должник — бюджет самой траты.
   • Перевод с включённой галочкой «Считать долгом»: кредитор — бюджет карты-источника,
     должник — бюджет карты-получателя. */
export function debtSpecFor(tx, asDebt) {
  if (tx.type === "expense") {
    const bucket = tx.bucket || bucketOf(tx.card);
    const lender = CARD_BUCKET[tx.card];
    if (!lender || lender === bucket) return null;
    return { fromBucket: lender, toBucket: bucket };
  }

  if (tx.type === "transfer" && asDebt) {
    const lender = CARD_BUCKET[tx.fromCard];
    const debtor = CARD_BUCKET[tx.toCard];
    if (!lender || !debtor || lender === debtor) return null;
    return { fromBucket: lender, toBucket: debtor };
  }

  return null;
}

/* Приводит долг, привязанный к операции (поле sourceTxId), в соответствие с самой операцией:
   создаёт его, обновляет сумму/направление или убирает, если долг больше не нужен.
   Возвращает новый список операций. Работает и при добавлении, и при правке, и при разбивке. */
export function syncLinkedDebt(list, tx, asDebt) {
  const spec = debtSpecFor(tx, asDebt);
  const existing = list.find((t) => t.type === "debt" && t.sourceTxId === tx.id);

  if (!spec) {
    return existing ? list.filter((t) => t.id !== existing.id) : list;
  }

  if (!existing) {
    return [
      ...list,
      {
        id: uid(),
        type: "debt",
        date: tx.date,
        amount: tx.amount,
        remainingAmount: tx.amount,
        fromBucket: spec.fromBucket,
        toBucket: spec.toBucket,
        repaid: false,
        note: "",
        sourceTxId: tx.id,
      },
    ];
  }

  const sameDirection = existing.fromBucket === spec.fromBucket && existing.toBucket === spec.toBucket;
  let updated;

  if (!sameDirection) {
    updated = {
      ...existing,
      date: tx.date,
      amount: tx.amount,
      remainingAmount: tx.amount,
      fromBucket: spec.fromBucket,
      toBucket: spec.toBucket,
      repaid: false,
    };
  } else {
    // Уже погашенная часть сохраняется, меняется только «хвост».
    const alreadyRepaid = Math.max(0, existing.amount - existing.remainingAmount);
    const remaining = existing.repaid ? 0 : Math.max(0, tx.amount - alreadyRepaid);
    updated = {
      ...existing,
      date: tx.date,
      amount: tx.amount,
      remainingAmount: remaining,
      repaid: existing.repaid || remaining <= 0,
    };
  }

  return list.map((t) => (t.id === existing.id ? updated : t));
}

export function aggregateOpenDebts(openDebts) {
  const net = {};
  const ids = [];
  openDebts.forEach((d) => {
    const amt = Number(d.remainingAmount) || 0;
    if (amt <= 0) return;
    // fromBucket — кредитор, toBucket — должник
    net[d.fromBucket] = (net[d.fromBucket] || 0) + amt;
    net[d.toBucket] = (net[d.toBucket] || 0) - amt;
    ids.push(d.id);
  });

  const debtors = Object.keys(net)
    .filter((b) => net[b] <= -1)
    .map((b) => ({ b, left: -net[b] }))
    .sort((x, y) => (DEBT_PAYER_ORDER[x.b] ?? 9) - (DEBT_PAYER_ORDER[y.b] ?? 9));
  const creditors = Object.keys(net)
    .filter((b) => net[b] >= 1)
    .map((b) => ({ b, left: net[b] }))
    .sort((x, y) => y.left - x.left);

  const plan = [];
  debtors.forEach((d) => {
    creditors.forEach((c) => {
      if (d.left < 1 || c.left < 1) return;
      const amount = Math.min(d.left, c.left);
      d.left -= amount;
      c.left -= amount;
      if (Math.round(amount) >= 1) {
        plan.push({
          key: `${d.b}>${c.b}`,
          fromBucket: c.b,
          toBucket: d.b,
          amount: Math.round(amount),
          ids,
        });
      }
    });
  });
  return plan;
}
