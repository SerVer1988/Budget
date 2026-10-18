import React, { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { C } from "./constants.js";
import { exportCsv, exportJsonBackup } from "./backup.js";
import { PartnerSettings } from "./spaces.jsx";
import { Fold, SUPPORT_URL } from "./ProfileView.jsx";

/* Нижняя часть настроек: данные (копия, таблица, восстановление, удаление истории), совместный бюджет,
   «Поделиться приложением» и «Поддержать проект». */
export function SettingsExtras({ settings, transactions, onImport, onSaveSettings, onWipeAll }) {
  const importInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [dataOpen, setDataOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== "budget" || !Array.isArray(data.transactions) || typeof data.settings !== "object") {
        setImportMsg("Это не резервная копия приложения.");
        return;
      }
      const ok = window.confirm(
        `Заменить текущие данные (операций: ${(transactions || []).length}) данными из файла (операций: ${data.transactions.length})? Сначала сохраните копию текущих данных, если они нужны.`
      );
      if (!ok) return;
      onImport(data);
      setImportMsg(`Восстановлено: операций ${data.transactions.length}.`);
    } catch {
      setImportMsg("Не удалось прочитать файл.");
    }
  }

  async function shareApp() {
    setShareMsg("");
    const url = window.location.origin + window.location.pathname;
    const text = "Приложение для учёта бюджета по методу 50/30/20";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Бюджет 50/30/20", text, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Ссылка скопирована");
    } catch {
      setShareMsg(url);
    }
  }

  function support() {
    if (SUPPORT_URL) window.open(SUPPORT_URL, "_blank", "noopener");
  }

  return (
    <>
      <Fold title="Данные" open={dataOpen} onToggle={() => setDataOpen((v) => !v)}>
        <div className="button-row" style={{ marginBottom: 8 }}>
          <button className="btn" type="button" onClick={() => exportJsonBackup(settings, transactions || [])}>
            Резервная копия (JSON)
          </button>
          <button className="btn" type="button" onClick={() => exportCsv(settings, transactions || [])}>
            Таблица (CSV)
          </button>
        </div>
        <button className="btn" type="button" style={{ width: "100%" }} onClick={() => importInputRef.current?.click()}>
          Восстановить из копии
        </button>
        <input ref={importInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
        {importMsg && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{importMsg}</div>}
        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 10, color: C.danger }}
          onClick={() => {
            if (!window.confirm("Удалить всю историю операций?\nНастройки, категории и цели останутся. Перед этим лучше сделать резервную копию.")) return;
            const word = (window.prompt("Для подтверждения введите слово: удалить") || "").trim().toLowerCase();
            if (word !== "удалить") { window.alert("Слово не совпало — ничего не удалено."); return; }
            onWipeAll();
          }}
        >
          Удалить историю (стереть данные)
        </button>
      </Fold>

      <PartnerSettings settings={settings} onSaveSettings={onSaveSettings} />

      <div className="panel">
        <button className="btn" type="button" style={{ width: "100%" }} onClick={shareApp}>
          <Share2 size={15} style={{ verticalAlign: -2, marginRight: 8 }} />
          Поделиться приложением
        </button>
        {shareMsg && <div className="muted" style={{ fontSize: 12, marginTop: 8, wordBreak: "break-all" }}>{shareMsg}</div>}
      </div>

      <Fold title="Поддержать проект" open={supportOpen} onToggle={() => setSupportOpen((v) => !v)}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          Приложение делается для себя и для близких. Если оно вам полезно, можно поддержать его развитие.
        </div>
        <button className="btn primary" type="button" style={{ width: "100%" }} onClick={support} disabled={!SUPPORT_URL}>
          Поддержать
        </button>
        {!SUPPORT_URL && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Ссылка для поддержки пока не добавлена.</div>
        )}
      </Fold>
    </>
  );
}
