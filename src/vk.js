/* Вход через VK ID (OAuth 2.1 + PKCE). Идея: сайт отправляет человека на страницу VK, VK возвращает его на ser-ver88.ru
   с одноразовым кодом, а обмен кода на данные профиля делает наша серверная функция vk-login (supabase/functions/vk-login):
   ключей VK в браузере нет, а вход в аккаунт «Бюджета» выдаёт сервер. Подробности и настройка: см. supabase-vk.sql. */
import { auth, vkApi } from "./storage.js";

export const VK_CLIENT_ID = "54852043";                  // ID приложения VK ID (не секрет)
export const VK_REDIRECT_URL = "https://ser-ver88.ru/";  // должен совпадать с «Доверенным Redirect URL» в кабинете VK ID
export const VK_AUTH_URL = "https://id.vk.ru/authorize";
export const VK_SCOPE = "";                              // базовый профиль; адрес почты можно добавить: "email"

const PENDING_KEY = "budget-app:vk-pending";
const PENDING_TTL_MS = 15 * 60 * 1000;

const b64url = (bytes) => {
  let s = "";
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/* Случайная строка для code_verifier и state. */
export function randomString(bytes = 48) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

/* PKCE: code_challenge = base64url(SHA-256(code_verifier)). */
export async function challengeOf(verifier) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(hash));
}

export function buildAuthUrl({ clientId = VK_CLIENT_ID, redirectUrl = VK_REDIRECT_URL, state, challenge, scope = VK_SCOPE }) {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUrl,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  if (scope) p.set("scope", scope);
  return `${VK_AUTH_URL}?${p.toString()}`;
}

/* Разбор адреса возврата: VK отдаёт код либо обычными параметрами, либо одним JSON в параметре payload. */
export function parseCallback(search) {
  const p = new URLSearchParams(search || "");
  let code = p.get("code");
  let state = p.get("state");
  let deviceId = p.get("device_id");
  const payload = p.get("payload");
  if (payload) {
    try {
      const j = JSON.parse(payload);
      code = code || j.code;
      state = state || j.state;
      deviceId = deviceId || j.device_id;
    } catch { /* повреждённый payload игнорируем */ }
  }
  const error = p.get("error");
  if (!code && !error) return null;
  return { code, state, deviceId, error, errorDescription: p.get("error_description") || p.get("error_reason") || "" };
}

const readPending = () => {
  try {
    const v = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    return v && Date.now() - v.at < PENDING_TTL_MS ? v : null;
  } catch {
    return null;
  }
};
const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } };

let callbackSeen; // разобранный адрес возврата (запоминаем: адрес очищается один раз)
let callbackConsumed = false;

export const vk = {
  /* Кнопка нужна только на настоящем адресе сайта: VK принимает возврат лишь на зарегистрированный адрес. */
  available() {
    try { return typeof window !== "undefined" && window.location.origin === new URL(VK_REDIRECT_URL).origin; } catch { return false; }
  },

  /* mode: "login" (войти или создать аккаунт) | "link" (привязать VK к уже открытому аккаунту). Уводит на страницу VK. */
  async start(mode = "login") {
    const verifier = randomString(48);
    const state = randomString(16);
    const challenge = await challengeOf(verifier);
    localStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, mode, at: Date.now() }));
    window.location.assign(buildAuthUrl({ state, challenge }));
  },

  /* Есть ли в адресе возврат от VK (без очистки адреса). */
  peekCallback() {
    if (callbackSeen === undefined) callbackSeen = typeof window === "undefined" ? null : parseCallback(window.location.search);
    return callbackConsumed ? null : callbackSeen;
  },

  /* Забирает возврат один раз и очищает адрес от кода. */
  takeCallback() {
    const cb = this.peekCallback();
    if (!cb) return null;
    callbackConsumed = true;
    try { window.history.replaceState(null, "", window.location.pathname + window.location.hash); } catch { /* ignore */ }
    return cb;
  },

  /* Завершает вход или привязку. Бросает понятную ошибку, если что-то не так. */
  async complete(cb) {
    const pending = readPending();
    clearPending();
    if (cb.error) throw new Error(cb.errorDescription ? `VK: ${cb.errorDescription}` : "VK не подтвердил вход");
    if (!pending || !cb.state || cb.state !== pending.state) throw new Error("Сессия входа устарела. Нажмите кнопку VK ещё раз");
    if (!cb.code || !cb.deviceId) throw new Error("VK не передал данные для входа");
    const res = await vkApi.exchange(
      { code: cb.code, device_id: cb.deviceId, code_verifier: pending.verifier, redirect_uri: VK_REDIRECT_URL, state: cb.state, mode: pending.mode },
      pending.mode === "link"
    );
    if (pending.mode === "link") return { mode: "link" };
    await auth.signInWithTokenHash(res.token_hash);
    return { mode: "login", created: !!res.created };
  },
};
