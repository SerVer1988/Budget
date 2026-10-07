import React, { useRef, useState } from "react";
import { Camera, ChevronDown, ChevronLeft, Share2, Trash2, User } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { HouseholdSettings } from "./HouseholdSettings.jsx";
import { C } from "./constants.js";
import { auth, profile } from "./storage.js";
import { exportCsv, exportJsonBackup } from "./backup.js";

// Ссылка, куда ведёт кнопка «Поддержать проект» (страница доната, СБП-ссылка, Boosty и т. п.).
// Пока пусто — кнопка покажет подсказку. Вставьте свою ссылку между кавычками.
const SUPPORT_URL = "";

/* Квадратное фото 192×192 из выбранной картинки (обрезка по центру), JPEG — это ~10 КБ. */
function resizeToAvatar(file, size = 192) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

export function Avatar({ src, size = 44 }) {
  return (
    <span className="profile-avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : <User size={Math.round(size * 0.5)} />}
    </span>
  );
}

function Fold({ title, open, onToggle, children }) {
  return (
    <div className="panel">
      <button type="button" className="section-title-toggle" onClick={onToggle}>
        <SectionTitle>{title}</SectionTitle>
        <ChevronDown size={16} className={`section-chevron${open ? " open" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

export function ProfileView({ user, avatar, onAvatarChange, settings, transactions, onImport, userEmail, onSignOut, onBack }) {
  const fileRef = useRef(null);
  const importInputRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [nameMsg, setNameMsg] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [dataOpen, setDataOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const nameChanged = name.trim() !== (user?.name || "");

  async function saveName() {
    setNameMsg("");
    if (!name.trim()) {
      setNameMsg("Имя не может быть пустым");
      return;
    }
    setNameBusy(true);
    try {
      const clean = await auth.updateName(name);
      setName(clean);
      setNameMsg("Имя сохранено");
    } catch (e) {
      setNameMsg(e.message || "Не удалось сохранить имя");
    } finally {
      setNameBusy(false);
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoMsg("Выберите картинку");
      return;
    }
    setPhotoBusy(true);
    setPhotoMsg("");
    try {
      const dataUrl = await resizeToAvatar(file);
      await profile.saveAvatar(dataUrl);
      onAvatarChange(dataUrl);
    } catch (err) {
      setPhotoMsg(err?.message === "bad image" ? "Не удалось открыть картинку" : err?.message || "Не удалось загрузить фото");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoMsg("");
    try {
      await profile.removeAvatar();
      onAvatarChange("");
    } catch (err) {
      setPhotoMsg(err?.message || "Не удалось удалить фото");
    } finally {
      setPhotoBusy(false);
    }
  }

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
    <div className="screen-stack">
      <div className="profile-head">
        <button type="button" className="profile-back" onClick={onBack} aria-label="Назад к настройкам">
          <ChevronLeft size={20} />
        </button>
        <div className="profile-head-title">Профиль</div>
      </div>

      <div className="panel" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <Avatar src={avatar} size={92} />
        </div>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button className="btn" type="button" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            <Camera size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            {photoBusy ? "Подождите…" : avatar ? "Заменить фото" : "Загрузить фото"}
          </button>
          {avatar && (
            <button className="btn" type="button" disabled={photoBusy} onClick={removePhoto} aria-label="Удалить фото" style={{ maxWidth: 52 }}>
              <Trash2 size={15} style={{ verticalAlign: -2 }} />
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
        {photoMsg && <div className="small-note" style={{ marginTop: 8, color: C.danger, fontWeight: 700 }}>{photoMsg}</div>}
      </div>

      <div className="panel">
        <SectionTitle>Имя</SectionTitle>
        <div className="field" style={{ textAlign: "left" }}>
          <input
            type="text"
            maxLength={40}
            autoComplete="given-name"
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameMsg(""); }}
          />
        </div>
        <button className="btn primary" type="button" style={{ width: "100%", marginTop: 8 }} disabled={nameBusy || !nameChanged} onClick={saveName}>
          {nameBusy ? "Подождите…" : "Сохранить имя"}
        </button>
        {nameMsg && (
          <div className="small-note" style={{ marginTop: 8, fontWeight: 700, color: nameMsg === "Имя сохранено" ? C.sber : C.danger }}>
            {nameMsg}
          </div>
        )}
      </div>

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
      </Fold>

      <HouseholdSettings />

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

      <div className="panel">
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10, wordBreak: "break-all" }}>
          {userEmail ? `Вы вошли как ${userEmail}.` : "Вы вошли."}
        </div>
        <button className="btn" type="button" style={{ width: "100%" }} onClick={onSignOut}>
          Выйти
        </button>
      </div>
    </div>
  );
}
