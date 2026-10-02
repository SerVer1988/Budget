import React, { useEffect, useState } from "react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { auth, household } from "./storage.js";

/* Совместный бюджет («режим двоих»): создать, войти по коду, выйти. Данные общие, правки обоих
   сливаются. После смены режима страница перезагружается, чтобы загрузить нужные данные. */
export function HouseholdSettings() {
  const [info, setInfo] = useState(undefined); // undefined — загрузка, null — не состоите
  const [unavailable, setUnavailable] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const me = auth.getUser();

  async function load() {
    try {
      setInfo(await household.info());
      setUnavailable("");
    } catch (e) {
      setInfo(null);
      setUnavailable(/supabase-household|404|Not Found/i.test(e.message) ? "Не настроено: выполните supabase-household.sql в Supabase." : "Нет связи с сервером.");
    }
  }

  useEffect(() => { load(); }, []);

  async function run(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await action();
      window.location.reload();
    } catch (e) {
      setError(e.message || "Не получилось");
      setBusy(false);
    }
  }

  const isOwner = info?.role === "owner";
  const partner = info ? info.members.find((m) => m.id !== me?.id) : null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(info.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="panel">
      <SectionTitle>Совместный бюджет</SectionTitle>

      {info === undefined && <div className="muted" style={{ fontSize: 12 }}>Загрузка…</div>}

      {info === null && unavailable && <div className="muted" style={{ fontSize: 12 }}>{unavailable}</div>}

      {info === null && !unavailable && (
        <div>
          <div className="field">
            <label>Создать общий бюджет</label>
            <input type="text" value={name} placeholder="Название (необязательно)" onChange={(e) => setName(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn primary"
            style={{ width: "100%", marginBottom: 14 }}
            disabled={busy}
            onClick={() => run(() => household.create(name), "Создать общий бюджет? Ваши нынешние данные скопируются в него, и партнёр, который вступит по коду, будет их видеть.")}
          >
            Создать и получить код
          </button>

          <div className="field">
            <label>Или войти по коду партнёра</label>
            <input type="text" value={code} placeholder="Код приглашения" autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>
          <button
            type="button"
            className="btn"
            style={{ width: "100%" }}
            disabled={busy || code.trim().length < 4}
            onClick={() => run(() => household.join(code.trim()), "Вступить в общий бюджет? Вы начнёте работать с общими данными. Ваши личные данные останутся нетронутыми и вернутся, если вы выйдете.")}
          >
            Присоединиться
          </button>
        </div>
      )}

      {info && (
        <div>
          <div className="fc-row" style={{ padding: "2px 0 8px" }}>
            <div className="fc-name">{info.name}</div>
            <div className="fc-sub">общие данные</div>
          </div>

          <div className="fc-list">
            {info.members.map((m) => (
              <div className="fc-row" key={m.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="fc-name" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                  <div className="fc-sub">{m.role === "owner" ? "владелец" : "участник"}{m.id === me?.id ? " · это вы" : ""}</div>
                </div>
                {isOwner && m.id !== me?.id && (
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 32 }}
                    disabled={busy}
                    onClick={() => run(() => household.removeMember(m.id), `Убрать ${m.email} из совместного бюджета?`)}
                  >
                    Убрать
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && !partner && info.invite_code && (
            <div style={{ marginTop: 12 }}>
              <div className="fc-sub">Код для партнёра</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, margin: "2px 0 8px" }}>{info.invite_code}</div>
              <div className="button-row" style={{ marginTop: 0 }}>
                <button type="button" className="btn" onClick={copyCode}>{copied ? "Скопировано" : "Скопировать"}</button>
                <button type="button" className="btn" disabled={busy} onClick={() => run(() => household.regenerateCode())}>Новый код</button>
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run(() => household.leave({ keepCopy: true }), "Выйти и оставить себе копию общих данных? Они заменят ваши прежние личные данные.")}
            >
              Выйти, оставить копию данных
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run(() => household.leave({ keepCopy: false }), "Выйти без копии? Вернутся ваши прежние личные данные. Если вы последний участник, общий бюджет будет удалён.")}
            >
              Выйти без копии
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
