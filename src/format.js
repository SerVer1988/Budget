import { BADGE_IMG, BUCKET_CARD, BUCKET_LABEL, CARD_BUCKET, MONTHS_RU, MONTHS_SHORT } from "../constants.js";

/* ============================================================ helpers */
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayOfMonth(dateStr) { return parseInt(dateStr.slice(8, 10), 10); }

export function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }

export function todayMonthKey() { return todayStr().slice(0, 7); }

export function daysInMonth(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(mk, delta) {
  let [y, m] = mk.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function endOfMonthStr(mk) {
  const [y, m] = mk.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function monthLabel(mk) {
  const [y, m] = mk.split("-").map(Number);
  const name = MONTHS_RU[m - 1];
  return name.charAt(0).toUpperCase() + name.slice(1) + " " + y;
}

export function monthLabelShort(mk) {
  const [y, m] = mk.split("-").map(Number);
  return MONTHS_SHORT[m - 1] + " " + String(y).slice(2);
}

export function darkenColor(hex, amount) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function formatMoney(n) {
  const v = Math.round(n || 0);
  return v.toLocaleString("ru-RU") + " ₽";
}

/* Safe calculator: lets the amount field accept expressions like "500+230" or "1200*2-100" */
export function evalMoneyExpr(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim().replace(/,/g, ".");
  if (s === "") return NaN;
  if (!/^[0-9+\-*/().\s]+$/.test(s)) return NaN;

  let i = 0;

  function skipSpace() { while (s[i] === " ") i++; }

  function parseNumber() {
    skipSpace();
    const start = i;
    let hasDigits = false;
    while (i < s.length && /[0-9]/.test(s[i])) { i++; hasDigits = true; }
    if (s[i] === ".") {
      i++;
      while (i < s.length && /[0-9]/.test(s[i])) { i++; hasDigits = true; }
    }
    if (!hasDigits) throw new Error("bad number");
    return Number(s.slice(start, i));
  }

  function parseFactor() {
    skipSpace();
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      skipSpace();
      if (s[i] !== ")") throw new Error("expected )");
      i++;
      return v;
    }
    if (s[i] === "-") { i++; return -parseFactor(); }
    if (s[i] === "+") { i++; return parseFactor(); }
    return parseNumber();
  }

  function parseTerm() {
    let v = parseFactor();
    skipSpace();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i]; i++;
      const rhs = parseFactor();
      v = op === "*" ? v * rhs : v / rhs;
      skipSpace();
    }
    return v;
  }

  function parseExpr() {
    let v = parseTerm();
    skipSpace();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i]; i++;
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
      skipSpace();
    }
    return v;
  }

  try {
    const result = parseExpr();
    skipSpace();
    if (i !== s.length) return NaN;
    return Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

export function moneyNum(raw) {
  const v = evalMoneyExpr(raw);
  return Number.isFinite(v) ? v : 0;
}

export function clampPct(p) { return Math.max(0, Math.min(1, p || 0)); }

export function bucketName(settings, bucket) {
  return settings?.bucketNames?.[bucket] || BUCKET_LABEL[bucket] || bucket;
}

/* Родительный падеж названия бюджета («Потребности» → «Потребностей»). Известные
   названия — по таблице, остальные — по простым правилам окончаний; если правило
   не подошло, остаётся исходное слово. */
export const GENITIVE_KNOWN = {
  "потребности": "потребностей", "хотения": "хотений", "сбережения": "сбережений",
  "нужды": "нужд", "желания": "желаний", "подушка": "подушки",
};

export function genitiveWord(word) {
  const lw = word.toLowerCase();
  let g;
  if (GENITIVE_KNOWN[lw]) g = GENITIVE_KNOWN[lw];
  else if (/ости$/.test(lw)) g = lw.slice(0, -1) + "ей";
  else if (/(ия|ие)$/.test(lw)) g = lw.slice(0, -2) + "ий";
  else if (/[бвгджзклмнпрстфхцчшщ]ы$/.test(lw)) g = lw.slice(0, -1);
  else if (/[кгхжчшщ]а$/.test(lw)) g = lw.slice(0, -1) + "и";
  else if (/а$/.test(lw)) g = lw.slice(0, -1) + "ы";
  else if (/я$/.test(lw)) g = lw.slice(0, -1) + "и";
  else g = lw;
  return word[0] === word[0].toUpperCase() ? g[0].toUpperCase() + g.slice(1) : g;
}

export function bucketNameGen(settings, bucket) {
  const name = String(bucketName(settings, bucket)).trim();
  const parts = name.split(/\s+/);
  parts[parts.length - 1] = genitiveWord(parts[parts.length - 1]);
  return parts.join(" ");
}

export function cardLabel(settings, card) {
  return bucketName(settings, CARD_BUCKET[card]);
}

export function bucketIconSrc(settings, bucket) {
  const icon = settings?.bucketIcons?.[bucket];
  if (icon?.type === "custom" && icon.dataUrl) return icon.dataUrl;
  const key = icon?.key || BUCKET_CARD[bucket];
  return BADGE_IMG[key] || BADGE_IMG[BUCKET_CARD[bucket]];
}

export function formatDateRu(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export function needPctOf(settings) { return 100 - (settings.wantPct || 0) - (settings.savePct || 0); }

export function dayOfYear(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
}

export function ruPlural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function homeCardOf(bucket) { return bucket === "wants" ? "alfa" : "sber"; }

export function bucketOf(card) { return card === "alfa" ? "wants" : "needs"; }

export function catListOf(settings, bucket) { return bucket === "wants" ? settings.wantCats : settings.needCats; }
