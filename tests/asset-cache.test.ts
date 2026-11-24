import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync('tools/service-worker.js', 'utf8');
const root = 'https://example.com/games/pairs/';
const manifest = {version: 'one', files: [
  {path: 'index.html', bytes: 100}, {path: 'prism-blessing/index.html', bytes: 50},
  {path: 'assets/board-one.js', bytes: 200}, {path: 'assets/naiwa/naiwa-0.png', bytes: 80},
]};
const key = (value: any): string => typeof value === 'string' ? value : value instanceof URL ? value.href : value.url;
class MemoryCache {
  items = new Map<string, Response>();
  async match(value: any) { return this.items.get(key(value))?.clone(); }
  async put(value: any, response: Response) { this.items.set(key(value), response.clone()); }
}
class MemoryCaches {
  items = new Map<string, MemoryCache>();
  async open(name: string) { if (!this.items.has(name)) this.items.set(name, new MemoryCache()); return this.items.get(name)!; }
  async keys() { return [...this.items.keys()]; }
  async delete(name: string) { return this.items.delete(name); }
  async match(value: any) {
    for (const cache of this.items.values()) { const saved = await cache.match(value); if (saved) return saved; }
  }
}
function worker(build = manifest, caches = new MemoryCaches()) {
  const handlers: Record<string, (event: any) => void> = {};
  const requests: string[] = [];
  let offline = false, failedPath = '';
  runInNewContext(source, {
    BUILD: build, URL, Response, AbortController, setTimeout, clearTimeout, caches,
    self: {location: {href: `${root}sw.js`}, clients: {claim: async () => {}}, skipWaiting: async () => {},
      addEventListener: (name: string, handler: any) => { handlers[name] = handler; }},
    fetch: async (value: any) => {
      const url = key(value); requests.push(url);
      if (offline) throw new Error('offline');
      return new Response(`${build.version}:${url}`, {status: url.endsWith(failedPath) && failedPath ? 503 : 200});
    },
  });
  return {
    caches, requests,
    offline(value = true) { offline = value; },
    fail(path: string) { failedPath = path; },
    async prepare() {
      const messages: any[] = []; let done: Promise<void> | undefined;
      handlers.message({data: {type: 'prepare-game'}, ports: [{postMessage: (data: any) => messages.push(data)}], waitUntil: (promise: Promise<void>) => { done = promise; }});
      await done; return messages;
    },
    async activate() {
      let done: Promise<void> | undefined;
      handlers.activate({waitUntil: (promise: Promise<void>) => { done = promise; }}); await done;
    },
    request(path: string, mode = 'cors', method = 'GET'): Promise<Response> | undefined {
      let response: Promise<Response> | undefined;
      handlers.fetch({request: {url: new URL(path, root).href, mode, method}, respondWith: (promise: Promise<Response>) => { response = promise; }});
      return response;
    },
  };
}

test('first prepare caches the nested game; repeat launch uses every cached resource offline', async () => {
  const game = worker();
  const first = await game.prepare();
  assert.equal(first.at(-1).type, 'ready');
  assert.equal(first.at(-1).cached, 0);
  assert.equal(first.at(-2).completed, 430);
  assert.ok(game.requests.every(url => url.startsWith(root)));
  assert.equal(game.requests.length, manifest.files.length);
  game.offline();
  const second = await game.prepare();
  assert.equal(second.at(-1).cached, manifest.files.length);
  assert.equal(game.requests.length, manifest.files.length);
});

test('offline root and known iframe navigations return their own HTML, not the same page', async () => {
  const game = worker(); await game.prepare(); game.offline();
  assert.equal(await (await game.request('?share=1', 'navigate'))!.text(), `one:${root}index.html`);
  assert.equal(await (await game.request('prism-blessing/index.html', 'navigate'))!.text(), `one:${root}prism-blessing/index.html`);
  assert.equal(await (await game.request('assets/naiwa/naiwa-0.png'))!.text(), `one:${root}assets/naiwa/naiwa-0.png`);
});

test('incomplete downloads report failure and retry fills missing entries without accepting an error response', async () => {
  const game = worker(); game.fail('assets/board-one.js');
  assert.equal((await game.prepare()).at(-1).type, 'error');
  game.fail('');
  const retried = await game.prepare();
  assert.equal(retried.at(-1).type, 'ready');
  assert.equal(await (await game.request('assets/board-one.js'))!.text(), `one:${root}assets/board-one.js`);
});

test('new versions replace asset bytes while keeping a prior tab usable and unrelated caches intact', async () => {
  const caches = new MemoryCaches();
  await caches.open('other-project'); await caches.open('planet-pairs-assets-ancient');
  const old = worker(manifest, caches); await old.prepare();
  const latest = worker({version: 'two', files: manifest.files.map(file => ({...file, path: file.path.replace('board-one', 'board-two')}))}, caches);
  await latest.prepare(); await latest.activate(); latest.offline();
  assert.equal(await (await latest.request('index.html'))!.text(), `two:${root}index.html`);
  assert.equal(await (await latest.request('assets/board-one.js'))!.text(), `one:${root}assets/board-one.js`);
  assert.deepEqual(await caches.keys(), ['other-project', 'planet-pairs-assets-one', 'planet-pairs-assets-two']);
});

test('cache only handles GET requests inside this game directory and root navigation stays fresh online', async () => {
  const game = worker(); await game.prepare();
  assert.equal(game.request('https://elsewhere.example/asset.png'), undefined);
  assert.equal(game.request('/other-game/assets/a.png'), undefined);
  assert.equal(game.request('assets/board-one.js', 'cors', 'POST'), undefined);
  assert.equal(await (await game.request('', 'navigate'))!.text(), `one:${root}`);
  const before = game.requests.length;
  assert.equal(await (await game.request('index.html', 'navigate'))!.text(), `one:${root}index.html`);
  assert.equal(game.requests.length, before + 1, 'direct index navigation must check the network for updates');
  const iframeBefore = game.requests.length;
  await game.request('prism-blessing/index.html', 'navigate');
  assert.equal(game.requests.length, iframeBefore, 'pack iframe navigation should use the warmed cache');
});
