interface AssetManifest { version: string; files: {path: string; bytes: number}[] }
const panel = document.querySelector<HTMLElement>('#game-loading')!;
const bar = document.querySelector<HTMLElement>('#loading-fill')!;
const percent = document.querySelector<HTMLElement>('#loading-percent')!;
const status = document.querySelector<HTMLElement>('#loading-status')!;
const retry = document.querySelector<HTMLButtonElement>('#loading-retry')!;
const proceed = document.querySelector<HTMLButtonElement>('#loading-continue')!;
const warmImages: HTMLImageElement[] = [];
let launching = false, launchFailed = false, attempt = 0;
let cancelPreparation = () => {};

function progress(value: number, text: string) {
  const done = Math.max(0, Math.min(100, Math.floor(value)));
  bar.style.transform = `scaleX(${done / 100})`;
  percent.textContent = `${done}%`; status.textContent = text;
  panel.setAttribute('aria-valuenow', String(done));
}
async function launch() {
  if (launching) return;
  launching = true; retry.hidden = proceed.hidden = true;
  try {
    progress(99, '准备进入游戏…');
    await import('./main');
    progress(100, '准备完成'); panel.remove();
  } catch {
    launching = false; launchFailed = true; status.textContent = '游戏暂未加载完成，请重试'; retry.hidden = false;
  }
}

async function browserPreload(current: number): Promise<AssetManifest> {
  const response = await fetch(new URL('./game-assets.json', document.baseURI), {cache: 'no-cache'});
  if (!response.ok) throw new Error('Asset list unavailable');
  const manifest: AssetManifest = await response.json();
  let cursor = 0, completed = 0;
  const total = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  await Promise.all(Array.from({length: 4}, async () => {
    while (cursor < manifest.files.length && current === attempt) {
      const file = manifest.files[cursor++];
      const resource = await fetch(new URL(file.path, document.baseURI));
      if (!resource.ok) throw new Error(`Resource ${file.path}: ${resource.status}`);
      await resource.arrayBuffer(); completed += file.bytes;
      if (current === attempt) progress(completed / total * 95, '正在准备游戏资源…');
    }
  }));
  document.documentElement.dataset.assetCache = 'browser';
  return manifest;
}

async function workerPreload(current: number): Promise<AssetManifest> {
  const registration = await navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), {scope: './', updateViaCache: 'none'});
  // Existing registrations can resolve before their background update check.
  // Wait for that check so new HTML never warms an old worker's asset list.
  await registration.update().catch(() => {});
  if (current !== attempt) throw new Error('Preparation replaced');
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error('No cache worker');
  if (worker.state !== 'activated') await new Promise<void>((resolve, reject) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
      if (worker.state === 'redundant') reject(new Error('Cache worker replaced'));
    });
  });
  if (current !== attempt) throw new Error('Preparation replaced');
  const channel = new MessageChannel();
  return new Promise((resolve, reject) => {
    cancelPreparation = () => { channel.port1.close(); reject(new Error('Preparation replaced')); };
    channel.port1.onmessage = event => {
      const data = event.data;
      if (data.type === 'progress') progress(data.total ? data.completed / data.total * 95 : 0, data.cached ? '正在读取本地资源…' : '首次准备资源，稍等片刻…');
      if (data.type === 'ready' || data.type === 'error') {
        channel.port1.close(); cancelPreparation = () => {};
        if (data.type === 'ready') {
          Object.assign(document.documentElement.dataset, {assetCache: 'ready', assetCacheVersion: data.version, assetCacheHits: String(data.cached), assetCacheCount: String(data.count)});
          resolve(data.manifest);
        } else reject(new Error(data.message));
      }
    };
    worker.postMessage({type: 'prepare-game'}, [channel.port2]);
  });
}

async function prepare() {
  const current = ++attempt;
  cancelPreparation();
  retry.hidden = proceed.hidden = true;
  progress(0, '正在检查本地资源…');
  if (import.meta.env.DEV) { await launch(); return; }
  const timeout = window.setTimeout(() => {
    if (current === attempt) { status.textContent = '网络较慢，资源仍在准备'; retry.hidden = proceed.hidden = false; }
  }, 18000);
  try {
    // Some platform WebViews disable workers and cache the uploaded package themselves.
    const manifest = 'serviceWorker' in navigator && window.isSecureContext
      ? await workerPreload(current).catch(error => {
        if (current !== attempt) throw error;
        return browserPreload(current);
      }) : await browserPreload(current);
    if (current !== attempt) return;
    progress(96, '正在准备画面…');
    // Parse the engine before tearing, rather than during its most intensive effects.
    await Promise.all([
      import('./board'),
      ...manifest.files.filter(file => /\.(?:svg|png|webp|jpg)$/.test(file.path)).map(async file => {
        const image = new Image(); warmImages.push(image);
        image.src = new URL(file.path, document.baseURI).href;
        await image.decode().catch(() => {});
      }),
    ]);
    if (current === attempt) await launch();
  } catch {
    if (current !== attempt) return;
    status.textContent = '资源尚未准备完成，请检查网络';
    retry.hidden = proceed.hidden = false;
  } finally { window.clearTimeout(timeout); }
}
retry.onclick = () => { if (launchFailed) location.reload(); else void prepare(); };
proceed.onclick = () => { attempt++; cancelPreparation(); void launch(); };
void prepare();
