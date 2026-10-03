import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { bucketName, formatMoney, moneyNum, todayStr } from "./format.js";
import { newRecurring } from "./recurring.js";
import {
  disableNotifications,
  enableNotifications,
  notificationPermission,
  notifyEnabled,
} from "./notify.js";

const EMPTY = { name: "", amount: "", day: "", bucket: "needs", category: "" };

/* Регулярные платежи и уведомления. Изменения сохраняются сразу, без кнопки «Сохранить». */
export function RecurringSettings({ settings, onSaveSettings }) {
  const list = settings.recurring || [];
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [notify, setNotify] = useState(() => notifyEnabled());
  const [notifyMsg, setNotifyMsg] = useState("");

  const cats = (form.bucket === "wants" ? settings.wantCats : settings.needCats) || [];

  function save(next) {
    onSaveSettings({ ...settings, recurring: next });
  }

  function create() {
    const amount = moneyNum(form.amount);
    const day = Math.round(Number(form.day));
    if (!form.name.trim()) return setError("Введите название");
    if (!(amount > 0)) return setError("Укажите сумму");
    if (!(day >= 1 && day <= 31)) return setError("День месяца — число от 1 до 31");
    save([...list, newRecurring({ ...form, amount, day, category: form.category || cats[0]?.name || "" }, todayStr())]);
    setForm(EMPTY);
    setAdding(false);
    setError("");
  }

  async function toggleNotify() {
    if (notify) {
      disableNotifications();
      setNotify(false);
      setNotifyMsg("");
      return;
    }
    const res = await enableNotifications();
    if (res === "on") { setNotify(true); setNotifyMsg(""); }
    else if (res === "denied") setNotifyMsg("Уведомления запрещены в настройках браузера или телефона.");
    else if (res === "unsupported") setNotifyMsg("Это устройство не поддерживает уведомления.");
    else setNotifyMsg("Разрешение не получено.");
  }

  const perm = notificationPermission();

  return (
    <div className="panel">
      <SectionTitle>Регулярные платежи</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {list.map((r) => (
          <div key={r.id} className="fc-row" style={{ padding: "4px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
              <input
                type="checkbox"
                checked={r.active}
                onChange={() => save(list.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))}
              />
              <span style={{ minWidth: 0, opacity: r.active ? 1 : 0.5 }}>
                <span className="fc-name">{r.name}</span>
                <span className="fc-sub">
                  {formatMoney(r.amount)} · {r.day}-го · {bucketName(settings, r.bucket)}
                  {r.category ? ` · ${r.category}` : ""}
                </span>
              </span>
            </label>
            <button
              type="button"
              className="btn"
              aria-label={`Удалить платёж ${r.name}`}
              style={{ flex: "0 0 36px", height: 32 }}
              onClick={() => { if (window.confirm(`Удалить платёж «${r.name}»?`)) save(list.filter((x) => x.id !== r.id)); }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div>
          <div className="field">
            <label>Название</label>
            <input type="text" value={form.name} placeholder="Аренда, интернет, подписка…" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Сумма</label>
            <input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="field">
            <label>День месяца</label>
            <input type="text" inputMode="numeric" value={form.day} placeholder="1–31" onChange={(e) => setForm({ ...form, day: e.target.value })} />
          </div>
          <div className="field">
            <label>Из какого бюджета</label>
            <select value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value, category: "" })}>
              <option value="needs">{bucketName(settings, "needs")}</option>
              <option value="wants">{bucketName(settings, "wants")}</option>
            </select>
          </div>
          <div className="field">
            <label>Категория</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="button-row" style={{ marginTop: 0 }}>
            <button type="button" className="btn primary" onClick={create}>Добавить</button>
            <button type="button" className="btn" onClick={() => { setAdding(false); setError(""); setForm(EMPTY); }}>Отмена</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn" style={{ width: "100%" }} onClick={() => { setAdding(true); setError(""); }}>
          + Новый платёж
        </button>
      )}
      {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{error}</div>}

      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12 }}>
        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          disabled={perm === "unsupported"}
          onClick={toggleNotify}
        >
          {notify ? "Отключить уведомления" : "Включить уведомления"}
        </button>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
          {notifyMsg || "В течение дня: заметки (прогноз, сравнение, советы), платежи и день выплаты. Приходят, пока приложение открыто или свёрнуто."}
        </div>
      </div>
    </div>
  );
}
