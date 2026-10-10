import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { inbox } from "./storage.js";

function CopyLine({ label, value }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="fc-sub">{label}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <code style={{ flex: 1, minWidth: 0, fontSize: 11.5, wordBreak: "break-all", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px" }}>
          {value}
        </code>
        <button
          type="button"
          className="btn"
          style={{ height: 30, padding: "0 10px", fontSize: 12 }}
          onClick={async () => {
            try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
          }}
        >
          {done ? "Готово" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

/* Настройка приёма банковских уведомлений: ключ + инструкция для приложения-автоматизации на телефоне. */
export function InboxSettings() {
  const [open, setOpen] = useState(false); // по умолчанию свёрнуто
  const [info, setInfo] = useState(undefined); // undefined — загрузка
  const [token, setToken] = useState(null);    // показывается только сразу после создания
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const ep = inbox.endpoint();

  async function load() {
    try { setInfo(await inbox.tokenInfo()); setError(""); }
    catch (e) { setInfo({ has: false, unavailable: true }); setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (info?.has && !window.confirm("Выпустить новый ключ? Старый перестанет работать, и макрос на телефоне придётся обновить.")) return;
    setBusy(true); setError(""); setTestMsg("");
    try { setToken(await inbox.createToken()); await load(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function revoke() {
    if (!window.confirm("Отключить приём уведомлений? Ключ перестанет работать.")) return;
    setBusy(true); setError("");
    try { await inbox.revokeToken(); setToken(null); await load(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function test() {
    setTestMsg("");
    try { await inbox.sendTest(token); setTestMsg("Отправлено: запись появится в «Листе ожидания» на экране «Анализ»."); }
    catch (e) { setTestMsg(e.message); }
  }

  return (
    <div className="panel panel-compact">
      <button type="button" className="section-title-toggle" onClick={() => setOpen((v) => !v)}>
        <SectionTitle>Банковские уведомления</SectionTitle>
        <ChevronDown size={16} className={`section-chevron${open ? " open" : ""}`} />
      </button>

      {open && (
      <>

      {info === undefined && <div className="muted" style={{ fontSize: 12 }}>Загрузка…</div>}

      {info && !info.unavailable && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          {info.has ? "Ключ приёма создан." : "Ключа ещё нет."} Уведомления банков попадают в «Лист ожидания», где вы подтверждаете расход.
        </div>
      )}

      {info && !info.unavailable && (
        <div className="button-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn primary" disabled={busy} onClick={create}>
            {info.has ? "Выпустить новый ключ" : "Создать ключ"}
          </button>
          {info.has && <button type="button" className="btn" disabled={busy} onClick={revoke}>Отключить</button>}
        </div>
      )}

      {token && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>
            Ключ показан один раз: скопируйте его сейчас. Он умеет только добавлять записи в ваш лист ожидания.
          </div>
          <CopyLine label="Адрес (URL), метод POST" value={ep.rawUrl} />
          <CopyLine label="Заголовок 1: apikey" value={ep.apikey} />
          <CopyLine label="Заголовок 2: x-ingest-token" value={token} />
          <CopyLine label="Заголовок 3: x-ingest-source (sber, alfa или ozon, латиницей)" value="sber" />
          <CopyLine label="Заголовок 4: Content-Type" value="text/plain; charset=utf-8" />
          <div className="fc-sub" style={{ marginBottom: 8 }}>
            Тело запроса: только текст SMS от банка (в MacroDroid это «Текст SMS» / SMS message).
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, margin: "10px 0 4px" }}>SMS и push можно подключить вместе</div>
          <ol style={{ fontSize: 12, lineHeight: 1.5, paddingLeft: 18, margin: "0 0 10px" }}>
            <li>MacroDroid → Макросы → «+» → «Добавить триггер» → «Связь» → «SMS получено». Разрешите приложению доступ к SMS.</li>
            <li>Отправитель: «Определённый номер или контакт». Сбер — 900, Альфа — 25322265 (в Сообщениях подписан Alfa-Bank), Озон — OzonFinance. Если макрос не срабатывает, откройте SMS от банка и проверьте, как подписан отправитель.</li>
            <li>«Добавить действие» → «HTTP» → «HTTP-запрос»: метод POST, адрес, тип содержимого text/plain, четыре заголовка из полей выше.</li>
            <li>Тело: через кнопку «{`{…}`}» вставьте «Текст SMS» (больше ничего не добавляйте).</li>
            <li>Для каждого банка нужен свой макрос: меняются отправитель и заголовок x-ingest-source (sber, alfa, ozon).</li>
            <li>Отключите для MacroDroid экономию батареи, иначе телефон будет «усыплять» макрос.</li>
            <li>Макрос на push-уведомления этого банка можно оставить: тело там как раньше (заголовок и текст уведомления), заголовок x-ingest-source тот же. Одну и ту же операцию из SMS и из push приложение распознаёт и оставляет одну запись (самую подробную).</li>
          </ol>
          <div className="fc-sub" style={{ marginBottom: 10 }}>
            SMS-оповещения в банке нужно включить отдельно: если установлено приложение, банк по умолчанию шлёт push вместо SMS, а у некоторых это платная услуга. Коды подтверждения и входа приложение отбрасывает само.
          </div>

          <button type="button" className="btn" onClick={test}>Отправить тестовое уведомление</button>
          {testMsg && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{testMsg}</div>}
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{error}</div>}
      </>
      )}
    </div>
  );
}
