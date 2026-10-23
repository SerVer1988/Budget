// Edge Function «notify-partner»: когда вы вносите трату, отправляет push-уведомление на устройства партнёра.
// Развёртывание и секреты: см. инструкцию в чате (Supabase → Edge Functions → notify-partner).
// Секреты функции: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (например mailto:you@example.com).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGINS = ["https://ser-ver88.ru", "https://www.ser-ver88.ru", "https://server1988.github.io"];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

// Ключи берём из новых или из старых переменных окружения проекта.
function pickKey(legacyName: string, jsonName: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const obj = JSON.parse(Deno.env.get(jsonName) ?? "{}");
    return obj["default"] ?? (Object.values(obj)[0] as string) ?? "";
  } catch {
    return "";
  }
}

// Не больше 30 запросов в минуту с одного аккаунта (защита от зацикливания).
const hits = new Map<string, number[]>();
function tooMany(userId: string): boolean {
  const now = Date.now();
  const list = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(userId, list);
  return list.length > 30;
}

const money = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = pickKey("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS");
    const serviceKey = pickKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");

    // 1. Кто вызывает: проверяем сессию пользователя на сервере авторизации.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json(req, { error: "unauthorized" }, 401);
    if (tooMany(user.id)) return json(req, { error: "rate_limited" }, 429);

    // 2. Что отправить.
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind === "shared" ? "shared" : body?.kind === "personal" ? "personal" : null;
    const amount = Number(body?.amount);
    const category = String(body?.category ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 60);
    if (!kind || !Number.isFinite(amount) || amount <= 0 || amount > 1e9) return json(req, { error: "bad_request" }, 400);

    // 3. Кому: взаимно привязанный партнёр.
    const admin = createClient(url, serviceKey);
    const { data: link } = await admin.from("partner_links").select("partner_id, share").eq("user_id", user.id).maybeSingle();
    if (!link) return json(req, { sent: 0, reason: "no_partner" });
    const { data: back } = await admin.from("partner_links").select("user_id").eq("user_id", link.partner_id).eq("partner_id", user.id).maybeSingle();
    if (!back) return json(req, { sent: 0, reason: "not_mutual" });
    // Личные траты — только если отправитель открыл партнёру свой бюджет.
    if (kind === "personal" && !link.share) return json(req, { sent: 0, reason: "not_shared" });

    // 4. Включены ли у получателя уведомления и как он назвал отправителя.
    let partnerName = "Партнёр";
    const { data: row } = await admin.from("app_data").select("value").eq("user_id", link.partner_id).eq("key", "settings").maybeSingle();
    if (row?.value) {
      try {
        const st = JSON.parse(row.value);
        if (st?.partnerNotify === false) return json(req, { sent: 0, reason: "disabled" });
        const n = String(st?.spaceNames?.partner ?? "").trim();
        if (n) partnerName = n.slice(0, 40);
      } catch { /* настройки нечитаемы — шлём с именем по умолчанию */ }
    }

    // 5. Подписки устройств получателя.
    const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", link.partner_id).eq("provider", "webpush");
    if (!subs || subs.length === 0) return json(req, { sent: 0, reason: "no_devices" });

    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

    const text = kind === "shared"
      ? `${partnerName} добавил(а) общую трату: ${category || "Расход"} ${money(amount)}`
      : `${partnerName}: ${category || "Расход"} ${money(amount)}`;
    const payload = JSON.stringify({ title: "Совместный бюджет", body: text, tag: "partner-expense", url: "./" });

    let sent = 0;
    const dead: string[] = [];
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // подписка больше не действует
        else console.error("push failed", code, (e as Error)?.message);
      }
    }));
    if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);

    return json(req, { sent, removed: dead.length });
  } catch (e) {
    console.error("notify-partner error", e);
    return json(req, { error: "server_error" }, 500);
  }
});
