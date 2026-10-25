// Облачное хранилище на Supabase — без внешних зависимостей (только fetch).
//
// Интерфейс прежний (как у window.storage в артефактах Claude):
//   storage.get(key)  — бросает Error("not found"), если ключа ещё нет
//   storage.set(key, value)
//   storage.delete(key)
// Плюс auth (вход по почте и паролю) и storage.checkStale().
//
// Как это работает:
//  • личные данные лежат в таблице app_data (user_id, key, value, updated_at), доступ — только к своим строкам (RLS);
//  • в режиме «двоих» те же ключи лежат в household_data (household_id, key, value, updated_at),
//    доступ — только у участников совместного бюджета (supabase-household.sql);
//  • если запись одновременно изменили два устройства/два человека, правки сливаются (merge.js), а не отбрасываются;
//  • копия каждого значения кэшируется в localStorage, поэтому приложение открывается и без интернета;
//  • запись «условная»: если ту же запись успели изменить на другом устройстве, старая версия
//    её не затрёт — вместо этого приложение покажет плашку «обновить»;
//  • если интернета нет, изменения копятся локально и отправляются, когда он появится.

const SUPABASE_URL = "https://kjwxtgsiyquipqxsynqt.supabase.co";
// Публичный (publishable) ключ — его можно держать в коде, защита данных — в правилах RLS.
const SUPABASE_KEY = "sb_publishable_GkTAGx43CRVGgRZ5BkCSaA_kA87NuXk";

const PREFIX = "budget-app:";
const SESSION_KEY = PREFIX + "session";
const MIGRATED_KEY = PREFIX + "legacy-migrated";
import { VAPID_PUBLIC_KEY } from "./pushConfig.js";
import { CONSENT_VERSION } from "./support.js";
import { mergeValues } from "./merge.js";

const TABLE = "app_data";
const HH_TABLE = "household_data";

/* ---------------------------------------------------------------- localStorage */
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* переполнено/запрещено */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

