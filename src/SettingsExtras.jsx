import React, { useRef, useState } from "react";
import { C } from "./constants.js";
import { exportCsv, exportJsonBackup } from "./backup.js";
import { PartnerSettings } from "./spaces.jsx";
import { account } from "./storage.js";
import { Fold, SUPPORT_URL } from "./ProfileView.jsx";
import supportIcon from "./assets/icon-support.png";
import shareIcon from "./assets/icon-share.png";

/* Чёрная картинка-маска, окрашенная цветом текста кнопки. */
function MaskIcon({ src, size = 20 }) {
  const url = `url(${src})`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flex: "0 0 auto",
        width: size,
        height: size,
        background: "currentColor",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/* Нижняя часть настроек: данные (копия, таблица, восстановление, удаление истории), совместный бюджет,
   кнопки «Поддержать» и «Поделиться». */
export function SettingsExtras({ settings, transactions, onImport, onSaveSettings, onWipeAll }) {
  const importInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");
  const [flash, setFlash] = useState(""); // короткая подпись на кнопке после нажатия
  const [dataOpen, setDataOpen] = useState(false);

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

  async function deleteAccount() {
    if (!window.confirm("Удалить аккаунт навсегда?\n\nБудут удалены все ваши операции, настройки, фото, привязка к партнёру и общая книга пары (она пропадёт и у партнёра). Отменить это нельзя. Перед удалением лучше сделать резервную копию.")) return;
    const word = (window.prompt("Для подтверждения введите: удалить аккаунт") || "").trim().toLowerCase();
    if (word !== "удалить аккаунт") { window.alert("Фраза не совпала — ничего не удалено."); return; }
    try {
      await account.deleteMe();
      window.alert("Аккаунт удалён.");
      window.location.reload();
    } catch (e) {
      window.alert(e.message || "Не получилось удалить аккаунт. Попробуйте ещё раз.");
    }
  }

  function showFlash(text) {
    setFlash(text);
    setTimeout(() => setFlash(""), 1600);
  }

  async function shareApp() {
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
      showFlash("share:Скопировано");
    } catch {
      window.prompt("Скопируйте ссылку", url);
    }
  }

  function support() {
    if (SUPPORT_URL) window.open(SUPPORT_URL, "_blank", "noopener");
    else showFlash("support:Скоро");
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
        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 10, color: C.danger }}
          onClick={deleteAccount}
        >
          Удалить аккаунт
        </button>
      </Fold>

      <PartnerSettings settings={settings} onSaveSettings={onSaveSettings} />

      <div className="button-row" style={{ marginTop: 0 }}>
        <button className="btn" type="button" onClick={support} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <MaskIcon src={supportIcon} />
          {flash.startsWith("support:") ? flash.slice(8) : "Поддержать"}
        </button>
        <button className="btn" type="button" onClick={shareApp} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <MaskIcon src={shareIcon} />
          {flash.startsWith("share:") ? flash.slice(6) : "Поделиться"}
        </button>
      </div>
    </>
  );
}
