import { computeRecurring } from "./recurring.js";
import { dayOfMonth, formatMoney, ruPlural } from "./format.js";

/* Уведомления на устройстве. Они показываются, когда приложение открыто или свёрнуто в фоне:
   при запуске и при возвращении в приложение. Один и тот же сигнал за день приходит один раз. */
const KEY_ON = "budget.notify.on";
const KEY_SEEN = "budget.notify.seen";
const KEY_NOTES = "budget.notify.notes";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export function notifyEnabled() {
  try {
    return notificationsSupported() && Notification.permission === "granted" && localStorage.getItem(KEY_ON) === "1";
  } catch {
    return false;
  }
}

/* Возвращает "on" | "denied" | "off" | "unsupported". */
export async function enableNotifications() {
  if (!notificationsSupported()) return "unsupported";
  let p = Notification.permission;
  if (p === "default") p = await Notification.requestPermission();
  if (p === "granted") {
    try { localStorage.setItem(KEY_ON, "1"); } catch { /* ignore */ }
    return "on";
  }
  return p === "denied" ? "denied" : "off";
}

export function disableNotifications() {
  try { localStorage.removeItem(KEY_ON); } catch { /* ignore */ }
}

/* Что сегодня стоит подсветить: платежи и день выплаты. */
export function buildNotices(transactions, settings, today) {
  const notices = [];

  computeRecurring(settings, today).forEach((r) => {
    const amount = formatMoney(r.amount);
    if (r.daysUntil < 0) {
      const n = -r.daysUntil;
      notices.push({
        key: `${today}:rec:${r.id}`,
        title: "Платёж ждёт проведения",
        body: `${r.name} — ${amount}, срок был ${n} ${ruPlural(n, "день", "дня", "дней")} назад`,
      });
    } else if (r.daysUntil === 0) {
      notices.push({ key: `${today}:rec:${r.id}`, title: "Платёж сегодня", body: `${r.name} — ${amount}` });
    } else if (r.daysUntil === 1) {
      notices.push({ key: `${today}:rec:${r.id}`, title: "Платёж завтра", body: `${r.name} — ${amount}` });
    }
  });

  const days = settings.reminderDays || [];
  if (days.includes(dayOfMonth(today))) {
    const gotIncome = transactions.some((t) => t.type === "income" && t.date === today);
    if (!gotIncome) {
      notices.push({
        key: `${today}:payday`,
        title: "День выплаты",
        body: "Занесите доход на вкладке «Добавить»: приложение подскажет, сколько распределить.",
      });
    }
  }
  return notices;
}

function readSeen(today) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_SEEN) || "null");
    return v && v.date === today ? v.keys : [];
  } catch {
    return [];
  }
}

async function showOne(n) {
  const opts = { body: n.body, tag: n.key, icon: "icons/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(n.title, opts);
      return;
    }
  } catch { /* падаем на обычное уведомление */ }
  try { new Notification(n.title, opts); } catch { /* ignore */ }
}

/* Показывает ещё не показанные сегодня уведомления. Возвращает те, что показал. */
export async function showNotices(notices, today) {
  if (!notifyEnabled()) return [];
  const seen = readSeen(today);
  const fresh = notices.filter((n) => !seen.includes(n.key));
  for (const n of fresh) await showOne(n);
  if (fresh.length) {
    try { localStorage.setItem(KEY_SEEN, JSON.stringify({ date: today, keys: [...seen, ...fresh.map((n) => n.key)] })); } catch { /* ignore */ }
  }
  return fresh;
}

/* ---------- Заметки уведомлениями в течение дня ----------
   Раньше заметки висели каруселью на экране «Анализ»: теперь они приходят уведомлениями.
   Каждый день — не больше NOTES_PER_DAY штук, по одной на «слот» времени: сначала самое срочное
   (лимит до аванса, нехватка денег, перерасход), в конце дня — совет. Редкие по смыслу заметки
   (про запас сбережений и правило неприкосновенности) приходят раз в неделю. Если слот наступил,
   а приложение было закрыто, заметка придёт при следующем открытии (не больше двух за раз). */
