import React, { useState } from "react";
import { auth } from "../storage.js";
import { C } from "../constants.js";

/* ============================================================ Вход */
export function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("Введите почту и пароль");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(email.trim(), password);
      } else {
        const r = await auth.signUp(email.trim(), password);
        if (r.needsConfirm) setInfo("Мы отправили письмо для подтверждения. Подтвердите почту и войдите.");
      }
    } catch (err) {
      setError(err.message || "Не удалось выполнить вход");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} style={{ marginTop: 40 }}>
      <div className="form-title-row">
        <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>
      </div>

      <div className="field">
        <label>Почта</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Пароль</label>
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <div className="small-note" style={{ color: C.danger, fontWeight: 700 }}>{error}</div>}
      {info && <div className="small-note" style={{ color: C.sber, fontWeight: 700 }}>{info}</div>}

      <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
      </button>
      <button
        className="btn"
        type="button"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
      >
        {mode === "login" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
      </button>
    </form>
  );
}
