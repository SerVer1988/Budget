import React, { useState } from "react";
import { X } from "lucide-react";
import { C } from "./constants.js";
import { enableNotifications, notificationPermission, notifyEnabled, notificationsSupported } from "./notify.js";

const KEY_HIDE = "budget.notify.nudgeHidden";

/* Заметки приходят уведомлениями. Если уведомления не включены, один раз предлагаем включить. */
export function NotifyNudge() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY_HIDE) === "1"; } catch { return false; }
  });
  const [on, setOn] = useState(() => notifyEnabled());

  if (!notificationsSupported() || on || hidden || notificationPermission() === "denied") return null;

  function hide() {
    try { localStorage.setItem(KEY_HIDE, "1"); } catch { /* ignore */ }
    setHidden(true);
  }

  return (
    <div
      className="soft-card"
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 12px", borderLeft: `3px solid ${C.amber}`, background: C.amberSoft }}
    >
      <div style={{ flex: 1, fontSize: 12, lineHeight: 1.35 }}>Заметки и напоминания приходят уведомлениями</div>
      <button
        type="button"
        className="btn primary"
        style={{ height: 30, padding: "0 12px", fontSize: 12 }}
        onClick={async () => { if ((await enableNotifications()) === "on") setOn(true); }}
      >
        Включить
      </button>
      <button type="button" aria-label="Скрыть" onClick={hide} style={{ border: 0, background: "transparent", color: C.inkMuted, padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}