export const NOTE_SLOTS = [9, 12, 15, 18, 20]; // часы по местному времени
export const NOTES_PER_DAY = NOTE_SLOTS.length;

/* Как часто можно повторять заметку (в днях). Предупреждения о балансе карт держатся, пока причина
   не исчезнет, поэтому напоминаем не чаще раза в 3 дня; заметки про запас сбережений — раз в неделю. */
function cadenceDays(id) {
  if (id === "runway" || id === "savings-rule") return 7;
  if (/^smart-/.test(id)) return 3;
  return 0; // 0 — один и тот же текст не чаще раза в день
}
const SKIP_IDS = /^(recurring-|payday-today)/; // эти приходят отдельными срочными уведомлениями

const NOTE_TITLES = [
  [/^payday-countdown/, "До аванса"],
  [/^payday-distribute/, "Распределение дохода"],
  [/^forecast-/, "Прогноз до аванса"],
  [/^smart-/, "Баланс карты"],
  [/^debt-/, "Долги между бюджетами"],
  [/^cmp-/, "Расходы за месяц"],
  [/^cat-/, "Траты по категориям"],
  [/^(runway|savings-rule)/, "Сбережения"],
  [/^tip/, "Совет"],
];

function notePriority(n) {
  if (/^payday-/.test(n.id)) return 0;
  if (/^forecast-/.test(n.id) || /^smart-/.test(n.id)) return 1;
  if (/^debt-/.test(n.id)) return 2;
  if (/^(cmp-|cat-)/.test(n.id)) return 3;
  if (/^(runway|savings-rule)/.test(n.id)) return 4;
  return 5; // совет — в самом конце дня
}

export function noteTitle(id) {
  const hit = NOTE_TITLES.find(([re]) => re.test(id));
  return hit ? hit[1] : "Заметка";
}

function hashText(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function daysSince(fromDate, toDate) {
  if (!fromDate) return Infinity;
  const p = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(toDate) - p(fromDate)) / 86400000);
}

/* Чистая функция: что отправить сейчас. state = { date, slotsDone, keys[], last{} }.
   Возвращает { send: [{key, title, body}], state }. */
export function planNotes(insights, state, now) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const st = state && state.date === today
    ? { ...state, keys: [...state.keys], last: { ...(state.last || {}) } }
    : { date: today, slotsDone: 0, keys: [], last: { ...(state?.last || {}) } };

  const due = NOTE_SLOTS.filter((h) => h <= now.getHours()).length;
  const toSend = Math.min(due - st.slotsDone, 2, NOTES_PER_DAY - st.keys.length);
  if (toSend <= 0) return { send: [], state: st };

  const queue = insights
    .filter((n) => !SKIP_IDS.test(n.id))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => notePriority(a.n) - notePriority(b.n) || a.i - b.i)
    .map(({ n }) => n)
    .filter((n) => {
      const cad = cadenceDays(n.id);
      if (cad > 0) return daysSince(st.last[n.id], today) >= cad;
      return !st.keys.includes(`${n.id}:${hashText(n.text)}`);
    });

  const send = [];
  for (const n of queue.slice(0, toSend)) {
    const cad = cadenceDays(n.id);
    const key = cad > 0 ? `${today}:${n.id}` : `${n.id}:${hashText(n.text)}`;
    st.keys.push(key);
    if (cad > 0) st.last[n.id] = today;
    send.push({ key, title: noteTitle(n.id), body: n.text.replace(/^Совет:\s*/, "") });
  }
  st.slotsDone = due;
  return { send, state: st };
}

/* Показывает заметки, которым пришло время. Вызывать при запуске, при возвращении в приложение
   и по таймеру, пока оно открыто. */
export async function deliverNotes(insights, now = new Date()) {
  if (!notifyEnabled()) return [];
  let state = null;
  try { state = JSON.parse(localStorage.getItem(KEY_NOTES) || "null"); } catch { /* ignore */ }
  const { send, state: next } = planNotes(insights, state, now);
  for (const n of send) await showOne({ key: `note:${n.key}`, title: n.title, body: n.body });
  try { localStorage.setItem(KEY_NOTES, JSON.stringify(next)); } catch { /* ignore */ }
  return send;
}
