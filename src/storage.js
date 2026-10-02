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
let session = null; // { access_token, refresh_token, expires_at (мс), user: { id, email } }
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
    user: { id: d.user.id, email: d.user.email },
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
  if (/rate limit|over_email_send_rate_limit|too many/i.test(raw + code) || r.status === 429) return "Слишком много попыток — подождите немного";
  if (/invalid.*email|validation_failed/i.test(raw + code)) return "Проверьте адрес почты";
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
    const prefixes = [`${PREFIX}u:${userId}:`, `${PREFIX}h:`, HH_CACHE(userId)];
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

function householdErrorText(r) {
  const d = r.data || {};
  const msg = String(d.message || d.error || "");
  if (/already_member/.test(msg)) return "Вы уже состоите в совместном бюджете";
  if (/invalid_code/.test(msg)) return "Неверный код приглашения";
  if (/household_full/.test(msg)) return "В этом бюджете уже двое участников";
  if (/not_owner/.test(msg)) return "Это может сделать только владелец";
  if (/not_authenticated/.test(msg)) return "Нужно войти в аккаунт";
  if (r.status === 404) return "Совместный бюджет не настроен: выполните supabase-household.sql в Supabase";
  return msg || `Ошибка (${r.status})`;
}

async function rpc(name, body) {
  const token = await ensureToken();
  const r = await http(`/rest/v1/rpc/${name}`, { method: "POST", token, body: body || {} });
  if (!r.ok) throw new Error(householdErrorText(r));
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
export const auth = {
  // Вызывать при запуске приложения: восстанавливает сессию. Возвращает пользователя или null.
  async init() {
    session = loadSession();
    if (!session) return null;
    try { await ensureToken(); } catch { /* офлайн или сессия истекла — см. session ниже */ }
    if (session) await loadHousehold();
    return session ? session.user : null;
  },

  getUser() { return session ? session.user : null; },

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

  async signUp(email, password) {
    let r;
    try {
      r = await http("/auth/v1/signup", { method: "POST", body: { email, password } });
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
