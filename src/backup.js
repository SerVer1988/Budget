import { loanCash } from "./loans.js";
import { BACKUP_VERSION, TX_TYPE_RU } from "./constants.js";
import { txCardsOf } from "./finance.js";
import { bucketName, cardLabel, todayStr } from "./format.js";

export function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportJsonBackup(settings, transactions) {
  const payload = {
    app: "budget",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    transactions,
  };
  downloadFile(`budget-backup-${todayStr()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function csvCell(v) {
  const str = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/* CSV для Excel: разделитель «;», кодировка UTF-8 с BOM (иначе кириллица «поедет»). */
export function exportCsv(settings, transactions) {
  const header = ["Дата", "Тип", "Сумма", "Карта", "Куда (для перевода)", "Бюджет", "Категория", "Заметка", "Остаток долга"];
  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => {
      const cards = txCardsOf(t);
      const isDebt = t.type === "debt";
      return [
        t.date,
        TX_TYPE_RU[t.type] || t.type,
        t.type === "loan" ? loanCash(t) : isDebt ? t.amount : t.type === "expense" ? -Math.abs(t.amount) : t.amount,
        t.type === "transfer" ? cardLabel(settings, t.fromCard) : cards[0] ? cardLabel(settings, cards[0]) : "",
        t.type === "transfer" ? cardLabel(settings, t.toCard) : isDebt && cards[1] ? cardLabel(settings, cards[1]) : "",
        t.bucket ? bucketName(settings, t.bucket) : "",
        t.category || "",
        t.type === "loan" ? [t.person, t.kind === "repay" ? (t.forgiven ? "простили" : "возврат") : "", t.note].filter(Boolean).join(" · ") : t.note || "",
        isDebt ? (t.repaid ? 0 : t.remainingAmount ?? "") : "",
      ];
    });
  const text = [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  downloadFile(`budget-operations-${todayStr()}.csv`, "\uFEFF" + text, "text/csv;charset=utf-8");
}
