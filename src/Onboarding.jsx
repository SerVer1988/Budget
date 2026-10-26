import React, { useState } from "react";
import { BellRing, Calculator, PlusCircle, Sparkles, Users } from "lucide-react";
import { C } from "./constants.js";
import { bucketIconSrc, bucketName } from "./format.js";
import { RoundIcon } from "./OpUi.jsx";

/* Приветствие при первом входе: что такое три бюджета, как вносить операции, что ещё есть, и выбор «пример или чистый лист».
   Можно пропустить в любой момент; позже его можно открыть снова в Настройки → Помощь и поддержка. */
export function WelcomeSheet({ settings, allowSample = true, onFinish }) {
  const [step, setStep] = useState(0);
  const names = { needs: bucketName(settings, "needs"), wants: bucketName(settings, "wants"), savings: bucketName(settings, "savings") };

  const steps = [
    {
      title: "Три бюджета для ваших денег",
      body: (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "6px 0 14px" }}>
            {["needs", "wants", "savings"].map((b) => (
              <div key={b} style={{ textAlign: "center", minWidth: 0 }}>
                {/* display:block и margin:auto: общий стиль сайта делает картинки блочными, и без этого значок прижимался к левому краю */}
                <img src={bucketIconSrc(settings, b)} alt="" style={{ display: "block", margin: "0 auto", width: 56, height: 56, borderRadius: "50%" }} />
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, overflowWrap: "anywhere" }}>{names[b]}</div>
              </div>
            ))}
          </div>
          <p>Деньги делятся на три части: «{names.needs}» (обязательное), «{names.wants}» (приятное) и «{names.savings}» (накопления).</p>
          <p>По умолчанию это 50 / 30 / 20 процентов от дохода. Проценты и названия можно поменять в настройках.</p>
        </>
      ),
    },
    {
      title: "Вносите операции за пару секунд",
      body: (
        <>
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 14px" }}>
            <RoundIcon icon={PlusCircle} color={C.sber} size={64} />
          </div>
          <p>Нажмите «+» внизу: сумма, категория и карта, остальное можно пропустить.</p>
          <p style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Calculator size={18} style={{ flex: "0 0 auto", marginTop: 2 }} />
            <span>В поле суммы можно считать: «1200+350» превратится в 1 550.</span>
          </p>
        </>
      ),
    },
    {
      title: "Что ещё умеет приложение",
      body: (
        <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
          {[
            [BellRing, "#2F6FD0", "Банковские уведомления", "На Android операции из банковских уведомлений сами попадают в «Лист ожидания»."],
            [Users, "#7B5CC9", "Совместный бюджет", "Привяжите партнёра: общие траты, расчёты «кто кому должен», уведомления."],
            [Sparkles, C.amber, "Цели, платежи, долги", "Регулярные платежи одной кнопкой, цели накоплений, учёт долгов, анализ и прогноз."],
          ].map(([Icon, color, title, text]) => (
            <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <RoundIcon icon={Icon} color={color} size={38} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.4 }}>{text}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: allowSample ? "С чего начнём?" : "Готово",
      body: allowSample ? (
        <>
          <p style={{ marginBottom: 14 }}>Можно сначала посмотреть, как всё выглядит, на примере. Пробные операции помечены, и их удаляют одним нажатием, ваши данные они не затронут.</p>
          <button type="button" className="btn primary" style={{ width: "100%", marginBottom: 8 }} onClick={() => onFinish(true)}>
            Посмотреть на примере
          </button>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => onFinish(false)}>
            Начать с чистого листа
          </button>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 14 }}>Это всё, что нужно знать для начала. Подсказки и ответы на вопросы всегда есть в Настройки → «Помощь и поддержка».</p>
          <button type="button" className="btn primary" style={{ width: "100%" }} onClick={() => onFinish(false)}>
            Понятно
          </button>
        </>
      ),
    },
  ];

  const last = step === steps.length - 1;
  const cur = steps[step];

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(22,32,27,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, maxHeight: "92vh", overflowY: "auto", background: C.surface, borderRadius: 22, padding: "18px 18px 16px", boxShadow: "0 16px 48px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {steps.map((_, i) => (
              <span key={i} style={{ width: i === step ? 18 : 7, height: 7, borderRadius: 999, background: i === step ? C.sber : C.border, transition: "width .2s" }} />
            ))}
          </div>
          <button type="button" onClick={() => onFinish(false)} style={{ border: 0, background: "transparent", color: C.inkMuted, fontSize: 13, cursor: "pointer", padding: 4 }}>
            Пропустить
          </button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 8px", lineHeight: 1.2 }}>{cur.title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5 }} className="welcome-body">{cur.body}</div>

        {!last && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {step > 0 && <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Назад</button>}
            <button type="button" className="btn primary" style={{ flex: 2 }} onClick={() => setStep(step + 1)}>Далее</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Пустой экран «Анализа»: понятное объяснение и два действия. */
export function EmptyAnalysis({ onAdd, onSample }) {
  return (
    <div className="panel" style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <RoundIcon icon={PlusCircle} color={C.sber} size={56} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Пока нет операций</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
        Добавьте первую операцию, и здесь появятся баланс, траты по категориям и прогноз. Можно сначала посмотреть, как это выглядит на примере.
      </div>
      <button type="button" className="btn primary" style={{ width: "100%", marginBottom: 8 }} onClick={onAdd}>Добавить операцию</button>
      <button type="button" className="btn" style={{ width: "100%" }} onClick={onSample}>Показать на примере</button>
    </div>
  );
}
