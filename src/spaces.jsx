import React, { createContext, useContext, useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C, CARD_BUCKET } from "./constants.js";
import { cardLabel } from "./format.js";
import { household, partner, push } from "./storage.js";

/* «Пространства» для пары: «Я», «Партнёр» (только просмотр) и «Общая» (будет позже).
   У каждого свой аккаунт и свои данные; названия пространств каждый задаёт себе сам (settings.spaceNames). */

export const DEFAULT_SPACE_NAMES = { me: "Я", partner: "Партнёр", shared: "Общая" };
export const SPACE_COLORS = { me: C.sber, partner: C.amber, shared: C.ozon };

export function spaceNamesOf(settings) {
  const n = (settings && settings.spaceNames) || {};
  return {
    me: String(n.me || "").trim() || DEFAULT_SPACE_NAMES.me,
    partner: String(n.partner || "").trim() || DEFAULT_SPACE_NAMES.partner,
    shared: String(n.shared || "").trim() || DEFAULT_SPACE_NAMES.shared,
  };
}

/* value: { enabled, current, names, partnerShares, onSelect } или null, когда привязки нет (тогда ничего не рисуем). */
export const SpaceContext = createContext(null);

const initialOf = (name) => (String(name || "?").trim().charAt(0) || "?").toUpperCase();

