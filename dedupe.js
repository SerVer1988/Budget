/* Защита от повторов: одна и та же операция может прийти и SMS, и push-уведомлением (а иногда и два раза подряд).
   Две записи считаем одной операцией, если совпали банк, направление и сумма, и при этом
   — у обеих есть остаток после операции и он одинаковый (две настоящие одинаковые покупки подряд дают разный остаток),
   — либо хотя бы у одной остатка нет, и они пришли с разницей не больше 3 минут. */

const SAME_BALANCE_WINDOW = 6 * 3600 * 1000;
const NO_BALANCE_WINDOW = 3 * 60 * 1000;
const KEEP_MS = 12 * 3600 * 1000;
const KEY = "budget:seen-ops";

function same(a, b) {
  if (a.s !== b.s || a.t !== b.t || Math.abs(a.a - b.a) >= 0.005) return false;
  const dt = Math.abs(a.at - b.at);
  if (a.b != null && b.b != null) return Math.abs(a.b - b.b) < 0.005 && dt <= SAME_BALANCE_WINDOW;
  return dt <= NO_BALANCE_WINDOW;
}

function fingerprint(r) {
  return {
    s: r.row.source,
    t: r.parsed.type,
    a: r.parsed.amount,
    b: typeof r.parsed.balance === "number" ? r.parsed.balance : null,
    at: Date.parse(r.row.received_at) || 0,
  };
}

// чем больше сведений в записи, тем лучше её оставить
function score(r) {
  const p = r.parsed;
  return (p.merchant ? 4 : 0) + (p.balance != null ? 2 : 0) + (p.suggestion ? 1 : 0);
}

function loadSeen() {
  try {
    const now = Date.now();
    return (JSON.parse(localStorage.getItem(KEY) || "[]") || []).filter((e) => now - e.at < KEEP_MS);
  } catch {
    return [];
  }
}

/* Запомнить внесённую (или убранную) операцию, чтобы её копия, пришедшая позже другим каналом, не попала в лист ожидания.
   op: { source, type, amount, balance (или null), receivedAt } */
export function rememberOp(op) {
  try {
    if (!op || !op.source || !(op.amount > 0)) return;
    const list = loadSeen();
    list.push({
      s: op.source,
      t: op.type,
      a: Number(op.amount),
      b: typeof op.balance === "number" ? op.balance : null,
      at: Date.parse(op.receivedAt) || Date.now(),
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* хранилище недоступно — не страшно */
  }
}

/* rows: [{ row, parsed }] — записи листа ожидания. Возвращает Set id записей, которые являются повтором:
   либо копией другой записи из этого же списка (оставляем более подробную), либо копией уже внесённой операции. */
export function duplicateIds(rows) {
  const drop = new Set();
  const live = rows.filter((r) => r.parsed.understood && !r.parsed.ignorable);
  const seen = loadSeen();

  live.forEach((r) => {
    const f = fingerprint(r);
    if (seen.some((e) => same(e, f))) drop.add(r.row.id);
  });

  const left = live.filter((r) => !drop.has(r.row.id));
  for (let i = 0; i < left.length; i++) {
    for (let j = i + 1; j < left.length; j++) {
      const a = left[i];
      const b = left[j];
      if (drop.has(a.row.id) || drop.has(b.row.id)) continue;
      if (!same(fingerprint(a), fingerprint(b))) continue;
      const keepA = score(a) > score(b) || (score(a) === score(b) && Date.parse(a.row.received_at) <= Date.parse(b.row.received_at));
      drop.add((keepA ? b : a).row.id);
    }
  }
  return drop;
}
