import React, { useState } from "react";
import { C } from "./constants.js";
import { Fold } from "./ProfileView.jsx";
import { ReportProblem } from "./ReportProblem.jsx";
import { PRIVACY_URL, SUPPORT_EMAIL, WEB_BUILD } from "./support.js";
import { runNotifyDiagnostics } from "./notifyDiag.js";

const FAQ = [
  ["Как работают три бюджета?", "Доход делится на «Нужды», «Желания» и «Подушку» (по умолчанию 50/30/20). Каждый бюджет привязан к своей карте: так сразу видно, сколько осталось на каждую часть жизни. Проценты и названия меняются в настройках."],
  ["Как внести операцию?", "Нажмите «+» внизу. Достаточно суммы, категории и карты. В поле суммы можно считать (1200+350). Долги, переводы между картами и корректировки баланса выбираются сверху на вкладках."],
  ["Как подключить банковские уведомления?", "Это работает в приложении для Android: Настройки → «Банковские уведомления» → «Настроить на этом телефоне». Уведомления выбранных банков попадут в «Лист ожидания» на экране «Анализ», где вы подтверждаете расход одним нажатием."],
  ["Как пользоваться совместным бюджетом?", "Настройки → «Совместный бюджет»: получите код приглашения и отправьте партнёру. У каждого остаётся свой аккаунт; общие траты, общие карты и расчёты «кто кому должен» ведутся в разделе «Общая»."],
  ["Где хранятся мои данные и как их удалить?", "Данные хранятся в облаке и на вашем устройстве, видите их только вы (и партнёр, если вы сами открыли доступ). Удалить историю или весь аккаунт можно в Настройки → «Данные» и в «Профиле»."],
];

/* «Помощь и поддержка»: короткие ответы, контакты, «Сообщить о проблеме», политика, повтор приветствия. */
export function SupportSection({ onShowWelcome }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [diag, setDiag] = useState(null); // null — не запускали, "run" — идёт проверка, иначе список строк
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Бюджет: вопрос")}&body=${encodeURIComponent(`\n\n—\nСборка: ${WEB_BUILD}`)}`;

  return (
    <>
      <Fold title="Помощь и поддержка" open={open} onToggle={() => setOpen((v) => !v)}>
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {FAQ.map(([q, a]) => (
            <details key={q} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 10px", background: C.surface2 }}>
              <summary style={{ fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{q}</summary>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: C.inkMuted, marginTop: 6 }}>{a}</div>
            </details>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={onShowWelcome}>Показать приветствие</button>
          <button
            type="button"
            className="btn"
            style={{ width: "100%" }}
            disabled={diag === "run"}
            onClick={async () => {
              setDiag("run");
              try { setDiag(await runNotifyDiagnostics()); } catch (e) { setDiag([["Ошибка проверки", `${e?.name || ""} ${e?.message || ""}`.trim(), false]]); }
            }}
          >
            {diag === "run" ? "Проверяем…" : "Проверить уведомления на этом устройстве"}
          </button>
          {Array.isArray(diag) && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 10px", background: C.surface2, fontSize: 12.5, lineHeight: 1.5 }}>
              {diag.map(([label, value, ok]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: C.inkMuted }}>{label}</span>
                  <b style={{ color: ok ? C.ink : C.danger, textAlign: "right" }}>{value}</b>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => setReport(true)}>Сообщить о проблеме</button>
          <a className="btn" href={mailto} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            Написать разработчику
          </a>
        </div>

        <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          Почта поддержки: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.sber }}>{SUPPORT_EMAIL}</a>
          <br />
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.sber }}>Политика конфиденциальности</a>
          <br />
          Сборка сайта: {WEB_BUILD}
        </div>
      </Fold>
      {report && <ReportProblem onClose={() => setReport(false)} />}
    </>
  );
}
