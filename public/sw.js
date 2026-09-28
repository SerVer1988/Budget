// Сервис-воркер: кэширует собранные файлы (JS, CSS, картинки, шрифты — всё,
// что Vite кладёт в /assets/ с хэшем в имени), чтобы:
//  1. они не пропадали без интернета;
//  2. отдавались мгновенно из кэша — без сетевого «мерцания» при свайпе.
//
// Хэш в имени файла означает, что при новой сборке файл с таким именем уже
// не изменится — поэтому для /assets/ безопасно всегда брать из кэша, не
// проверяя сеть. index.html и всё остальное — наоборот: сначала сеть (чтобы
// сразу видеть обновления), а кэш — только как запасной вариант офлайн.
// Supabase и другие чужие домены сервис-воркер не трогает вообще.

const CACHE = "budget-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // чужие домены (Supabase и т.п.) не кэшируем

  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
