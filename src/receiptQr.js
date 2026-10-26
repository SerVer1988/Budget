/* Разбор QR-кода кассового чека (формат ФНС): t=20261025T1245&s=1850.00&fn=…&i=…&fp=…&n=1
   t — дата и время покупки, s — итоговая сумма в рублях, fn/i/fp — номера фискального документа (по ним чек уникален),
   n — вид операции: 1 — покупка, 2 — возврат покупки. Всё считывается на устройстве, никуда не отправляется. */

const pad = (n) => String(n).padStart(2, "0");

function parseStamp(t) {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})T(\d{2}):?(\d{2})(?::?(\d{2}))?$/.exec(String(t || "").trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || h > 23 || mi > 59) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${pad(h)}:${pad(mi)}` };
}

/* Возвращает { ok: true, amount, date, time, kind, key } или { ok: false, error }. */
export function parseReceiptQr(raw) {
  let text = String(raw || "").trim();
  if (!text) return { ok: false, error: "QR-код пустой" };
  // Иногда реквизиты лежат в ссылке: https://…?t=…&s=…
  const q = text.indexOf("?");
  if (q >= 0 && /(^|&)t=/.test(text.slice(q + 1))) text = text.slice(q + 1);

  const params = new URLSearchParams(text);
  const stamp = parseStamp(params.get("t"));
  const amountRaw = String(params.get("s") || "").replace(",", ".").replace(/\s/g, "");
  const amount = /^\d+(\.\d{1,2})?$/.test(amountRaw) ? Math.round(parseFloat(amountRaw) * 100) / 100 : NaN;
  const fn = (params.get("fn") || "").trim();
  const i = (params.get("i") || "").trim();
  const fp = (params.get("fp") || "").trim();

  if (!stamp || !Number.isFinite(amount) || !fn || !i || !fp) {
    return { ok: false, error: "Это не QR-код кассового чека" };
  }
  if (amount <= 0 || amount > 10_000_000) return { ok: false, error: "Сумма в чеке выглядит неправдоподобно" };

  const n = Number(params.get("n") || 1);
  return {
    ok: true,
    amount,
    date: stamp.date,
    time: stamp.time,
    kind: n === 2 || n === 4 ? "refund" : "purchase",
    key: `${fn}-${i}-${fp}`, // по этому ключу узнаём чек, который уже вносили
  };
}
