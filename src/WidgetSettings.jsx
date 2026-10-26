import React, { useState } from "react";
import { C } from "./constants.js";
import { bucketName } from "./format.js";
import { Fold } from "./ProfileView.jsx";
import { inbox, widgetApi } from "./storage.js";

/* «Виджет на главный экран» (Android): остатки по трём бюджетам и кнопки «Трата», «Доход», «Чек».
   Виджет получает отдельный ключ, который читает только короткую сводку; отключить его можно здесь в любой момент. */
export function WidgetSettings({ settings, onSaveSettings, userEmail }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const on = !!settings.widgetOn;

  async function connect() {
    setBusy(true);
    setMsg("");
    try {
      const token = await widgetApi.createToken();
      if (!token) throw new Error("Не удалось выпустить ключ виджета");
      onSaveSettings({ ...settings, widgetOn: true });
      const ep = inbox.endpoint();
      const names = { sber: bucketName(settings, "needs"), alfa: bucketName(settings, "wants"), ozon: bucketName(settings, "savings") };
      const q = new URLSearchParams({ u: ep.rawUrl, k: ep.apikey, t: token, e: userEmail || "", n: JSON.stringify(names) }).toString();
      setMsg("Открываю приложение… Если ничего не произошло, обновите «Бюджет» до версии 2.2.");
      window.location.href = `intent://widget?${q}#Intent;scheme=budgetnotify;package=ru.server88.budget;end`;
    } catch (e) {
      setMsg(e.message || "Не получилось подключить виджет");
    }
    setBusy(false);
  }

  async function disable() {
    if (!window.confirm("Отключить виджет? Остатки на нём перестанут обновляться, а ключ будет удалён.")) return;
    setBusy(true);
    setMsg("");
    try {
      await widgetApi.disable();
      onSaveSettings({ ...settings, widgetOn: false });
      setMsg("Виджет отключён. Сам значок можно убрать с рабочего стола.");
    } catch (e) {
      setMsg(e.message || "Не получилось отключить");
    }
    setBusy(false);
  }

  return (
    <Fold title="Виджет на главный экран" open={open} onToggle={() => setOpen((v) => !v)}>
      {!isAndroid ? (
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Виджет работает в приложении «Бюджет» для Android. Откройте эти настройки на телефоне.
        </div>
      ) : (
        <>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
            На рабочем столе: остатки «{bucketName(settings, "needs")}», «{bucketName(settings, "wants")}» и «{bucketName(settings, "savings")}», траты за сегодня
            и кнопки «Трата», «Доход», «Чек»: они открывают нужную форму одним нажатием.
          </div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Состояние: <b style={{ color: on ? C.sber : C.inkMuted }}>{on ? "подключён" : "не подключён"}</b>
          </div>
          <button type="button" className="btn primary" style={{ width: "100%" }} disabled={busy} onClick={connect}>
            {on ? "Подключить заново на этом телефоне" : "Подключить виджет"}
          </button>
          {on && (
            <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} disabled={busy} onClick={disable}>
              Отключить виджет
            </button>
          )}
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
            После подключения добавьте виджет на рабочий стол: удерживайте палец на пустом месте → «Виджеты» → «Бюджет».
            Остатки обновляются, когда вы пользуетесь приложением, и раз в полчаса.
          </div>
        </>
      )}
      {msg && <div style={{ fontSize: 12, marginTop: 8, color: C.sber, fontWeight: 700 }}>{msg}</div>}
    </Fold>
  );
}
