import React, { useEffect, useState } from "react";
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

  const body = token ? JSON.stringify({ p_token: token, p_source: "sber", p_text: "ТЕКСТ_УВЕДОМЛЕНИЯ" }) : "";

  return (
    <div className="panel panel-compact">
      <SectionTitle>Банковские уведомления</SectionTitle>

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
          <CopyLine label="Ключ приёма" value={token} />
          <CopyLine label="Адрес (URL)" value={ep.url} />
          <CopyLine label="Заголовок apikey" value={ep.apikey} />
          <CopyLine label="Тело запроса (для Сбера; для других банков поменяйте p_source на alfa или ozon)" value={body} />

          <ol style={{ fontSize: 12, lineHeight: 1.5, paddingLeft: 18, margin: "10px 0" }}>
            <li>На Android установите MacroDroid (или Tasker/Automate) и разрешите ему «Доступ к уведомлениям».</li>
            <li>Новый макрос → триггер «Уведомление получено» → выберите приложение банка.</li>
            <li>Действие «HTTP-запрос», метод POST, адрес и заголовки из полей выше, Content-Type: application/json.</li>
            <li>В теле замените ТЕКСТ_УВЕДОМЛЕНИЯ на текст уведомления (кнопка «+» → «Текст уведомления»).</li>
            <li>Отключите для MacroDroid экономию батареи, иначе Android будет «усыплять» макрос.</li>
          </ol>

          <button type="button" className="btn" onClick={test}>Отправить тестовое уведомление</button>
          {testMsg && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{testMsg}</div>}
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
