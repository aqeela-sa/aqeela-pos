/* يحفظ ملفات الكاشير في الآيباد ليعمل بدون إنترنت. الشبكة أولاً (لتصل التحديثات فوراً)، والمحفوظ عند انقطاعها. */
const CACHE = "aq-pos-v1";
const SHELL = ["./", "index.html", "app.js", "fb.js", "firebase-config.js", "vendor/firebase.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), key = u.pathname.endsWith("/") ? "./" : e.request;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(e.request, { signal: ctl.signal, cache: "no-cache" }); clearTimeout(t);
      if (r.ok) c.put(key === "./" ? "./" : new Request(u.origin + u.pathname), r.clone());
      return r;
    } catch {
      return (await c.match(key === "./" ? "./" : u.origin + u.pathname)) || (await c.match("index.html")) || Response.error();
    }
  })());
});
