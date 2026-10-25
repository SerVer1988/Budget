import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { auth } from "./storage.js";
import { C } from "./constants.js";
import { PRIVACY_URL } from "./support.js";
import { vk } from "./vk.js";

/* Поле пароля с «глазиком» справа: показать / скрыть введённое. */
function PasswordField({ label = "Пароль", value, onChange, autoComplete }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 46 }}
        />
        <button
          type="button"
          aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
          onClick={() => setShown((v) => !v)}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            width: 38,
            height: 38,
            border: 0,
            background: "transparent",
            color: C.inkMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {shown ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

const linkStyle = {
  display: "block",
  margin: "14px auto 0",
  border: 0,
  background: "transparent",
  padding: 0,
  color: C.inkMuted,
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
};

/* ============================================================ Вход */
export function AuthScreen({ initialError = "" }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot | reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState("");
  const [agree, setAgree] = useState(false);

  function go(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (mode === "forgot") {
      if (!email.trim()) { setError("Введите почту"); return; }
      setBusy(true);
      try {
        await auth.requestPasswordReset(email.trim());
        setMode("reset");
        setPassword("");
        setCode("");
        setInfo("Если такая почта зарегистрирована, мы отправили письмо. Нажмите ссылку в письме или введите код из него ниже. Проверьте и «Спам».");
      } catch (err) {
        setError(err.message || "Не удалось отправить письмо");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "reset") {
      if (!email.trim()) { setError("Введите почту"); return; }
      if (code.replace(/\s/g, "").length < 6) { setError("Введите код из письма"); return; }
      if (password.length < 6) { setError("Новый пароль — минимум 6 символов"); return; }
      setBusy(true);
      try {
        await auth.resetWithCode(email.trim(), code, password);
      } catch (err) {
        setError(err.message || "Не удалось сменить пароль");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Введите имя");
      return;
    }
    if (mode === "signup" && !agree) {
      setError("Для регистрации нужно согласие на обработку данных");
      return;
    }
    if (!email.trim() || !password) {
      setError("Введите почту и пароль");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(email.trim(), password);
      } else {
        const r = await auth.signUp(email.trim(), password, name.trim());
        if (r.needsConfirm) setInfo("Мы отправили письмо для подтверждения. Подтвердите почту и войдите.");
      }
    } catch (err) {
      setError(err.message || "Не удалось выполнить вход");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Вход" : mode === "signup" ? "Регистрация" : "Восстановление пароля";
  const submitLabel =
    mode === "login" ? "Войти" : mode === "signup" ? "Создать аккаунт" : mode === "forgot" ? "Отправить письмо" : "Сменить пароль и войти";

  return (
    <form className="form-card" onSubmit={submit} style={{ marginTop: 40 }}>
      <div className="form-title-row">
        <h2>{title}</h2>
      </div>

      {mode === "signup" && (
        <div className="field">
          <label>Имя</label>
          <input
            type="text"
            autoComplete="given-name"
            maxLength={40}
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      {mode === "forgot" && (
        <div className="small-note" style={{ marginBottom: 10 }}>
          Укажите почту, с которой вы регистрировались: мы отправим на неё письмо для создания нового пароля.
        </div>
      )}

      <div className="field">
        <label>Почта</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {mode === "reset" && (
        <div className="field">
          <label>Код из письма</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Если в письме есть код"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      )}

      {mode !== "forgot" && (
        <PasswordField
          label={mode === "reset" ? "Новый пароль" : "Пароль"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={setPassword}
        />
      )}

      {mode === "signup" && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", margin: "4px 0 10px" }}>
          <input type="checkbox" style={{ width: "auto", marginTop: 3 }} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>
            Я прочитал(а){" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.sber }}>политику конфиденциальности</a>{" "}
            и согласен(на) на обработку моих данных для работы приложения.
          </span>
        </label>
      )}

      {error && <div className="small-note" style={{ color: C.danger, fontWeight: 700 }}>{error}</div>}
      {info && <div className="small-note" style={{ color: C.sber, fontWeight: 700 }}>{info}</div>}

      <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Подождите…" : submitLabel}
      </button>

      {(mode === "login" || mode === "signup") && (
        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => go(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
        </button>
      )}

      {(mode === "login" || mode === "signup") && vk.available() && (
        <div style={{ marginTop: 14 }}>
          <div style={{ textAlign: "center", fontSize: 12, color: C.inkMuted, marginBottom: 8 }}>или</div>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setError("");
              setBusy(true);
              try {
                await vk.start("login");
              } catch (e) {
                setError(e.message || "Не получилось открыть VK");
                setBusy(false);
              }
            }}
            style={{ width: "100%", height: 44, border: 0, borderRadius: 14, background: "#0077FF", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
          >
            Войти через VK
          </button>
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.inkMuted, marginTop: 6, lineHeight: 1.4 }}>
            Продолжая, вы соглашаетесь с{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.sber }}>политикой конфиденциальности</a>
          </div>
        </div>
      )}

      {mode === "login" && (
        <button type="button" style={linkStyle} onClick={() => go("forgot")}>
          Если вы забыли пароль
        </button>
      )}

      {(mode === "forgot" || mode === "reset") && (
        <>
          {mode === "reset" && (
            <button type="button" style={linkStyle} onClick={() => go("forgot")}>
              Отправить письмо ещё раз
            </button>
          )}
          <button type="button" style={linkStyle} onClick={() => go("login")}>
            Назад ко входу
          </button>
        </>
      )}
    </form>
  );
}

/* ============================================================ Новый пароль по ссылке из письма */
export function RecoveryScreen({ tokens, onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Новый пароль — минимум 6 символов"); return; }
    setBusy(true);
    try {
      await auth.setPasswordFromLink(tokens, password);
      onDone();
    } catch (err) {
      setError(err.message || "Не удалось сменить пароль");
      setBusy(false);
    }
  }

  if (tokens.error) {
    return (
      <div className="form-card" style={{ marginTop: 40 }}>
        <div className="form-title-row"><h2>Восстановление пароля</h2></div>
        <div className="small-note" style={{ color: C.danger, fontWeight: 700 }}>{tokens.error}</div>
        <button className="btn primary" type="button" style={{ width: "100%", marginTop: 12 }} onClick={onDone}>
          К входу
        </button>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={submit} style={{ marginTop: 40 }}>
      <div className="form-title-row"><h2>Новый пароль</h2></div>
      <PasswordField label="Новый пароль" autoComplete="new-password" value={password} onChange={setPassword} />
      {error && <div className="small-note" style={{ color: C.danger, fontWeight: 700 }}>{error}</div>}
      <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Подождите…" : "Сохранить и войти"}
      </button>
    </form>
  );
}

/* ============================================================ Согласие на обработку данных (для тех, кто зарегистрировался раньше) */
export function ConsentScreen({ onAccepted, onSignOut }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await auth.recordConsent();
      onAccepted();
    } catch (err) {
      setError(err.message || "Не удалось сохранить согласие");
      setBusy(false);
    }
  }

  return (
    <div className="form-card" style={{ marginTop: 40 }}>
      <div className="form-title-row"><h2>Согласие на обработку данных</h2></div>
      <div className="small-note" style={{ marginBottom: 10, lineHeight: 1.45 }}>
        Мы обновили политику конфиденциальности: в ней описано, какие данные хранит приложение, кто их видит и как их удалить.
        Чтобы продолжить, подтвердите, что вы прочитали её и согласны на обработку ваших данных для работы приложения.
      </div>
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: C.sber, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
        Читать политику конфиденциальности
      </a>
      {error && <div className="small-note" style={{ color: C.danger, fontWeight: 700 }}>{error}</div>}
      <button className="btn primary" type="button" disabled={busy} style={{ width: "100%", marginTop: 4 }} onClick={accept}>
        {busy ? "Подождите…" : "Принимаю и продолжаю"}
      </button>
      <button type="button" style={linkStyle} onClick={onSignOut}>Выйти из аккаунта</button>
    </div>
  );
}