/* Маленькая «стрелка» с буквой текущего пространства; по нажатию — панелька с тремя пространствами. */
export function SpaceSwitch({ variant }) {
  const ctx = useContext(SpaceContext);
  const [open, setOpen] = useState(false);
  if (!ctx || !ctx.enabled) return null;

  const { current, names, partnerShares, onSelect } = ctx;
  const color = SPACE_COLORS[current];

  const rows = [
    { id: "me", name: names.me, disabled: false, hint: "" },
    { id: "partner", name: names.partner, disabled: !partnerShares, hint: partnerShares ? "только просмотр" : "доступ не открыт" },
    { id: "shared", name: names.shared, disabled: false, hint: "общие траты" },
  ];

  const small = variant === "hero" || variant === "compact"; // одинаковый маленький размер в «Добавить» и «Анализе»
  const wrapStyle =
    variant === "hero"
      ? { position: "absolute", right: "1%", top: "2.4%", zIndex: 6, lineHeight: 1.25 }
      : variant === "compact"
      ? { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 6, lineHeight: 1.25 }
      : { position: "relative", display: "flex", justifyContent: "flex-end", margin: "0 0 6px", lineHeight: 1.25 };

  return (
    <div style={wrapStyle}>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-label={`Пространство: ${names[current]}. Сменить`}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            height: small ? 20 : 24,
            padding: "0 3px 0 2px",
            borderRadius: 999,
            border: `1.5px solid ${color}`,
            background: "rgba(255,255,255,0.92)",
            color: C.ink,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: small ? 15 : 18,
              height: small ? 15 : 18,
              borderRadius: "50%",
              background: color,
              color: "#fff",
              fontSize: small ? 10 : 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initialOf(names[current])}
          </span>
          <ChevronDown size={small ? 12 : 14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, background: "transparent", border: 0, padding: 0, zIndex: 40, cursor: "default" }}
            />
            <div
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: small ? 26 : 30,
                zIndex: 41,
                minWidth: 188,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
                padding: 6,
              }}
            >
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="menuitem"
                  disabled={r.disabled}
                  onClick={() => {
                    setOpen(false);
                    onSelect(r.id);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    border: 0,
                    borderRadius: 10,
                    background: r.id === current ? C.gardenNavActive : "transparent",
                    color: r.disabled ? C.inkMuted : C.ink,
                    opacity: r.disabled ? 0.6 : 1,
                    cursor: r.disabled ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: SPACE_COLORS[r.id], flex: "0 0 auto" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </span>
                    {r.hint && <span style={{ display: "block", fontSize: 11, color: C.inkMuted }}>{r.hint}</span>}
                  </span>
                  {r.id === current && <Check size={16} color={C.sber} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Включить push-уведомления на этом устройстве (приходят, даже когда приложение закрыто). */
function DevicePush() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    push.isSubscribed().then((v) => { if (alive) setOn(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function toggle(next) {
    setBusy(true);
    setMsg("");
    try {
      if (next) await push.enable(); else await push.disable();
      setOn(next);
    } catch (e) {
      setMsg(e.message || "Не получилось");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 6 }}>
        <input type="checkbox" style={{ width: "auto", marginTop: 2 }} checked={on} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        <span style={{ fontSize: 13 }}>Push-уведомления на этом устройстве</span>
      </label>
      <div className="muted" style={{ fontSize: 12 }}>
        Сообщение приходит, даже когда приложение закрыто. Включать нужно на каждом устройстве отдельно.
      </div>
      {msg && <div style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

/* Настройки: привязать аккаунт партнёра, разрешить ему смотреть свой бюджет, назвать пространства. */
export function PartnerSettings({ settings, onSaveSettings }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(undefined); // undefined — загрузка, null — не привязаны
  const [unavailable, setUnavailable] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(() => spaceNamesOf(settings));
  const inHousehold = household.scope() === "household";

  async function load() {
    try {
      setInfo(await partner.info());
      setUnavailable("");
    } catch (e) {
      setInfo(null);
      setUnavailable(/supabase-partner|404|Not Found/i.test(e.message) ? "Не настроено: выполните supabase-partner.sql в Supabase." : "Нет связи с сервером.");
    }
  }

  useEffect(() => { if (!inHousehold) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action, { confirmText, reload } = {}) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await action();
      if (reload) window.location.reload();
      else setBusy(false);
    } catch (e) {
      setError(e.message || "Не получилось");
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  function saveNames() {
    const cur = spaceNamesOf(settings);
    const next = { me: draft.me.trim(), partner: draft.partner.trim(), shared: draft.shared.trim() };
    if (next.me === cur.me && next.partner === cur.partner && next.shared === cur.shared) return;
    onSaveSettings({ ...settings, spaceNames: next });
  }

  const linked = !!info;

  return (
    <div className="panel">
      <button type="button" className="section-title-toggle" onClick={() => setOpen((v) => !v)}>
        <SectionTitle>Совместный бюджет</SectionTitle>
        <ChevronDown size={16} className={`section-chevron${open ? " open" : ""}`} />
      </button>

      {open && (
        <>
          {inHousehold && (
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Этот аккаунт ещё подключён к старому общему бюджету (одни данные на двоих). Чтобы привязать отдельные аккаунты, выйдите из него: ваша копия данных останется у вас.
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", color: C.danger }}
                disabled={busy}
                onClick={() => run(() => household.leave({ keepCopy: true }), { confirmText: "Выйти из старого общего бюджета? Копия данных останется в вашем аккаунте.", reload: true })}
              >
                Выйти из старого общего бюджета
              </button>
            </div>
          )}

          {!inHousehold && info === undefined && <div className="muted" style={{ fontSize: 12 }}>Загрузка…</div>}

          {!inHousehold && info === null && unavailable && <div className="muted" style={{ fontSize: 12 }}>{unavailable}</div>}

          {!inHousehold && info === null && !unavailable && (
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                У каждого остаётся свой аккаунт. Привязав партнёра, вы сможете смотреть его бюджет отдельно (только просмотр), если он разрешит.
              </div>
              {!inviteCode ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: "100%", marginBottom: 14 }}
                  disabled={busy}
                  onClick={() => run(async () => setInviteCode(await partner.createInvite()))}
                >
                  Получить код приглашения
                </button>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Отправьте этот код партнёру (действует сутки):</div>
                  <button type="button" className="btn" style={{ width: "100%", fontWeight: 800, letterSpacing: 2 }} onClick={copyCode}>
                    {inviteCode} {copied ? "· скопировано" : "· копировать"}
                  </button>
                </div>
              )}

              <div className="field">
                <label>Или введите код партнёра</label>
                <input type="text" value={code} placeholder="Код приглашения" autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: "100%" }}
                disabled={busy || code.trim().length < 4}
                onClick={() => run(() => partner.accept(code.trim()), { reload: true })}
              >
                Привязать
              </button>
            </div>
          )}

          {!inHousehold && linked && (
            <div>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                Привязан: <b>{info.partner.email}</b>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto", marginTop: 2 }}
                  checked={!!info.i_share}
                  disabled={busy}
                  onChange={(e) => run(async () => { await partner.setSharing(e.target.checked); await load(); })}
                />
                <span style={{ fontSize: 13 }}>Показывать мой бюджет партнёру (только просмотр)</span>
              </label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                {info.partner_shares ? "Партнёр открыл вам свой бюджет." : "Партнёр пока не открыл вам свой бюджет."}
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto", marginTop: 2 }}
                  checked={settings.partnerNotify !== false}
                  onChange={(e) => onSaveSettings({ ...settings, partnerNotify: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>Уведомлять о тратах партнёра</span>
              </label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                Когда партнёр вносит расход (свой, если он открыл бюджет, или общую трату), вы увидите сообщение в приложении, а при включённых уведомлениях устройства ещё и системное. Оно приходит, пока приложение открыто или когда вы в него возвращаетесь.
              </div>

              {push.configured() && push.supported() && <DevicePush />}

              <div className="field">
                <label>Общие карты</label>
                {Object.keys(CARD_BUCKET).map((card) => {
                  const on = (settings.sharedCards || []).includes(card);
                  return (
                    <label key={card} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 6 }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={on}
                        onChange={(e) => {
                          const cur = settings.sharedCards || [];
                          const next = e.target.checked ? [...cur.filter((c) => c !== card), card] : cur.filter((c) => c !== card);
                          onSaveSettings({ ...settings, sharedCards: Object.keys(CARD_BUCKET).filter((c) => next.includes(c)) });
                        }}
                      />
                      <span style={{ fontSize: 13, textTransform: "none", letterSpacing: 0 }}>{cardLabel(settings, card)}</span>
                    </label>
                  );
                })}
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Расходы с отмеченных карт сами попадают в «{draft.shared || "Общая"}» и не создают долгов между вами.
                </div>
              </div>

              <div className="field">
                <label>Названия пространств (видны только вам)</label>
                <input type="text" value={draft.me} placeholder="Ваше имя" onChange={(e) => setDraft({ ...draft, me: e.target.value })} onBlur={saveNames} />
                <input type="text" value={draft.partner} placeholder="Имя партнёра" style={{ marginTop: 6 }} onChange={(e) => setDraft({ ...draft, partner: e.target.value })} onBlur={saveNames} />
                <input type="text" value={draft.shared} placeholder="Общая" style={{ marginTop: 6 }} onChange={(e) => setDraft({ ...draft, shared: e.target.value })} onBlur={saveNames} />
              </div>

              <button
                type="button"
                className="btn"
                style={{ width: "100%", color: C.danger }}
                disabled={busy}
                onClick={() => run(() => partner.unlink(), { confirmText: "Отвязать партнёра? Вы перестанете видеть бюджеты друг друга. Сами данные не удаляются.", reload: true })}
              >
                Отвязать партнёра
              </button>
            </div>
          )}

          {error && <div style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</div>}
        </>
      )}
    </div>
  );
}