/* ---------------------------------------------------------------- HTTP */
async function http(path, { method = "GET", body, token, headers } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(SUPABASE_URL + path, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- сессия */
let session = null; // { access_token, refresh_token, expires_at (мс), user: { id, email, name } }
let refreshing = null;
const listeners = new Set();

function emitAuth(user) { listeners.forEach((fn) => fn(user)); }

function loadSession() {
  const raw = lsGet(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveSession(s) {
  session = s;
  if (s) lsSet(SESSION_KEY, JSON.stringify(s));
  else lsDel(SESSION_KEY);
}

function sessionFromResponse(d) {
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
    user: { id: d.user.id, email: d.user.email, name: String(d.user.user_metadata?.name || "") },
  };
}

async function ensureToken() {
  if (!session) throw new Error("not signed in");
  if (session.expires_at - Date.now() > 60000) return session.access_token;

  if (!refreshing) {
    refreshing = (async () => {
      const r = await http("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token },
      });
      if (r.ok) { saveSession(sessionFromResponse(r.data)); return; }
      if ([400, 401, 403].includes(r.status)) {
        saveSession(null);
        emitAuth(null);
        throw new Error("session expired");
      }
      throw new Error("refresh failed");
    })().finally(() => { refreshing = null; });
  }

  try {
    await refreshing;
  } catch (e) {
    // Нет сети, но токен ещё не протух — работаем дальше.
    if (session && session.expires_at > Date.now()) return session.access_token;
    throw e;
  }
  return session.access_token;
}

function authErrorText(r) {
  const d = r.data || {};
  const raw = String(d.error_description || d.msg || d.message || d.error || "");
  const code = String(d.error_code || d.code || "");
  if (/invalid login credentials/i.test(raw)) return "Неверная почта или пароль";
  if (/already registered|user_already_exists/i.test(raw + code)) return "Пользователь с такой почтой уже зарегистрирован";
  if (/weak_password|at least \d+ char|should be at least/i.test(raw + code)) return "Пароль слишком простой — минимум 6 символов";
  if (/email not confirmed|email_not_confirmed/i.test(raw + code)) return "Почта не подтверждена. Подтвердите письмо или отключите подтверждение в Supabase";
  if (/signup_disabled|signups not allowed|signup is disabled/i.test(raw + code)) return "Регистрация отключена";
  if (/same_password|different from the old password/i.test(raw + code)) return "Новый пароль должен отличаться от старого";
  if (/otp_expired|token has expired|invalid.*token|otp.*invalid/i.test(raw + code)) return "Код неверный или устарел. Запросите новый";
  if (/rate limit|over_email_send_rate_limit|too many|only request this (?:after|once)/i.test(raw + code) || r.status === 429) return "Слишком много попыток — подождите минуту и попробуйте снова";
  if (/invalid.*email|validation_failed/i.test(raw + code)) return "Проверьте адрес почты";
  // Сервер не смог отправить письмо (например, не настроена почта в Supabase): человеку нужен понятный текст, а не английский.
  if (/error sending .*email|unexpected_failure/i.test(raw + code) || (r.status >= 500 && /email|smtp/i.test(raw))) return "Не получилось отправить письмо. Попробуйте позже или напишите в поддержку (адрес в разделе «Помощь» после входа)";
  return raw || `Ошибка входа (${r.status})`;
}

/* ---------------------------------------------------------------- кэш и очередь */
function uid() { return session?.user?.id; }

// Где сейчас лежат данные: личные (app_data) или общие (household_data).
let hh = null; // { id } — если вошли в совместный бюджет
function scopeTable() { return hh ? HH_TABLE : TABLE; }
function scopeFilter() { return hh ? `household_id=eq.${hh.id}` : `user_id=eq.${uid()}`; }
function scopeConflictCols() { return hh ? "household_id,key" : "user_id,key"; }
function scopeRow(key, value) { return hh ? { household_id: hh.id, key, value } : { user_id: uid(), key, value }; }
const HH_CACHE = (userId) => `${PREFIX}hh:${userId}`;

function cacheKey(k) { return hh ? `${PREFIX}h:${hh.id}:${k}` : `${PREFIX}u:${uid()}:${k}`; }

function cacheRead(k) {
  const raw = lsGet(cacheKey(k));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
// base — последняя версия, которую видел сервер: от неё считается слияние, если правки разошлись.
function cacheWrite(k, value, updatedAt, dirty = false) {
  const prev = dirty ? cacheRead(k) : null;
  const base = dirty ? (prev ? (prev.base ?? prev.value) : null) : value;
  lsSet(cacheKey(k), JSON.stringify({ value, updatedAt: updatedAt || null, base }));
}

function dirtyRead() {
  const raw = lsGet(cacheKey("__dirty"));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function dirtyWrite(list) { lsSet(cacheKey("__dirty"), JSON.stringify(list)); }
function addDirty(k) { const l = dirtyRead(); if (!l.includes(k)) dirtyWrite([...l, k]); }
function removeDirty(k) { const l = dirtyRead(); if (l.includes(k)) dirtyWrite(l.filter((x) => x !== k)); }
function isDirty(k) { return dirtyRead().includes(k); }

function clearUserCache(userId) {
  try {
    const prefixes = [`${PREFIX}u:${userId}:`, `${PREFIX}h:`, HH_CACHE(userId), `${PREFIX}partner:${userId}`, `${PREFIX}shared:${userId}`];
    Object.keys(localStorage).filter((k) => prefixes.some((p) => k.startsWith(p))).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

function notifyConflict() {
  try { window.dispatchEvent(new Event("budget-conflict")); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- запросы к таблице */
const enc = encodeURIComponent;

async function remoteGet(key) {
  const token = await ensureToken();
  const r = await http(`/rest/v1/${scopeTable()}?${scopeFilter()}&key=eq.${enc(key)}&select=value,updated_at`, { token });
  if (!r.ok) throw new Error(`remote get ${r.status}`);
  return Array.isArray(r.data) && r.data[0] ? r.data[0] : null;
}

// Условная запись. knownUpdatedAt — версия, которую мы видели в последний раз
// (null — «записи ещё не было»). Если на сервере версия другая — вернётся conflict.
async function remoteWrite(key, value, knownUpdatedAt) {
  const token = await ensureToken();

  if (knownUpdatedAt) {
    const r = await http(
      `/rest/v1/${scopeTable()}?${scopeFilter()}&key=eq.${enc(key)}&updated_at=eq.${enc(knownUpdatedAt)}`,
      {
        method: "PATCH",
        token,
        headers: { Prefer: "return=representation" },
        body: { value, updated_at: new Date().toISOString() },
      }
    );
    if (!r.ok) throw new Error(`remote write ${r.status}`);
    if (!Array.isArray(r.data) || r.data.length === 0) return { status: "conflict" };
    return { status: "ok", updatedAt: r.data[0].updated_at };
  }

  const r = await http(`/rest/v1/${scopeTable()}?on_conflict=${scopeConflictCols()}`, {
    method: "POST",
    token,
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: scopeRow(key, value),
  });
  if (!r.ok) throw new Error(`remote insert ${r.status}`);
  if (!Array.isArray(r.data) || r.data.length === 0) return { status: "conflict" };
  return { status: "ok", updatedAt: r.data[0].updated_at };
}

// Запись отклонена: на сервере уже более новая версия. Берём свежую, сливаем с нашей
// (от общей «базы») и пишем результат. null — слить не вышло (тогда сработает старая плашка «обновить»).
async function resolveConflict(key, localValue, base) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await remoteGet(key);
    if (!row) {
      const res = await remoteWrite(key, localValue, null);
      if (res.status === "ok") return { value: localValue, updatedAt: res.updatedAt };
      continue;
    }
    const merged = mergeValues(key, base, localValue, row.value);
    if (merged === null) return null;
    const res = await remoteWrite(key, merged, row.updated_at);
    if (res.status === "ok") return { value: merged, updatedAt: res.updatedAt };
  }
  return null;
}

function notifyMerged(key) {
  try { window.dispatchEvent(new CustomEvent("budget-merged", { detail: { key } })); } catch { /* ignore */ }
}

async function flushDirty() {
  if (!session) return;
  for (const key of dirtyRead()) {
    const c = cacheRead(key);
    if (!c) { removeDirty(key); continue; }
    try {
      const res = await remoteWrite(key, c.value, c.updatedAt);
      if (res.status === "conflict") {
        const m = await resolveConflict(key, c.value, c.base ?? null);
        if (!m) { notifyConflict(); continue; }
        cacheWrite(key, m.value, m.updatedAt);
        removeDirty(key);
        notifyMerged(key);
        continue;
      }
      cacheWrite(key, c.value, res.updatedAt);
      removeDirty(key);
    } catch {
      return; // всё ещё нет сети — попробуем позже
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushDirty(); });
}

/* ---------------------------------------------------------------- совместный бюджет */
function safeJson(raw) { try { return JSON.parse(raw); } catch { return null; } }

// Узнаём, состоит ли пользователь в совместном бюджете. Если таблиц ещё нет (SQL не выполнен)
// или нет сети, опираемся на то, что запомнили раньше.
async function loadHousehold() {
  const cached = lsGet(HH_CACHE(uid()));
  try {
    const token = await ensureToken();
    const r = await http(`/rest/v1/household_members?user_id=eq.${uid()}&select=household_id`, { token });
    if (r.ok && Array.isArray(r.data)) {
      hh = r.data[0] ? { id: r.data[0].household_id } : null;
      lsSet(HH_CACHE(uid()), hh ? JSON.stringify(hh) : "none");
      return;
    }
    if (r.status === 404 || r.status === 400) { hh = null; return; } // таблицы нет — работаем лично
  } catch { /* офлайн */ }
  hh = cached && cached !== "none" ? safeJson(cached) : null;
}

function householdErrorText(r, notFound) {
  const d = r.data || {};
  const msg = String(d.message || d.error || "");
  if (/invalid_token/.test(msg)) return "Неверный ключ приёма";
  if (/empty_text/.test(msg)) return "Пустой текст";
  if (/inbox_full/.test(msg)) return "Лист ожидания переполнен (300 записей): разберите его";
  if (/already_member/.test(msg)) return "Вы уже состоите в совместном бюджете";
  if (/invalid_code/.test(msg)) return "Неверный код приглашения";
  if (/household_full/.test(msg)) return "В этом бюджете уже двое участников";
  if (/already_linked/.test(msg)) return "Аккаунт уже привязан к партнёру";
  if (/only_login_method/.test(msg)) return "Это единственный способ входа в аккаунт: отвязать VK нельзя";
  if (/own_code/.test(msg)) return "Это ваш собственный код: отправьте его партнёру";
  if (/not_owner/.test(msg)) return "Это может сделать только владелец";
  if (/not_authenticated/.test(msg)) return "Нужно войти в аккаунт";
  if (r.status === 404) return notFound || "Совместный бюджет не настроен: выполните supabase-household.sql в Supabase";
  return msg || `Ошибка (${r.status})`;
}

async function rpc(name, body, notFound) {
  const token = await ensureToken();
  const r = await http(`/rest/v1/rpc/${name}`, { method: "POST", token, body: body || {} });
  if (!r.ok) throw new Error(householdErrorText(r, notFound));
  return r.data;
}

// Записать значение в личный аккаунт (при выходе из совместного бюджета с копией данных).
async function writePersonal(key, value) {
  const keep = hh;
  hh = null;
  try {
    const row = await remoteGet(key);
    const res = await remoteWrite(key, value, row ? row.updated_at : null);
    if (res.status === "ok") cacheWrite(key, value, res.updatedAt);
  } finally {
    hh = keep;
  }
}

/* ---------------------------------------------------------------- перенос старых данных */
// Данные, накопленные до появления входа (localStorage без аккаунта), один раз
// загружаются в облако — но только если у аккаунта там ещё пусто.
async function migrateLegacy() {
  if (!session || hh || lsGet(MIGRATED_KEY)) return;
  for (const key of ["settings", "transactions"]) {
    const legacy = lsGet(PREFIX + key);
    if (legacy === null) continue;
    try {
      if (await remoteGet(key)) continue;
      const res = await remoteWrite(key, legacy, null);
      if (res.status === "ok") cacheWrite(key, legacy, res.updatedAt);
    } catch {
      return; // не получилось — повторим при следующем входе
    }
  }
  lsSet(MIGRATED_KEY, session.user.id);
}

/* ---------------------------------------------------------------- публичное API */
let recoveryTaken; // результат takeRecoveryFromUrl (считывается один раз)

// Ставит новый пароль по временному ключу восстановления и входит в аккаунт.
async function finishPasswordReset(tokens, password) {
  let r;
  try {
    r = await http("/auth/v1/user", { method: "PUT", token: tokens.access_token, body: { password } });
  } catch {
    throw new Error("Нет соединения с сервером");
  }
  if (!r.ok) throw new Error(authErrorText(r));
  saveSession(sessionFromResponse({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in || 3600,
    user: r.data,
  }));
  await loadHousehold();
  await migrateLegacy();
  emitAuth(session.user);
}

export const auth = {
  // Вызывать при запуске приложения: восстанавливает сессию. Возвращает пользователя или null.
  async init() {
    session = loadSession();
    if (!session) return null;
    try { await ensureToken(); } catch { /* офлайн или сессия истекла — см. session ниже */ }
    if (session) await loadHousehold();
    if (session) auth.refreshUser(); // имя могло измениться на другом устройстве; без ожидания
    return session ? session.user : null;
  },

  // Подтягивает имя профиля с сервера (user_metadata.name). Тихо ничего не делает без сети.
  async refreshUser() {
    if (!session) return;
    try {
      const token = await ensureToken();
      const r = await http("/auth/v1/user", { token });
      if (!r.ok || !r.data || !session) return;
      const name = String(r.data.user_metadata?.name || "");
      if (name !== (session.user.name || "")) {
        saveSession({ ...session, user: { ...session.user, name } });
        emitAuth(session.user);
      }
    } catch { /* офлайн */ }
  },

  // Меняет имя профиля. Кидает ошибку с понятным текстом, если не вышло.
  async updateName(name) {
    if (!session) throw new Error("not signed in");
    const clean = String(name || "").trim().slice(0, 40);
    let r;
    try {
      const token = await ensureToken();
      r = await http("/auth/v1/user", { method: "PUT", token, body: { data: { name: clean } } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    saveSession({ ...session, user: { ...session.user, name: clean } });
    emitAuth(session.user);
    return clean;
  },

  getUser() { return session ? session.user : null; },

  // ---- Согласие на обработку данных ----
  // Нужен ли экран согласия: человек зарегистрировался до появления согласия или политика с тех пор менялась по существу.
  needsConsent() {
    return !!session && session.user?.user_metadata?.consent_version !== CONSENT_VERSION;
  },

  async recordConsent() {
    if (!session) throw new Error("not signed in");
    let r;
    try {
      r = await http("/auth/v1/user", { method: "PUT", token: session.access_token, body: { data: { consent_version: CONSENT_VERSION, consent_at: new Date().toISOString() } } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    saveSession({ ...session, user: { ...session.user, ...r.data } });
  },

  // ---- Восстановление пароля ----
  // 1) Письмо: ссылка и (если в шаблоне письма есть {{ .Token }}) код. Сервер отвечает одинаково, есть такая почта или нет.
  async requestPasswordReset(email) {
    let r;
    try {
      const back = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
      r = await http(`/auth/v1/recover?redirect_to=${back}`, { method: "POST", body: { email } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
  },

  // 2а) Код из письма + новый пароль: проверяем код, ставим пароль, входим.
  async resetWithCode(email, code, password) {
    let r;
    try {
      r = await http("/auth/v1/verify", { method: "POST", body: { type: "recovery", email, token: String(code).replace(/\s/g, "") } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    await finishPasswordReset(r.data, password);
  },

  // 2б) Пришли по ссылке из письма: в адресной строке лежит временный ключ (#access_token=…&type=recovery).
  // Возвращает { access_token, refresh_token, expires_in } | { error } | null. Адрес очищается, результат запоминается.
  takeRecoveryFromUrl() {
    if (recoveryTaken !== undefined) return recoveryTaken;
    recoveryTaken = null;
    try {
      const h = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
      if (h.get("type") === "recovery" && h.get("access_token")) {
        recoveryTaken = { access_token: h.get("access_token"), refresh_token: h.get("refresh_token") || "", expires_in: Number(h.get("expires_in")) || 3600 };
      } else if (h.get("error") && /otp_expired|access_denied/.test(`${h.get("error_code")} ${h.get("error")}`)) {
        recoveryTaken = { error: "Ссылка из письма устарела или уже использована. Запросите новое письмо." };
      }
      if (recoveryTaken) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch { /* ignore */ }
    return recoveryTaken;
  },

  // Вход по одноразовому ключу от сервера (используется входом через VK: сервер проверил VK и выдал ключ).
  async signInWithTokenHash(tokenHash) {
    let r;
    try {
      r = await http("/auth/v1/verify", { method: "POST", body: { type: "magiclink", token_hash: tokenHash } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    saveSession(sessionFromResponse(r.data));
    await loadHousehold();
    await migrateLegacy();
    emitAuth(session.user);
  },

  async setPasswordFromLink(tokens, password) {
    await finishPasswordReset({ ...tokens }, password);
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  async signIn(email, password) {
    let r;
    try {
      r = await http("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    saveSession(sessionFromResponse(r.data));
    await loadHousehold();
    await migrateLegacy();
    emitAuth(session.user);
    return session.user;
  },

  async signUp(email, password, name) {
    let r;
    try {
      r = await http("/auth/v1/signup", { method: "POST", body: { email, password, data: { name: String(name || "").trim().slice(0, 40), consent_version: CONSENT_VERSION, consent_at: new Date().toISOString() } } });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    if (!r.ok) throw new Error(authErrorText(r));
    if (r.data && r.data.access_token) {
      saveSession(sessionFromResponse(r.data));
      await loadHousehold();
      await migrateLegacy();
      emitAuth(session.user);
      return { user: session.user };
    }
    return { needsConfirm: true };
  },

  async signOut() {
    if (!session) return;
    const { id } = session.user;
    try { await flushDirty(); } catch { /* ignore */ }
    try { await http("/auth/v1/logout", { method: "POST", token: session.access_token }); } catch { /* ignore */ }
    clearUserCache(id);
    hh = null;
    saveSession(null);
    emitAuth(null);
  },
};

export const storage = {
  async get(key) {
    if (!session) throw new Error("not signed in");

    let row = null;
    try {
      row = await remoteGet(key);
    } catch (e) {
      if (!session) throw e; // сессия истекла
      const c = cacheRead(key);
      if (c) return { key, value: c.value }; // офлайн — берём копию
      throw new Error("offline");
    }

    const cached = cacheRead(key);
    if (row) {
      // Есть неотправленные локальные правки и на сервере с тех пор ничего не менялось — оставляем их.
      if (isDirty(key) && cached && cached.updatedAt === row.updated_at) {
        flushDirty();
        return { key, value: cached.value };
      }
      // Правки сделаны офлайн, а на сервере за это время тоже менялось — сливаем, а не затираем.
      if (isDirty(key) && cached) {
        try {
          const m = await resolveConflict(key, cached.value, cached.base ?? null);
          if (m) {
            cacheWrite(key, m.value, m.updatedAt);
            removeDirty(key);
            return { key, value: m.value };
          }
        } catch { /* нет сети — ниже обычный путь */ }
      }
      removeDirty(key);
      cacheWrite(key, row.value, row.updated_at);
      flushDirty();
      return { key, value: row.value };
    }

    if (cached && isDirty(key)) return { key, value: cached.value };
    throw new Error("not found");
  },

  async set(key, value) {
    if (!session) throw new Error("not signed in");
    const cached = cacheRead(key);
    try {
      const res = await remoteWrite(key, value, cached ? cached.updatedAt : null);
      if (res.status === "conflict") {
        // на другом устройстве (или у партнёра) данные уже изменились — сливаем правки, ничего не затирая
        const m = await resolveConflict(key, value, cached ? (cached.base ?? cached.value) : null);
        if (m) {
          cacheWrite(key, m.value, m.updatedAt);
          removeDirty(key);
          return { key, value: m.value, merged: true };
        }
        notifyConflict();
        return { key, value, conflict: true };
      }
      cacheWrite(key, value, res.updatedAt);
      removeDirty(key);
    } catch {
      if (!session) throw new Error("not signed in");
      cacheWrite(key, value, cached ? cached.updatedAt : null, true);
      addDirty(key);
    }
    return { key, value };
  },

  async delete(key) {
    if (!session) throw new Error("not signed in");
    const token = await ensureToken();
    const r = await http(`/rest/v1/${scopeTable()}?${scopeFilter()}&key=eq.${enc(key)}`, { method: "DELETE", token });
    if (!r.ok) throw new Error(`remote delete ${r.status}`);
    lsDel(cacheKey(key));
    removeDirty(key);
    return { key, deleted: true };
  },

  // Большие значения (фото чеков). Не кэшируются в localStorage и не ставятся в офлайн-очередь:
  // иначе они быстро переполнили бы локальное хранилище. Нужен интернет.
  async setBlob(key, value) {
    if (!session) throw new Error("not signed in");
    const token = await ensureToken();
    const r = await http(`/rest/v1/${scopeTable()}?on_conflict=${scopeConflictCols()}`, {
      method: "POST",
      token,
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: { ...scopeRow(key, value), updated_at: new Date().toISOString() },
    });
    if (!r.ok) throw new Error(`remote blob write ${r.status}`);
    return { key };
  },

  async getBlob(key) {
    if (!session) throw new Error("not signed in");
    const row = await remoteGet(key);
    return row ? row.value : null;
  },

  async deleteBlob(key) {
    if (!session) throw new Error("not signed in");
    const token = await ensureToken();
    const r = await http(`/rest/v1/${scopeTable()}?${scopeFilter()}&key=eq.${enc(key)}`, { method: "DELETE", token });
    if (!r.ok) throw new Error(`remote blob delete ${r.status}`);
    return { key, deleted: true };
  },

  // true, если на сервере есть более новые данные, чем у нас в кэше (изменили на другом устройстве).
  async checkStale() {
    if (!session) return false;
    try {
      const token = await ensureToken();
      const r = await http(`/rest/v1/${scopeTable()}?select=key,updated_at`, { token });
      if (!r.ok || !Array.isArray(r.data)) return false;
      const dirty = dirtyRead();
      return r.data.some((row) => {
        const c = cacheRead(row.key);
        return c && !dirty.includes(row.key) && c.updatedAt !== row.updated_at;
      });
    } catch {
      return false;
    }
  },
};

/* ---------------------------------------------------------------- совместный бюджет: действия */
export const household = {
  // "household" или "personal" — где сейчас лежат данные.
  scope() { return hh ? "household" : "personal"; },

  // Сведения о совместном бюджете или null, если вы в нём не состоите.
  async info() {
    if (!session) throw new Error("not signed in");
    return (await rpc("household_info")) || null;
  },

  // Создать совместный бюджет: ваши нынешние данные копируются в общий (личные остаются как были).
  async create(name) {
    if (!session) throw new Error("not signed in");
    if (hh) throw new Error("Вы уже состоите в совместном бюджете");
    const personal = {};
    for (const key of ["settings", "transactions"]) {
      const row = await remoteGet(key);
      if (row) personal[key] = row.value;
    }
    const created = await rpc("create_household", { p_name: name || "" });
    const next = { id: created.id };
    try {
      hh = next;
      for (const [key, value] of Object.entries(personal)) {
        const res = await remoteWrite(key, value, null);
        if (res.status !== "ok") throw new Error("Не удалось перенести данные");
      }
    } catch (e) {
      hh = null;
      try { await rpc("leave_household"); } catch { /* ignore */ }
      throw e;
    }
    // Фото чеков переносим по возможности, ошибки не критичны.
    try {
      hh = null;
      const token = await ensureToken();
      const list = await http(`/rest/v1/${TABLE}?user_id=eq.${uid()}&key=like.receipt:*&select=key`, { token });
      hh = next;
      for (const { key } of Array.isArray(list.data) ? list.data : []) {
        try {
          hh = null;
          const row = await remoteGet(key);
          hh = next;
          if (row) await storage.setBlob(key, row.value);
        } catch { hh = next; }
      }
    } catch { /* ignore */ }
    hh = next;
    lsSet(HH_CACHE(uid()), JSON.stringify(hh));
    return { id: created.id, inviteCode: created.invite_code };
  },

  // Вступить по коду приглашения. Ваши личные данные не меняются: вы начинаете работать с общими.
  async join(code) {
    if (!session) throw new Error("not signed in");
    const joined = await rpc("join_household", { p_code: code });
    hh = { id: joined.id };
    lsSet(HH_CACHE(uid()), JSON.stringify(hh));
    return { id: joined.id };
  },

  // Выйти. keepCopy — перед выходом скопировать общие данные в свой личный аккаунт (они заменят прежние личные).
  async leave({ keepCopy } = {}) {
    if (!session) throw new Error("not signed in");
    if (!hh) return;
    const copy = {};
    if (keepCopy) {
      for (const key of ["settings", "transactions"]) {
        const row = await remoteGet(key);
        if (row) copy[key] = row.value;
      }
    }
    const leftId = hh.id;
    await rpc("leave_household");
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(`${PREFIX}h:${leftId}:`)).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    hh = null;
    lsSet(HH_CACHE(uid()), "none");
    for (const [key, value] of Object.entries(copy)) await writePersonal(key, value);
  },

  async regenerateCode() {
    return rpc("regenerate_invite");
  },

  async removeMember(userId) {
    await rpc("remove_member", { p_user: userId });
  },
};

/* ---------------------------------------------------------------- привязка аккаунтов («пространства») */
// У каждого остаётся свой аккаунт и свои данные. Партнёр может только ЧИТАТЬ бюджет, если вы разрешили
// (supabase-partner.sql). Ничего из его данных в ваше хранилище не пишется.
const PARTNER_NOT_SET_UP = "Привязка аккаунтов не настроена: выполните supabase-partner.sql в Supabase";
const partnerCacheKey = () => `${PREFIX}partner:${uid()}`;

export const partner = {
  // { partner: { id, email }, i_share, partner_shares } или null, если привязки нет.
  async info() {
    if (!session) throw new Error("not signed in");
    return (await rpc("partner_info", {}, PARTNER_NOT_SET_UP)) || null;
  },

  async createInvite() {
    if (!session) throw new Error("not signed in");
    return rpc("create_partner_invite", {}, PARTNER_NOT_SET_UP);
  },

  async accept(code) {
    if (!session) throw new Error("not signed in");
    await rpc("accept_partner_invite", { p_code: code }, PARTNER_NOT_SET_UP);
  },

  async setSharing(share) {
    if (!session) throw new Error("not signed in");
    await rpc("set_partner_sharing", { p_share: !!share }, PARTNER_NOT_SET_UP);
  },

  async unlink() {
    if (!session) throw new Error("not signed in");
    await rpc("unlink_partner", {}, PARTNER_NOT_SET_UP);
    lsDel(partnerCacheKey());
  },

  // Бюджет партнёра: { settings, transactions } — строки JSON или null (если партнёр не открыл доступ).
  // Без сети показываем последнюю сохранённую копию (offline: true).
  async loadData(partnerId) {
    if (!session) throw new Error("not signed in");
    try {
      const token = await ensureToken();
      const r = await http(`/rest/v1/${TABLE}?user_id=eq.${enc(partnerId)}&key=in.(settings,transactions)&select=key,value`, { token });
      if (!r.ok) throw new Error(`partner read ${r.status}`);
      const out = { settings: null, transactions: null };
      (Array.isArray(r.data) ? r.data : []).forEach((row) => { out[row.key] = row.value; });
      lsSet(partnerCacheKey(), JSON.stringify(out));
      return out;
    } catch (e) {
      const cached = safeJson(lsGet(partnerCacheKey()) || "");
      if (cached) return { ...cached, offline: true };
      throw e;
    }
  },
};

/* ---------------------------------------------------------------- «Общая» книга пары */
// Общие траты и категории двух привязанных аккаунтов (supabase-shared.sql). Каждая запись — массив целиком,
// меняется «прочитал → применил правку → записал, если за это время никто не менял» (при конфликте повторяем).
const SHARED_NOT_SET_UP = "Общая книга не настроена: выполните supabase-shared.sql в Supabase";
const SHARED_KEYS = ["shared-items", "shared-cats"];
let pairKeyMemo = null;
const sharedCacheKey = () => `${PREFIX}shared:${uid()}`;

async function sharedPairKey() {
  if (pairKeyMemo && pairKeyMemo.uid === uid()) return pairKeyMemo.key;
  const key = await rpc("my_pair_key", {}, SHARED_NOT_SET_UP);
  if (!key || typeof key !== "string") throw new Error("Аккаунты не привязаны друг к другу");
  pairKeyMemo = { uid: uid(), key };
  return key;
}

function parseList(raw) {
  const v = safeJson(raw || "");
  return Array.isArray(v) ? v : [];
}

export const shared = {
  // { "shared-items": [...], "shared-cats": [...] }; без сети — последняя сохранённая копия.
  async load() {
    if (!session) throw new Error("not signed in");
    try {
      const pk = await sharedPairKey();
      const token = await ensureToken();
      const r = await http(`/rest/v1/shared_data?pair_key=eq.${enc(pk)}&select=key,value`, { token });
      if (!r.ok) throw new Error(r.status === 404 ? SHARED_NOT_SET_UP : `shared read ${r.status}`);
      const out = { "shared-items": [], "shared-cats": [] };
      (Array.isArray(r.data) ? r.data : []).forEach((row) => { if (SHARED_KEYS.includes(row.key)) out[row.key] = parseList(row.value); });
      lsSet(sharedCacheKey(), JSON.stringify(out));
      return out;
    } catch (e) {
      const cached = safeJson(lsGet(sharedCacheKey()) || "");
      if (cached) return { ...cached, offline: true };
      throw e;
    }
  },

  // mutate(текущий массив) → новый массив. Возвращает записанный массив.
  async update(key, mutate) {
    if (!session) throw new Error("not signed in");
    if (!SHARED_KEYS.includes(key)) throw new Error("bad key");
    const pk = await sharedPairKey();
    for (let attempt = 0; attempt < 4; attempt++) {
      const token = await ensureToken();
      const g = await http(`/rest/v1/shared_data?pair_key=eq.${enc(pk)}&key=eq.${enc(key)}&select=value,updated_at`, { token });
      if (!g.ok) throw new Error(g.status === 404 ? SHARED_NOT_SET_UP : `shared read ${g.status}`);
      const row = Array.isArray(g.data) && g.data[0] ? g.data[0] : null;
      const next = mutate(row ? parseList(row.value) : []);
      const value = JSON.stringify(next);
      if (row) {
        const w = await http(`/rest/v1/shared_data?pair_key=eq.${enc(pk)}&key=eq.${enc(key)}&updated_at=eq.${enc(row.updated_at)}`, {
          method: "PATCH", token, headers: { Prefer: "return=representation" }, body: { value, updated_at: new Date().toISOString() },
        });
        if (!w.ok) throw new Error(`shared write ${w.status}`);
        if (Array.isArray(w.data) && w.data.length) return next;
      } else {
        const w = await http(`/rest/v1/shared_data?on_conflict=pair_key,key`, {
          method: "POST", token, headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: { pair_key: pk, key, value },
        });
        if (!w.ok) throw new Error(`shared insert ${w.status}`);
        if (Array.isArray(w.data) && w.data.length) return next;
      }
    }
    throw new Error("Не удалось сохранить: данные одновременно менял второй аккаунт. Попробуйте ещё раз");
  },
};

/* ---------------------------------------------------------------- вход через VK */
// supabase-vk.sql + функция vk-login: обмен кода VK на вход в аккаунт и привязка VK к существующему аккаунту.
export const vkApi = {
  async exchange(body, withUser) {
    const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
    if (withUser) headers.Authorization = `Bearer ${await ensureToken()}`;
    let r;
    try {
      r = await fetch(`${SUPABASE_URL}/functions/v1/vk-login`, { method: "POST", headers, body: JSON.stringify(body) });
    } catch {
      throw new Error("Нет соединения с сервером");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const text = data.message || data.error || `ошибка ${r.status}`;
      throw new Error(data.detail ? `${text} (${String(data.detail).slice(0, 160)})` : text);
    }
    return data;
  },
  async status() { return !!(await rpc("vk_link_status", {}, "VK не настроен")); },
  async unlink() { await rpc("vk_unlink", {}, "VK не настроен"); },
};

/* ---------------------------------------------------------------- отчёты о проблемах */
// supabase-reports.sql: текст пользователя и технический журнал без финансовых данных.
export const reports = {
  async submit({ message, log, contact, app }) {
    if (!session) throw new Error("not signed in");
    await rpc("submit_problem_report", {
      p_message: message,
      p_log: log || null,
      p_contact: contact || null,
      p_app: app || null,
      p_ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }, "Отправка отчётов не настроена: выполните supabase-reports.sql в Supabase");
  },
};

/* ---------------------------------------------------------------- удаление аккаунта */
// supabase-delete-account.sql: сервер удаляет все данные и аккаунт; здесь чистим локальное и выходим.
export const account = {
  async deleteMe() {
    if (!session) throw new Error("not signed in");
    const { id } = session.user;
    try { await push.disable(); } catch { /* ignore */ }
    await rpc("delete_my_account", {}, "Не настроено: выполните supabase-delete-account.sql в Supabase");
    // Сервер всё удалил. Несохранённые локальные правки больше никуда не отправляем.
    try { dirtyWrite([]); } catch { /* ignore */ }
    clearUserCache(id);
    try { Object.keys(localStorage).filter((k) => k.includes(id)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    hh = null;
    saveSession(null);
    emitAuth(null);
  },
};

/* ---------------------------------------------------------------- push-уведомления устройства */
// Подписка устройства сохраняется в базе (supabase-push.sql); отправляет сообщения функция notify-partner,
// когда вы вносите трату. Работает там, где есть браузерные push (Chrome с сервисами Google, iPhone с иконкой на экране).
const b64ToBytes = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const push = {
  configured() { return !!VAPID_PUBLIC_KEY; },

  supported() {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  },

  permission() { return typeof Notification === "undefined" ? "unsupported" : Notification.permission; },

  async isSubscribed() {
    if (!this.supported()) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return !!sub;
  },

  async enable() {
    if (!session) throw new Error("not signed in");
    if (!this.configured()) throw new Error("Push-уведомления не настроены");
    if (!this.supported()) throw new Error("Это устройство или браузер не поддерживает push. Откройте «Бюджет» в Chrome или в приложении из RuStore.");
    const perm = await Notification.requestPermission();
    if (perm === "denied") throw new Error("Уведомления запрещены в настройках телефона. Откройте: Настройки → Приложения → «Бюджет» → Уведомления → разрешить (или Chrome → Настройки сайтов → Уведомления → ser-ver88.ru → Разрешить), затем попробуйте снова.");
    if (perm !== "granted") throw new Error("Разрешение не выдано. Нажмите ещё раз и в окне выберите «Разрешить».");
    // Служба приложения должна быть запущена; без ограничения по времени переключатель мог бы «зависнуть».
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Служба приложения не запустилась. Закройте «Бюджет» полностью, откройте снова и повторите.")), 10000)),
    ]);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
      } catch (e) {
        throw new Error(`Не удалось подключиться к службе push (${e?.name || "ошибка"}). Проверьте интернет и попробуйте ещё раз; на телефоне должны работать службы Google.`);
      }
    }
    const j = sub.toJSON();
    await rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_ua: navigator.userAgent }, "Не настроено: выполните supabase-push.sql в Supabase");
  },

  async disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    if (session) { try { await rpc("remove_push_subscription", { p_endpoint: endpoint }); } catch { /* не страшно */ } }
  },

  // Сообщить партнёру о моей трате: { kind: "personal" | "shared", amount, category }. Ошибки не мешают работе.
  async notifyPartner(payload) {
    try {
      if (!session || !this.configured()) return;
      const token = await ensureToken();
      fetch(`${SUPABASE_URL}/functions/v1/notify-partner`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  },
};

/* ---------------------------------------------------------------- лист ожидания (банковские уведомления) */
const INBOX_NOT_SET_UP = "Приём уведомлений не настроен: выполните supabase-inbox.sql в Supabase";

export const inbox = {
  // Что нужно указать в приложении-автоматизации на телефоне (адрес и публичный ключ API).
  endpoint() {
    return {
      rawUrl: `${SUPABASE_URL}/rest/v1/rpc/ingest_raw`,               // тело запроса = текст уведомления как есть
      url: `${SUPABASE_URL}/rest/v1/rpc/ingest_notification`,         // вариант с JSON
      apikey: SUPABASE_KEY,
    };
  },

  async list() {
    if (!session) throw new Error("not signed in");
    const token = await ensureToken();
    const r = await http("/rest/v1/pending_transactions?select=id,source,raw_text,received_at&order=received_at.asc&limit=300", { token });
    if (!r.ok) throw new Error(`inbox ${r.status}`);
    return Array.isArray(r.data) ? r.data : [];
  },

  async remove(id) {
    if (!session) throw new Error("not signed in");
    const token = await ensureToken();
    const r = await http(`/rest/v1/pending_transactions?id=eq.${enc(id)}`, { method: "DELETE", token });
    if (!r.ok) throw new Error(`inbox delete ${r.status}`);
  },

  async tokenInfo() { return rpc("has_ingest_token", {}, INBOX_NOT_SET_UP); },
  async createToken() { return rpc("create_ingest_token", {}, INBOX_NOT_SET_UP); },
  async revokeToken() { await rpc("revoke_ingest_token", {}, INBOX_NOT_SET_UP); },

  // Проверка ключа: тестовая запись в лист ожидания. Идёт обычным JSON-запросом, потому что браузер
  // разрешает свои заголовки (x-ingest-*) не на всех серверах; телефон же шлёт «сырой» запрос без этих ограничений.
  async sendTest(tokenValue) {
    const r = await http("/rest/v1/rpc/ingest_notification", {
      method: "POST",
      body: { p_token: tokenValue, p_source: "sber", p_text: 'Тест: Покупка 100р "MAGNIT" Баланс: 1000р' },
    });
    if (!r.ok) throw new Error(householdErrorText(r, INBOX_NOT_SET_UP));
  },
};

/* ---------------------------------------------------------------- фото профиля */
// Лежит в личной таблице app_data под ключом profile-avatar (не в общем бюджете: у каждого своё фото).
// Это небольшая картинка (около 8–15 КБ), копия хранится в localStorage.
const AVATAR_KEY = "profile-avatar";
function avatarCacheKey() { return `${PREFIX}u:${uid()}:${AVATAR_KEY}`; }

export const profile = {
  cachedAvatar() {
    if (!session) return "";
    return lsGet(avatarCacheKey()) || "";
  },

  // Возвращает data-URL или "" (фото нет). Локальная копия никогда не теряется: если на сервере фото нет,
  // а у нас есть, оставляем своё и пробуем дозагрузить его на сервер.
  async loadAvatar() {
    if (!session) return "";
    const local = lsGet(avatarCacheKey()) || "";
    try {
      const token = await ensureToken();
      const r = await http(`/rest/v1/${TABLE}?user_id=eq.${uid()}&key=eq.${enc(AVATAR_KEY)}&select=value`, { token });
      if (!r.ok) throw new Error("avatar get");
      const v = Array.isArray(r.data) && r.data[0] ? r.data[0].value : null;
      const img = v && typeof v.img === "string" ? v.img : "";
      if (img) {
        lsSet(avatarCacheKey(), img);
        return img;
      }
      if (local) {
        profile.saveAvatar(local).catch(() => { /* дозагрузим при следующем открытии */ });
        return local;
      }
      return "";
    } catch {
      return local;
    }
  },

  // Фото сначала сохраняется на этом устройстве (оно не пропадёт), потом отправляется на сервер.
  // Если сервер не принял — кидает ошибку с local: true: фото уже сохранено локально, а текст ошибки говорит, что не так.
  async saveAvatar(dataUrl) {
    if (!session) throw new Error("not signed in");
    lsSet(avatarCacheKey(), dataUrl);
    const localOnly = (why) => Object.assign(new Error(`Фото сохранено только на этом устройстве: ${why}.`), { local: true });
    let r;
    try {
      const token = await ensureToken();
      r = await http(`/rest/v1/${TABLE}?on_conflict=user_id,key`, {
        method: "POST",
        token,
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: { user_id: uid(), key: AVATAR_KEY, value: { img: dataUrl }, updated_at: new Date().toISOString() },
      });
    } catch {
      throw localOnly("нет связи с сервером");
    }
    if (!r.ok) throw localOnly(`сервер ответил ${r.status}`);
  },

  async removeAvatar() {
    if (!session) throw new Error("not signed in");
    lsDel(avatarCacheKey());
    const token = await ensureToken();
    const r = await http(`/rest/v1/${TABLE}?user_id=eq.${uid()}&key=eq.${enc(AVATAR_KEY)}`, { method: "DELETE", token });
    if (!r.ok) throw new Error(`Не удалось удалить фото на сервере (код ${r.status}).`);
  },
};
