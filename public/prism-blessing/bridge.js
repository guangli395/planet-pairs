// The parent owns the six definitions, game progress and sound preference.
let started = false;
window.addEventListener('message', async event => {
  if (event.source !== window.parent || event.origin !== location.origin || event.data?.channel !== 'planet-blessing') return;
  if (event.data.type !== 'init' || started) return;
  const config = event.data.config;
  if (!Array.isArray(config?.blessings) || config.blessings.length !== 6) return;
  started = true;
  window.__blessingInit = config;
  if (config.theme) {
    document.body.dataset.universe = config.theme.id;
    document.body.dataset.palette = config.theme.palette;
    document.title = `${config.theme.logo}拆包`;
    document.documentElement.style.setProperty('--universe-card-back', `url("${config.theme.cardBack}")`);
    document.documentElement.style.setProperty('--blind-card-edge', config.theme.backEdge);
    document.documentElement.style.setProperty('--blind-card-glow', config.theme.highlight);
    for (const [key, value] of Object.entries(config.theme.colors ?? {})) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }
  }
  try {
    await import('./engine.js');
  } catch (error) {
    console.error('Blessing pack failed to load', error);
    window.parent.postMessage({channel: 'planet-blessing', type: 'error'}, location.origin);
  }
});
window.parent.postMessage({channel: 'planet-blessing', type: 'init-request'}, location.origin);
