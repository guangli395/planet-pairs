/* BUILD is generated from the production files by offline-build.ts. */
const CACHE = `planet-pairs-assets-${BUILD.version}`;
const ROOT = new URL('./', self.location.href);
const paths = new Set(BUILD.files.map(file => new URL(file.path, ROOT).href));
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  const names = (await caches.keys()).filter(name => name.startsWith('planet-pairs-assets-'));
  // Keep the previous release for tabs that still reference its hashed chunks.
  const old = names.filter(name => name !== CACHE);
  await Promise.all(old.slice(0, -1).map(name => caches.delete(name)));
})()));

async function prepare(port) {
  const cache = await caches.open(CACHE);
  const total = BUILD.files.reduce((sum, file) => sum + file.bytes, 0);
  let completed = 0, cursor = 0, cached = 0;
  const progress = () => port.postMessage({type: 'progress', completed, total, cached, version: BUILD.version});
  progress();
  const downloads = await Promise.allSettled(Array.from({length: 4}, async () => {
    while (cursor < BUILD.files.length) {
      const file = BUILD.files[cursor++];
      const url = new URL(file.path, ROOT).href;
      // Shipped public files are identical for every user. Module requests may
      // carry an Origin header that differs from the preload's Vary header.
      if (await cache.match(url, {ignoreVary: true})) cached++;
      else {
        const response = await fetch(url, {cache: 'reload'});
        if (!response.ok) throw new Error(`Resource ${file.path}: ${response.status}`);
        await cache.put(url, response);
      }
      completed += file.bytes; progress();
    }
  }));
  const failed = downloads.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  await cache.put(new URL('game-assets.json', ROOT), new Response(JSON.stringify(BUILD), {headers: {'Content-Type': 'application/json'}}));
  port.postMessage({type: 'ready', version: BUILD.version, cached, count: BUILD.files.length, manifest: BUILD});
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'prepare-game' || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      // Normal startup sends one request; concurrent tabs can warm independently.
      await prepare(port);
    } catch (error) { port.postMessage({type: 'error', message: String(error)}); }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const gamePage = url.pathname === ROOT.pathname || url.pathname === new URL('index.html', ROOT).pathname;
  if (request.mode === 'navigate' && gamePage) {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try { return await fetch(request, {signal: controller.signal}); }
      catch {
        const cache = await caches.open(CACHE);
        return await cache.match(new URL('index.html', ROOT), {ignoreVary: true}) ?? await caches.match(new URL('index.html', ROOT), {ignoreVary: true}) ?? Response.error();
      } finally { clearTimeout(timeout); }
    })());
    return;
  }
  if (!paths.has(url.href)) {
    // A tab left open across an update may still request an older hashed chunk.
    if (url.pathname.startsWith(new URL('assets/', ROOT).pathname)) {
      event.respondWith((async () => await caches.match(request, {ignoreVary: true}) ?? fetch(request))());
    }
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(request, {ignoreVary: true});
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
