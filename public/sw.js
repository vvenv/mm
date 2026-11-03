/* Markdown Mindmap service worker — app-shell offline cache.
 * Bump CACHE whenever public assets change (keep in sync with ?v= in index.html).
 *
 * JS modules must be network-first: cache-first + pathname keys can pair a fresh
 * index.html with a stale mm-core.js after deploy (missing named exports). */
const CACHE = "mm-20261103d";
const ASSETS = [
  "/",
  "/index.html",
  "/mm-core.js",
  "/emoji-data.js",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function cacheKey(request) {
  const url = new URL(typeof request === "string" ? request : request.url);
  const v = url.searchParams.get("v");
  return v ? `${url.pathname}?v=${encodeURIComponent(v)}` : url.pathname;
}

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const keyed = await cache.match(cacheKey(request));
  if (keyed) return keyed;
  // Fallback for precache entries stored without ?v=
  const url = new URL(typeof request === "string" ? request : request.url);
  if (url.searchParams.has("v")) return cache.match(url.pathname);
  return undefined;
}

async function putInCache(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(cacheKey(request), response.clone());
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    const cached = await fromCache(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await fromCache(new Request("/index.html"));
      if (shell) return shell;
    }
    throw new Error("offline");
  }
}

async function cacheFirst(request) {
  const cached = await fromCache(request);
  if (cached) {
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  await putInCache(request, response);
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!sameOrigin(url)) return;

  // Let the browser manage service worker script updates itself.
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // ES modules / app scripts: never serve a stale shell next to a new index.
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".mjs")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
