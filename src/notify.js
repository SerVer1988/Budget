import { computeRecurring } from "./recurring.js";
import { dayOfMonth, formatMoney, ruPlural } from "./format.js";

/* Уведомления на устройстве. Они показываются, когда приложение открыто или свёрнуто в фоне:
   при запуске и при возвращении в приложение. Один и тот же сигнал за день приходит один раз. */
const KEY_ON = "budget.notify.on";
const KEY_SEEN = "budget.notify.seen";

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
