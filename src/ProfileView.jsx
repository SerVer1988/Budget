import React, { useRef, useState } from "react";
import { Camera, ChevronDown, ChevronLeft, User } from "lucide-react";
import { SectionTitle } from "./ui.jsx";
import { C } from "./constants.js";
import { auth, profile } from "./storage.js";

// Ссылка, куда ведёт кнопка «Поддержать проект» (страница доната, СБП-ссылка, Boosty и т. п.).
// Пока пусто — кнопка покажет подсказку. Вставьте свою ссылку между кавычками.
export const SUPPORT_URL = "https://messenger.sbrf.ru/sl/Y2DHDydkmrmCeCG3d";

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

export function Fold({ title, open, onToggle, children }) {
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

export function ProfileView({ user, avatar, onAvatarChange, userEmail, onSignOut, onBack }) {
  const fileRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [nameMsg, setNameMsg] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

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
      try {
        await profile.saveAvatar(dataUrl);
        onAvatarChange(dataUrl);
      } catch (err) {
        if (err && err.local) {
          onAvatarChange(dataUrl); // на этом устройстве фото сохранено, сервер его не принял
          setPhotoMsg(err.message);
        } else {
          throw err;
        }
      }
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

  return (
    <div className="screen-stack">
      <div className="profile-head">
        <button type="button" className="profile-back" onClick={onBack} aria-label="Назад к настройкам">
          <ChevronLeft size={20} />
        </button>
        <div className="profile-head-title">Профиль</div>
      </div>

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => fileRef.current?.click()}
            aria-label={avatar ? "Заменить фото" : "Загрузить фото"}
            style={{ position: "relative", flex: "0 0 auto", border: 0, background: "transparent", padding: 0, cursor: "pointer", opacity: photoBusy ? 0.6 : 1 }}
          >
            <Avatar src={avatar} size={104} />
            <span
              style={{
                position: "absolute",
                right: 2,
                bottom: 2,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: C.surface,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.ink,
              }}
            >
              <Camera size={15} />
            </span>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle>Имя</SectionTitle>
            <div className="field" style={{ marginBottom: 8 }}>
              <input
                type="text"
                maxLength={40}
                autoComplete="given-name"
                placeholder="Как к вам обращаться"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameMsg(""); }}
              />
            </div>
            <button className="btn primary" type="button" style={{ width: "100%" }} disabled={nameBusy} onClick={saveName}>
              {nameBusy ? "Подождите…" : "Сохранить"}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />

        {avatar && (
          <button
            type="button"
            disabled={photoBusy}
            onClick={removePhoto}
            style={{ marginTop: 10, border: 0, background: "transparent", padding: 0, color: C.inkMuted, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
          >
            Убрать фото
          </button>
        )}
        {photoMsg && <div className="small-note" style={{ marginTop: 8, color: C.danger, fontWeight: 700 }}>{photoMsg}</div>}
        {nameMsg && (
          <div className="small-note" style={{ marginTop: 8, fontWeight: 700, color: nameMsg === "Имя сохранено" ? C.sber : C.danger }}>
            {nameMsg}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: C.border, margin: "0 14px" }} />

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
