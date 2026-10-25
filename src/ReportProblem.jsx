import React, { useMemo, useState } from "react";
import { C } from "./constants.js";
import { auth, reports } from "./storage.js";
import { diag } from "./diagnostics.js";
import { PRIVACY_URL, SUPPORT_EMAIL, WEB_BUILD } from "./support.js";

/* Техническая справка об устройстве: версия сайта, режим (приложение или браузер), устройство, экран. Без личных данных. */
function techInfo() {
  const standalone = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  return [
    `Сборка сайта: ${WEB_BUILD}`,
    `Режим: ${standalone ? "установленное приложение" : "браузер"}`,
    `Устройство: ${typeof navigator !== "undefined" ? navigator.userAgent : "—"}`,
    `Экран: ${typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "—"}`,
    `Язык: ${typeof navigator !== "undefined" ? navigator.language : "—"}`,
  ].join("\n");
}

const box = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: "10px 12px",
  background: C.surface2,
  color: C.ink,
  font: "inherit",
  fontSize: 14,
};

/* Окно «Сообщить о проблеме»: текст пользователя + (по его желанию) технический журнал.
   Показываем, что именно будет отправлено; финансовые данные в журнал не попадают. */
export function ReportProblem({ onClose }) {
  const user = auth.getUser();
  const [message, setMessage] = useState("");
  const [withLog, setWithLog] = useState(true);
  const [contact, setContact] = useState(user?.email || "");
  const [state, setState] = useState("idle"); // idle | sending | sent | failed
  const [error, setError] = useState("");
  const logText = useMemo(() => `${techInfo()}\n\nПоследние ошибки:\n${diag.text()}`, []);

  const ready = message.trim().length >= 3;

  async function send() {
    if (!ready) return;
    setState("sending");
    setError("");
    try {
      await reports.submit({ message: message.trim(), log: withLog ? logText : "", contact: contact.trim(), app: `web ${WEB_BUILD}` });
      setState("sent");
    } catch (e) {
      setState("failed");
      setError(e.message || "Не получилось отправить");
    }
  }

  // Запасной путь: письмо в почтовом приложении (работает и без входа в аккаунт).
  function mailInstead() {
    const body = `${message.trim()}\n\n${withLog ? logText : ""}`.slice(0, 1800);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Бюджет: сообщение о проблеме")}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(22,32,27,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", background: C.surface, borderRadius: 20, padding: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
        {state === "sent" ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Спасибо!</div>
            <div className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Сообщение отправлено. Мы разберёмся и, если вы оставили контакт, ответим.</div>
            <button type="button" className="btn primary" style={{ width: "100%" }} onClick={onClose}>Закрыть</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Сообщить о проблеме</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Опишите, что произошло и что вы ожидали увидеть.</div>

            <textarea
              style={{ ...box, minHeight: 96, resize: "vertical" }}
              maxLength={2000}
              placeholder="Например: после нажатия «Сохранить» запись не появилась"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <label style={{ display: "block", fontSize: 12, color: C.inkMuted, margin: "12px 0 4px" }}>Как с вами связаться (необязательно)</label>
            <input style={box} type="text" value={contact} placeholder="Почта" onChange={(e) => setContact(e.target.value)} />

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" style={{ width: "auto", marginTop: 2 }} checked={withLog} onChange={(e) => setWithLog(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Приложить технический журнал (версия, устройство, последние ошибки). Ваших операций, сумм и заметок в нём нет.</span>
            </label>
            {withLog && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, color: C.inkMuted, cursor: "pointer" }}>Показать, что будет отправлено</summary>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, marginTop: 6, maxHeight: 180, overflow: "auto" }}>{logText}</pre>
              </details>
            )}

            <div className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
              Нажимая «Отправить», вы соглашаетесь передать эти сведения разработчику, чтобы исправить ошибку. Подробнее в{" "}
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.sber }}>политике конфиденциальности</a>.
            </div>

            {state === "failed" && <div style={{ color: C.danger, fontSize: 12, marginTop: 10 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>Отмена</button>
              <button type="button" className="btn primary" style={{ flex: 1 }} disabled={!ready || state === "sending"} onClick={send}>
                {state === "sending" ? "Отправка…" : "Отправить"}
              </button>
            </div>
            {state === "failed" && (
              <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} onClick={mailInstead}>
                Отправить письмом на {SUPPORT_EMAIL}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
