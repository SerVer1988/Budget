// Edge Function «vk-login»: вход в «Бюджет» через VK ID и привязка VK к аккаунту.
// Принимает одноразовый код VK (с PKCE), обменивает его на данные профиля и выдаёт одноразовый ключ входа.
// ВАЖНО: в настройках функции отключите «Verify JWT» (вход выполняется до того, как у человека есть аккаунт);
// проверки сделаны внутри функции. Секретов не требуется (VK ID с PKCE работает без секретного ключа).
import { createClient } from "npm:@supabase/supabase-js@2";

const VK_CLIENT_ID = "54852043";
const VK_HOSTS = ["https://id.vk.ru", "https://id.vk.com"];
const ALLOWED_ORIGINS = ["https://ser-ver88.ru", "https://www.ser-ver88.ru"];
const ALLOWED_REDIRECTS = ["https://ser-ver88.ru/"];
const SYNTHETIC_DOMAIN = "vk.budget.invalid"; // адрес для аккаунтов, созданных входом через VK

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

function pickKey(legacy: string, jsonName: string): string {
  const v = Deno.env.get(legacy);
  if (v) return v;
  try {
    const o = JSON.parse(Deno.env.get(jsonName) ?? "{}");
    return o["default"] ?? (Object.values(o)[0] as string) ?? "";
  } catch {
    return "";
  }
}

// Не больше 20 попыток в минуту с одного адреса.
const hits = new Map<string, number[]>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  return list.length > 20;
}

async function vkPost(path: string, params: Record<string, string>) {
  let last: { status: number; data: Record<string, unknown> } = { status: 0, data: {} };
  for (const host of VK_HOSTS) {
    try {
      const r = await fetch(`${host}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      });
      const data = await r.json().catch(() => ({}));
      last = { status: r.status, data };
      if (r.status !== 404 && r.status < 500) return last; // ответ получен (успех или отказ): повторять на другом адресе не нужно
    } catch (e) {
      last = { status: 0, data: { error: "network", error_description: (e as Error).message } };
    }
  }
  return last;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (tooMany(ip)) return json(req, { error: "rate_limited", message: "Слишком много попыток, подождите минуту" }, 429);

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "");
    const deviceId = String(body?.device_id ?? "");
    const verifier = String(body?.code_verifier ?? "");
    const redirectUri = String(body?.redirect_uri ?? "");
    const state = String(body?.state ?? "");
    const mode = body?.mode === "link" ? "link" : "login";
    if (!code || !deviceId || verifier.length < 43 || verifier.length > 128 || !ALLOWED_REDIRECTS.includes(redirectUri)) {
      return json(req, { error: "bad_request", message: "Некорректные данные входа" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = pickKey("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS");
    const serviceKey = pickKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Привязка требует, чтобы человек уже был в аккаунте.
    let currentUserId: string | null = null;
    if (mode === "link") {
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data } = await userClient.auth.getUser();
      if (!data?.user) return json(req, { error: "unauthorized", message: "Сначала войдите в аккаунт" }, 401);
      currentUserId = data.user.id;
    }

    // 1. Обмен кода на токены VK.
    const tok = await vkPost("/oauth2/auth", {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: VK_CLIENT_ID,
      device_id: deviceId,
      redirect_uri: redirectUri,
      state,
    });
    const accessToken = String((tok.data as Record<string, unknown>).access_token ?? "");
    if (tok.status !== 200 || !accessToken) {
      console.error("vk token exchange failed", tok.status, JSON.stringify(tok.data).slice(0, 300));
      const d = tok.data as Record<string, unknown>;
      return json(req, { error: "vk_exchange", message: "VK не принял вход", detail: String(d.error_description ?? d.error ?? tok.status) }, 502);
    }

    // 2. Профиль пользователя VK.
    const info = await vkPost("/oauth2/user_info", { client_id: VK_CLIENT_ID, access_token: accessToken });
    const u = ((info.data as Record<string, unknown>).user ?? {}) as Record<string, unknown>;
    const vkId = String(u.user_id ?? (tok.data as Record<string, unknown>).user_id ?? "");
    if (!vkId) {
      console.error("vk user_info failed", info.status, JSON.stringify(info.data).slice(0, 300));
      return json(req, { error: "vk_profile", message: "Не удалось получить профиль VK" }, 502);
    }
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim().slice(0, 40);

    // 3. Привязка VK к текущему аккаунту.
    const { data: existing } = await admin.from("vk_links").select("user_id").eq("vk_id", vkId).maybeSingle();
    if (mode === "link") {
      if (existing && existing.user_id !== currentUserId) {
        return json(req, { error: "already_linked", message: "Этот профиль VK уже привязан к другому аккаунту" }, 409);
      }
      await admin.from("vk_links").delete().eq("user_id", currentUserId); // у аккаунта один VK
      const { error: linkErr } = await admin.from("vk_links").insert({ vk_id: vkId, user_id: currentUserId });
      if (linkErr) return json(req, { error: "link_failed", message: "Не удалось привязать VK" }, 500);
      return json(req, { linked: true });
    }

    // 4. Вход: находим аккаунт или создаём новый.
    let userId = existing?.user_id as string | undefined;
    let created = false;
    if (!userId) {
      const { data: made, error: createErr } = await admin.auth.admin.createUser({
        email: `vk${vkId}@${SYNTHETIC_DOMAIN}`,
        email_confirm: true,
        user_metadata: { name: fullName, vk_id: vkId },
      });
      if (createErr || !made?.user) {
        console.error("create user failed", createErr?.message);
        return json(req, { error: "create_failed", message: "Не удалось создать аккаунт" }, 500);
      }
      userId = made.user.id;
      created = true;
      const { error: linkErr } = await admin.from("vk_links").insert({ vk_id: vkId, user_id: userId });
      if (linkErr) return json(req, { error: "link_failed", message: "Не удалось сохранить связь с VK" }, 500);
    }

    // 5. Одноразовый ключ входа (письмо не отправляется).
    const { data: got } = await admin.auth.admin.getUserById(userId);
    const email = got?.user?.email;
    if (!email) return json(req, { error: "no_email", message: "Не удалось выдать вход" }, 500);
    const { data: link, error: linkGenErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkGenErr || !tokenHash) {
      console.error("generateLink failed", linkGenErr?.message);
      return json(req, { error: "session_failed", message: "Не удалось выдать вход" }, 500);
    }
    return json(req, { token_hash: tokenHash, created });
  } catch (e) {
    console.error("vk-login error", e);
    return json(req, { error: "server_error", message: "Ошибка сервера" }, 500);
  }
});
