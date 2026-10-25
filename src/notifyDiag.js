import { WEB_BUILD } from "./support.js";
import { requestPermissionSafe } from "./permission.js";

const PERM_RU = { granted: "разрешено", denied: "запрещено в настройках", default: "ещё не выбрано", unsupported: "не поддерживается" };

/* Проверка уведомлений на этом устройстве. Возвращает строки [название, значение, всё ли хорошо].
   Если разрешение есть, показывает настоящее тестовое уведомление: так видно, умеет ли устройство показывать их приложению. */
export async function runNotifyDiagnostics({ show = true } = {}) {
  const rows = [];
  const add = (label, value, ok = true) => rows.push([label, value, ok]);

  add("Версия сайта", WEB_BUILD);
  const standalone = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  add("Режим", standalone ? "установленное приложение" : "браузер");

  const supported = typeof Notification !== "undefined";
  add("Уведомления поддерживаются", supported ? "да" : "нет", supported);
  if (!supported) return rows;

  let perm = Notification.permission;
  add("Разрешение", PERM_RU[perm] || perm, perm !== "denied");

  const hasSw = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  let reg = null;
  if (hasSw) {
    try { reg = await Promise.race([navigator.serviceWorker.getRegistration(), new Promise((r) => setTimeout(() => r(null), 4000))]); } catch { reg = null; }
  }
  add("Служба приложения", reg && reg.active ? "работает" : "не запущена", !!(reg && reg.active));
  add("Push поддерживается", typeof window !== "undefined" && "PushManager" in window ? "да" : "нет", typeof window !== "undefined" && "PushManager" in window);
  try {
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    add("Push-подписка на этом устройстве", sub ? "есть" : "нет", true);
  } catch (e) {
    add("Push-подписка на этом устройстве", `ошибка: ${e?.name || e}`, false);
  }

  if (!show) return rows;
  if (perm === "default") {
    perm = await requestPermissionSafe(15000);
    add("Запрос разрешения", perm === "timeout" ? "окно не появилось за 15 секунд" : PERM_RU[perm] || perm, perm === "granted");
  }
  if (perm === "granted") {
    try {
      if (reg && reg.showNotification) await reg.showNotification("Бюджет", { body: "Проверка: если вы видите это уведомление, телефон их показывает.", tag: "diag" });
      else new Notification("Бюджет", { body: "Проверка: если вы видите это уведомление, телефон их показывает." });
      add("Тестовое уведомление", "отправлено: посмотрите в шторке или на экране", true);
    } catch (e) {
      add("Тестовое уведомление", `не показалось: ${e?.name || ""} ${e?.message || ""}`.trim(), false);
    }
  }
  return rows;
}
