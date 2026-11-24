import './blessing-pack.css';
import { BLESSINGS } from './rules';
import { chooseBlessing, type BlessingPackState } from './blessing-choice';
import { getUniverse, packAppearance, type UniverseTheme } from './themes';
import type { PrismSound } from './card-sounds';
import { installButtonFeedback } from './button-feedback';

type BlessingInfo = (typeof BLESSINGS)[number];
interface PackOptions {
  state: BlessingPackState;
  previous: { info: BlessingInfo; pick: number } | null;
  onPick: (index: number) => BlessingInfo;
  onStateChange: () => void;
  requestChoiceAd: () => Promise<boolean>;
  onContinue: () => void;
  soundEnabled: boolean;
  soundController?: PrismSound;
  onButtonClick?: () => void;
  mobileEffects?: boolean;
  theme?: UniverseTheme;
}

/** The upstream stage handles motion; the parent owns reveals and ad rewards. */
export function mountBlessingPack(root: HTMLElement, options: PackOptions): () => void {
  let phase: 'loading' | 'sealed' | 'opening' | 'dealing' | 'choosing' | 'flipping' | 'selected' | 'ad' | 'unlocking' | 'error' = 'loading';
  let disposed = false;
  let disposeButtonFeedback = () => {};
  let selected = options.previous?.info ?? null;
  const state = options.state;
  const theme = options.theme ?? getUniverse('classic');
  const definitions = BLESSINGS.map(info => ({...info, description: info.description.replaceAll('星球', theme.copy.subject)}));
  const frameUrl = new URL('./prism-blessing/index.html', document.baseURI).href;
  root.innerHTML = `<div class="bp-experience" data-phase="loading"><div class="bp-ribbon-overlay" aria-hidden="true"><div class="bp-ribbon-stage"><div class="bp-ribbon-scene"></div></div></div><div class="bp-stage"><iframe class="bp-original-stage" title="祝福卡，点击一张翻开" allow="autoplay" src="${frameUrl}"></iframe></div><div class="bp-result" role="status" aria-live="polite"><h2>横向滑动，拆开祝福包</h2></div><div class="bp-actions"><button class="bp-choice-ad" aria-label="观看广告，任意选择祝福" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5 16 10 6 16.5Z"/></svg><span>任意选择</span><small>广告</small></button><button class="wide-button bp-action" disabled>准备中…</button></div></div>`;
  const experience = root.querySelector<HTMLDivElement>('.bp-experience')!;
  const frame = root.querySelector<HTMLIFrameElement>('iframe')!;
  const action = root.querySelector<HTMLButtonElement>('.bp-action')!;
  const ad = root.querySelector<HTMLButtonElement>('.bp-choice-ad')!;
  const result = root.querySelector<HTMLDivElement>('.bp-result')!;
  const ribbonOverlay = root.querySelector<HTMLDivElement>('.bp-ribbon-overlay')!;
  const ribbonStage = root.querySelector<HTMLDivElement>('.bp-ribbon-stage')!;
  const ribbonScene = root.querySelector<HTMLDivElement>('.bp-ribbon-scene')!;
  const screen = root.closest<HTMLElement>('.blessing-pack-screen') ?? root;
  const send = (message: object) => frame.contentWindow?.postMessage({channel: 'planet-blessing', ...message}, location.origin);
  function ribbonBounds() {
    const area = screen.getBoundingClientRect(), box = frame.getBoundingClientRect();
    return { top: Math.max(0, box.top - area.top), side: Math.max(0, box.left - area.left, area.right - box.right) };
  }
  function syncRibbons() {
    if (disposed) return;
    const area = screen.getBoundingClientRect(), box = frame.getBoundingClientRect();
    ribbonStage.style.left = `${box.left - area.left}px`;
    ribbonStage.style.top = `${box.top - area.top}px`;
    ribbonStage.style.width = `${box.width}px`;
    ribbonStage.style.height = `${box.height}px`;
    const pack = frame.contentDocument?.getElementById('pack');
    if (pack) {
      ribbonStage.style.setProperty('--ribbon-pack-w', `${pack.offsetWidth}px`);
      ribbonStage.style.setProperty('--ribbon-pack-h', `${pack.offsetHeight}px`);
    }
    send({type: 'ribbon-bounds', bounds: ribbonBounds()});
  }
  function mountRibbons() {
    const anchor = frame.contentDocument?.getElementById('jetAnchor');
    // Keep the actual animated node: the upstream engine continues updating its
    // paths and springs, while the parent page provides room above the iframe.
    if (anchor) ribbonScene.replaceChildren(anchor);
    syncRibbons();
  }
  const ribbonResize = new ResizeObserver(syncRibbons);
  ribbonResize.observe(screen); ribbonResize.observe(frame);
  function setPhase(value: typeof phase) {
    phase = value; experience.dataset.phase = value;
    ad.hidden = !state.opened || state.unlocked;
    ad.disabled = !['choosing', 'selected'].includes(value);
  }
  function showReady() {
    setPhase(selected ? 'selected' : 'choosing');
    result.innerHTML = selected ? `<h2>${selected.name}</h2><p>${selected.description}</p>` : `<p>${state.unlocked ? '选择你喜欢的祝福' : '选一张，翻开看看'}</p>`;
    action.disabled = !selected; action.textContent = '下一步';
  }
  function savePick(id: unknown): boolean {
    const index = BLESSINGS.findIndex(b => b.id === id);
    if (index < 0 || !chooseBlessing(state, BLESSINGS[index].id)) return false;
    selected = options.onPick(index); options.onStateChange();
    return true;
  }
  function onMessage(event: MessageEvent) {
    if (disposed || event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.channel !== 'planet-blessing') return;
    switch (event.data.type) {
      case 'init-request':
        if (frame.contentWindow && options.soundController) {
          (frame.contentWindow as Window & {__planetPackSound?: PrismSound}).__planetPackSound = options.soundController;
        }
        send({type: 'init', config: {blessings: definitions, theme: packAppearance(theme, document.baseURI), ribbonOverflow: ribbonBounds(), order: state.order, opened: state.opened, freePick: state.freePick, unlocked: state.unlocked, previous: selected?.id ?? null, sound: options.soundEnabled, mobileEffects: options.mobileEffects}});
        break;
      case 'loaded':
        disposeButtonFeedback();
        if (frame.contentDocument && options.onButtonClick) {
          disposeButtonFeedback = installButtonFeedback(frame.contentDocument, options.onButtonClick, () => options.soundController ? !options.soundController.isMuted : options.soundEnabled);
        }
        mountRibbons();
        if (state.opened) showReady();
        else { setPhase('sealed'); action.disabled = false; action.textContent = '撕开祝福包'; }
        break;
      case 'opening':
        state.opened = true; options.onStateChange(); setPhase('dealing');
        result.innerHTML = '<p>祝福已启封</p>'; action.disabled = true; action.textContent = '正在出卡…';
        break;
      case 'ready':
        showReady();
        break;
      case 'picking':
        if (phase !== 'choosing' && phase !== 'selected') return;
        if (!savePick(event.data.id)) return;
        setPhase('flipping'); action.disabled = true; action.textContent = '下一步';
        result.innerHTML = '<p>正在翻开…</p>';
        break;
      case 'select':
        if (!['choosing', 'selected', 'flipping'].includes(phase)) return;
        if (savePick(event.data.id)) showReady();
        break;
      case 'all-revealed':
        if (state.unlocked) showReady();
        break;
      case 'error':
        setPhase('error'); action.disabled = false; action.textContent = '重新加载';
        result.innerHTML = '<p>祝福包尚未准备好</p>';
        break;
    }
  }
  window.addEventListener('message', onMessage);
  const unlockAudio = () => options.soundController?.unlock();
  action.addEventListener('pointerdown', unlockAudio);
  action.addEventListener('keydown', unlockAudio);
  ad.addEventListener('pointerdown', unlockAudio);
  ad.addEventListener('keydown', unlockAudio);
  ad.onclick = async () => {
    if (disposed || state.unlocked || !['choosing', 'selected'].includes(phase)) return;
    setPhase('ad'); action.disabled = true;
    const completed = await options.requestChoiceAd().catch(() => false);
    if (disposed) return;
    if (!completed) { showReady(); return; }
    state.unlocked = true; options.onStateChange(); setPhase('unlocking');
    result.innerHTML = '<p>正在翻开全部祝福…</p>'; action.disabled = true;
    send({type: 'unlock'});
  };
  action.onclick = () => {
    if (phase === 'sealed') {
      setPhase('opening'); action.disabled = true; action.textContent = '正在拆开…';
      send({type: 'open'});
    } else if (phase === 'selected') options.onContinue();
    else if (phase === 'error') { setPhase('loading'); action.disabled = true; ribbonScene.replaceChildren(); frame.src = frameUrl; }
  };
  return () => {
    disposed = true; disposeButtonFeedback(); ribbonResize.disconnect(); window.removeEventListener('message', onMessage); ribbonOverlay.remove(); frame.remove();
    options.soundController?.call('setRip', 0);
  };
}
