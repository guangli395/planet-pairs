import './style.css';
import './themes.css';
import { UNIVERSES, getUniverse } from './themes';
import { mountBlessingPack } from './blessing-pack';
import { restoreBlessingPackState } from './blessing-choice';
import { createCardSounds } from './card-sounds';
import { installButtonFeedback } from './button-feedback';
import { animateCardFlip } from './card-flip';
import { HiddenSlices, clipCutSegment, packCutLine, type CutBounds } from './hidden-slices';
import { HiddenPackVisual } from './hidden-pack';
import { BLESSINGS, PLANETS, createRun, drawOne, settle, needsSettlement, continueRun, type Mode, type Blessing, type Run, type GameEvent } from './rules';
import type { createBoard, BoardScene } from './board';
import { freshStore, loadStore, refreshDay, saveStore as saveGameStore, type SetupDraft, type Store } from './store';
import { showRewardEffect, type RewardEffect } from './effects';
import { SettlementPlayback } from './settlement-playback';
import { CARD_TIERS, canSpendEnergy, cardAdsRequired, claimEnergyAd, recoveryRemaining, spendEnergy, type CardTier } from './energy';

const app = document.querySelector<HTMLDivElement>('#app')!;
const previewHidden = import.meta.env.DEV && new URLSearchParams(location.search).has('previewHidden');
const previewBlessing = import.meta.env.DEV && (new URLSearchParams(location.search).has('previewBlessing') || previewHidden);
const previewUniverse = import.meta.env.DEV && new URLSearchParams(location.search).has('previewUniverse');
const previewSettlement = import.meta.env.DEV && new URLSearchParams(location.search).has('previewSettlement');
const previewOpening = import.meta.env.DEV && new URLSearchParams(location.search).has('previewOpening');
const previewBoard = import.meta.env.DEV && new URLSearchParams(location.search).has('previewBoard');
const store = previewBlessing || previewUniverse || previewSettlement || previewOpening || previewBoard ? freshStore() : loadStore();
if (previewUniverse) store.universe = getUniverse(new URLSearchParams(location.search).get('previewUniverse')).id;
function saveStore(value: Store) { if (!previewBlessing && !previewUniverse && !previewSettlement && !previewOpening && !previewBoard) saveGameStore(value); }
const openingRuns = new WeakSet<Run>();
let run: Run | null = null;
let scene: BoardScene;
let gameReady: ReturnType<typeof createBoard>;
let boardModule: Promise<typeof import('./board')> | undefined;
function loadBoardModule() {
  return boardModule ??= import('./board').catch(error => { boardModule = undefined; throw error; });
}
let busy = false;
let automatic = true;
let display: Run | null = null;
let setupMode: Mode = 'stage';
let setupStage = 1;
let selectedBlessing: Blessing | null = null;
let chosen: number[] = [];
let draft: SetupDraft | null = null;
let energyModalReturn: (() => void) | null = null;
let audio: AudioContext | null = null;
let disposeBlessingPack: (() => void) | null = null;
const cardSounds = createCardSounds({
  enabled: () => store.sound,
  getContext: () => audio ??= new AudioContext(),
  fallback: () => beep('flip'),
});
document.addEventListener('pointerdown', cardSounds.unlock, {capture: true, passive: true});
document.addEventListener('keydown', cardSounds.unlock, {capture: true});
installButtonFeedback(document, cardSounds.click, () => store.sound);
if (import.meta.env.DEV) {
  // The isolated development route records which upstream voice actually ran.
  (window as Window & {__smktSfxHook?: (method: string, args: unknown[]) => void}).__smktSfxHook = (method, args) => {
    if (!['click', 'cardFlip', 'cardHover', 'cardTease', 'grab', 'burst', 'setRip'].includes(method)) return;
    if (method === 'setRip' && !(Number(args[0]) > 0)) return;
    app.dataset.cardSound = method; app.dataset.audioState = audio?.state ?? 'uninitialized';
    app.dataset.cardSoundCount = String(Number(app.dataset.cardSoundCount ?? 0) + 1);
    const key = `sound${method[0].toUpperCase()}${method.slice(1)}`;
    app.dataset[key] = String(Number(app.dataset[key] ?? 0) + 1);
  };
}

const universe = () => getUniverse(store.universe);
const asset = (i: number) => universe().characters[i].image;
const cardBack = () => universe().cardBack;
const blessing = (id: Blessing) => {
  const info = BLESSINGS.find(x => x.id === id)!;
  return {...info, description: info.description.replaceAll('星球', universe().copy.subject)};
};
function applyUniverse() {
  const theme = universe();
  document.documentElement.dataset.universe = theme.id;
  document.documentElement.dataset.palette = theme.palette;
  document.title = `${theme.copy.title}翻翻碰`;
  for (const key of new Set(UNIVERSES.flatMap(item => Object.keys(item.colors)))) document.documentElement.style.removeProperty(`--${key}`);
  for (const [key, value] of Object.entries(theme.colors)) document.documentElement.style.setProperty(`--${key}`, value);
  document.querySelectorAll<HTMLImageElement>('[data-theme-hero]').forEach(image => { image.src = asset(theme.hero); });
  document.querySelectorAll<HTMLImageElement>('[data-theme-character]').forEach(image => { image.src = asset(Number(image.dataset.themeCharacter)); });
  document.querySelectorAll<HTMLImageElement>('[data-theme-back]').forEach(image => { image.src = cardBack(); });
  const desktop = document.querySelector('.desktop-note h2');
  if (desktop) desktop.innerHTML = theme.copy.desktop;
  const desktopTitle = document.querySelector('.desktop-note p');
  if (desktopTitle) desktopTitle.textContent = `${theme.copy.title}翻翻碰`;
  document.querySelector('#phaser-board')?.setAttribute('aria-label', `九宫格${theme.copy.subject}棋盘`);
}
applyUniverse();
app.innerHTML = `<div class="ambient ambient-a"></div><div class="ambient ambient-b"></div>
 <aside class="desktop-note"><span class="small-orbit">✦</span><h2>${universe().copy.desktop}</h2><p>星球翻翻碰</p><div class="desktop-planets"><img data-theme-hero src="${asset(universe().hero)}" alt=""><img data-theme-character="1" src="${asset(1)}" alt=""></div><small>手机竖屏体验</small></aside>
 <main class="device" id="device"><div class="stardust"></div>
  <section id="home" class="screen home-screen"></section>
  <section id="setup" class="screen setup-screen" hidden></section>
  <section id="game-screen" class="screen game-screen" hidden>
   <header class="game-top"><div class="game-tools"><button class="icon-button toolbar-button" id="game-back" aria-label="暂停并返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>${energyBadge()}</div><span id="game-mode">星际旅程</span><button class="icon-button toolbar-button sound-toggle" aria-label="${store.sound ? '关闭音效' : '开启音效'}" aria-pressed="${store.sound}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4Z"/><g class="sound-waves"><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></g><path class="sound-muted" d="m16 9 5 6m0-6-5 6"/></svg></button></header>
   <div class="game-scenery"><div class="scenery-orbit"></div><img data-theme-hero src="${asset(universe().hero)}" alt="" class="scenery-planet"><span class="tiny-star one">✦</span><span class="tiny-star two">✧</span><span class="tiny-star three">✦</span><p id="stage-kicker">第一站</p><h1 id="stage-title">第 1 关</h1></div>
   <div class="score-area" id="score-target"><div class="score-label"><span id="score-name">收集进度</span><strong id="score-value">0 <i>/ 50</i></strong></div><div class="progress-track" id="progress-track"><div id="progress-fill"></div></div><small id="best-label" hidden>本局没有目标限制</small></div>
   <div class="run-badges"><div id="lucky-badge"></div><button id="blessing-badge"></button></div>
   <div class="event-lane"><span id="event-message" aria-live="polite">让星球相遇，让好运发生</span><div id="bonus-card" hidden></div></div>
   <div class="board-frame"><span class="board-jewel">✧</span><div id="phaser-board" aria-label="九宫格星球棋盘"></div></div>
   <div class="game-bottom"><div class="tiny-deck"><img data-theme-back src="${cardBack()}" alt=""><img data-theme-back src="${cardBack()}" alt=""><img data-theme-back src="${cardBack()}" alt=""></div>
    <button id="deal" class="deal-button"><span id="remaining">剩余 20 张</span><strong id="deal-label">发牌</strong></button>
    <div class="mode-switch" role="group" aria-label="发牌模式"><button id="manual">手动</button><button id="automatic" class="active">自动</button></div><p id="mode-hint">点一次完成一轮，结算后再次发牌</p>
   </div>
   <span id="blessing-announcement" class="sr-only" role="status" aria-live="polite"></span>
  </section>
  <div id="modal-layer" class="modal-layer" hidden></div><div id="toast" class="toast" role="status"></div>
 </main>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function screen(id: string) { disposeBlessingPack?.(); disposeBlessingPack = null; $('setup').classList.remove('blessing-pack-screen'); ['home', 'setup', 'game-screen'].forEach(x => { $(x).hidden = x !== id; }); $('device').scrollTop = 0; }
function beep(type: 'flip' | 'pair' | 'triple' | 'reward' | 'win' | 'blessing' | 'blessing-clear' | 'hidden' | 'slice') {
  if (!store.sound) return;
  try {
    audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime; const values = { flip: [500], pair: [660, 880], triple: [660, 830, 1046], reward: [880, 1100], win: [520, 650, 780, 1040], blessing: [1046, 1568], 'blessing-clear': [784, 1046, 1318, 1568], hidden: [392, 523, 659], slice: [740] }[type];
    values.forEach((frequency, i) => {
      const osc = audio!.createOscillator(), gain = audio!.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + i * .065); gain.gain.linearRampToValueAtTime(.0525, now + i * .065 + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + i * .065 + .14);
      osc.connect(gain); gain.connect(audio!.destination); osc.start(now + i * .065); osc.stop(now + i * .065 + .15);
    });
  } catch { /* Sound is optional on browsers without an available audio context. */ }
}
function toast(text: string) { $('toast').textContent = text; $('toast').classList.add('visible'); window.setTimeout(() => $('toast').classList.remove('visible'), 2400); }
function closeModal() { energyModalReturn = null; $('modal-layer').hidden = true; $('modal-layer').innerHTML = ''; }
function modal(html: string) { energyModalReturn = null; $('device').scrollTop = 0; $('modal-layer').innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`; $('modal-layer').hidden = false; $('modal-layer').querySelector<HTMLButtonElement>('button')?.focus(); }
function heading(symbol: string, title: string, subtitle: string) { return `<div class="modal-emblem">${symbol}</div><h2>${title}</h2><p class="modal-subtitle">${subtitle}</p>`; }
function podium(mode: Mode) {
  const endless = mode === 'endless';
  return `<article class="leader-panel ${endless ? 'teal-panel' : ''}"><header><div><span class="leader-icon">${endless ? '∞' : '♛'}</span><h2>${endless ? '无限榜' : '闯关榜'}</h2></div><button class="board-link" data-rank="${mode}">查看 <span>›</span></button></header><div class="podium-row">${[2, 1, 3].map(rank => `<div class="podium-player rank-${rank}">${rank === 1 ? '<span class="crown">♛</span>' : ''}<div class="avatar"><svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="8"/><path d="M9 43v-5c0-14 30-14 30 0v5"/></svg><b>${rank}</b></div><span class="player-name">虚位以待</span><strong>— <small>${endless ? universe().copy.unit : '关'}</small></strong><div class="podium-base"></div></div>`).join('')}</div></article>`;
}
function energyBadge() {
  return `<div class="energy-widget"><button class="energy-meter" data-energy aria-label="查看和补充体力"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C3 15-1 8 4 4c3-2 6-1 8 2 2-3 5-4 8-2 5 4 1 11-8 17Z"/></svg><strong data-energy-value>${store.infinite ? '∞' : store.energy}</strong><span data-energy-cap${store.infinite ? ' hidden' : ''}>/10</span><i aria-hidden="true">+</i></button><small data-energy-timer></small></div>`;
}
function countdown(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function updateEnergyUI() {
  const left = recoveryRemaining(store);
  document.querySelectorAll<HTMLElement>('[data-energy-value],[data-energy-modal-value]').forEach(el => { el.textContent = store.infinite ? '∞' : String(store.energy); });
  document.querySelectorAll<HTMLElement>('[data-energy-cap]').forEach(el => { el.hidden = store.infinite; });
  document.querySelectorAll<HTMLElement>('[data-energy-timer]').forEach(el => {
    el.hidden = store.infinite && Boolean(el.closest('.game-top'));
    el.textContent = store.infinite ? '今日无限体力' : left === null ? '体力充足' : `${countdown(left)} 后 +1`;
  });
  document.querySelectorAll<HTMLElement>('[data-energy-countdown]').forEach(el => { el.textContent = store.infinite ? '今日无限体力 · 北京时间 00:00 结束' : left === null ? '自然恢复上限 10，广告体力可叠加' : `${countdown(left)} 后恢复 1 点体力`; });
  document.querySelectorAll<HTMLElement>('[data-energy-cost]').forEach(el => { el.textContent = store.infinite ? '今日无限体力' : '每局消耗 1 体力'; });
}
function energyModal(onReturn: () => void = closeModal, insufficient = false) {
  refreshDay(store); saveStore(store);
  const rewards = ['体力 +5', '再加 5 体力', '今日无限 · 解锁30张'];
  modal(`${heading('♥', insufficient ? '体力不足' : '补充体力', '每 10 分钟恢复 1 点，带上好运再出发')}<div class="energy-total"><span>♥</span><strong data-energy-modal-value>${store.infinite ? '∞' : store.energy}</strong><small>${store.infinite ? '今日无限体力' : '当前体力'}</small></div><p class="energy-recovery" data-energy-countdown></p><div class="energy-reward-steps">${rewards.map((label, i) => `<div class="${store.energyAds > i ? 'completed' : store.energyAds === i ? 'next-reward' : ''}"><b>${store.energyAds > i ? '✓' : i + 1}</b><span>${label}</span></div>`).join('')}</div><p class="energy-ad-progress">今日补体力广告 <b>${store.energyAds} / 3</b></p>${store.infinite ? '<p class="energy-infinite-note">30 张档已解锁，可直接开始<br>北京时间零点恢复为 10 点体力</p>' : `<button class="wide-button" id="energy-watch">▶ ${store.energyAds === 2 ? '看广告 · 今日无限 + 解锁30张' : '看广告 · 体力 +5'}</button><small class="demo-note">只有补体力广告累计此进度</small>`}<button class="${store.infinite ? 'wide-button' : 'plain-link'}" id="energy-close">${store.infinite ? '带上好运，出发' : '返回'}</button>`);
  energyModalReturn = onReturn;
  if (!store.infinite) $('energy-watch').onclick = () => withAdReward('energy', () => {
    if (claimEnergyAd(store)) { saveStore(store); toast(store.infinite ? '今日无限体力与 30 张档已开启' : '获得 5 点体力'); }
    updateEnergyUI(); energyModal(onReturn);
  });
  $('energy-close').onclick = onReturn;
  updateEnergyUI();
}
function home() {
  refreshDay(store); saveStore(store); screen('home'); closeModal(); applyUniverse();
  $('home').innerHTML = `<header class="home-top">${energyBadge()}<button class="icon-button" id="settings" aria-label="设置">⚙</button></header>
   <div class="home-title"><img class="hero-planet" src="${asset(universe().hero)}" alt="${universe().characters[universe().hero].name}"><span class="hero-spark spark-a">✦</span><span class="hero-spark spark-b">✧</span><h1>${universe().copy.title}<span>翻翻碰</span></h1><p>${universe().copy.subtitle}</p><button class="universe-switch" id="universe-switch" aria-label="切换宇宙"><span class="universe-switch-dot"></span>${universe().name}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 5 5-5 5"/></svg></button></div>
   <div class="home-boards">${podium('stage')}${podium('endless')}</div>
   <div class="personal-record"><span>闯关纪录 <b>${store.cleared}</b> 关</span><i></i><span>无限最佳 <b>${store.endlessBest}</b> ${universe().copy.unit}</span></div>
   <div class="start-actions"><button class="start-button stage-start" id="start-stage"><span class="button-symbol">✦</span><strong>开始游戏</strong><small>闯关模式 · 第 ${store.unlocked} 关</small></button><button class="start-button endless-start" id="start-endless"><span class="button-symbol">∞</span><strong>无限模式</strong><small data-energy-cost>${store.infinite ? '今日无限体力' : '每局消耗 1 体力'}</small></button></div>
   <footer class="home-footer"><button id="rules-home">玩法说明</button><span class="home-energy-note">体力与闯关模式共用</span></footer>`;
  $('start-stage').onclick = () => startMode('stage'); $('start-endless').onclick = () => startMode('endless');
  $('rules-home').onclick = rulesModal; $('settings').onclick = settingsModal;
  $('universe-switch').onclick = universeModal;
  document.querySelectorAll<HTMLButtonElement>('[data-rank]').forEach(b => b.onclick = () => rankModal(b.dataset.rank as Mode));
  updateEnergyUI();
}
function universeModal() {
  modal(`<div class="universe-modal-heading"><h2 id="universe-title">切换宇宙</h2><button class="universe-close icon-button" id="universe-close" aria-label="关闭">×</button></div><div class="universe-options" role="region" aria-label="宇宙皮肤列表" tabindex="0">${UNIVERSES.map(theme => `<button class="universe-option${theme.id === store.universe ? ' selected' : ''}" data-select-universe="${theme.id}" data-preview-palette="${theme.palette}" data-preview-universe="${theme.id}" aria-pressed="${theme.id === store.universe}"><span class="universe-preview"><img src="${theme.characters[theme.hero].image}" alt="${theme.characters[theme.hero].name}"><span class="universe-miniatures">${[1, 3, 5].map(i => `<img src="${theme.characters[i].image}" alt="">`).join('')}</span></span><strong>${theme.name}</strong><span class="universe-option-status">${theme.id === store.universe ? '✓ 使用中' : '免费切换'}</span></button>`).join('')}</div>`);
  const dialog = $('modal-layer').querySelector('.modal-card')!;
  dialog.classList.add('universe-modal'); dialog.setAttribute('aria-labelledby', 'universe-title');
  $('universe-close').onclick = () => { closeModal(); $('universe-switch').focus(); };
  document.querySelectorAll<HTMLButtonElement>('[data-select-universe]').forEach(button => {
    button.onclick = () => {
      if (store.universe === button.dataset.selectUniverse) { closeModal(); return; }
      store.universe = getUniverse(button.dataset.selectUniverse).id;
      saveStore(store); home(); toast(`已切换到${universe().name}`);
      $('universe-switch').focus();
    };
  });
}
function startMode(mode: Mode) {
  refreshDay(store);
  if (!canSpendEnergy(store)) { energyModal(closeModal, true); return; }
  setup(mode, mode === 'stage' ? store.unlocked : 1);
}
function setup(mode: Mode, stage: number) {
  // Download the engine during preparation instead of blocking the homepage.
  void loadBoardModule().catch(() => {});
  run = null; setupMode = mode; setupStage = stage;
  if (!draft || draft.mode !== mode || draft.stage !== stage) {
    draft = { id: crypto.randomUUID(), mode, stage, step: 'blessing', blessing: null, pick: 0, lucky: [], cards: 20, cardAds: 0 };
  }
  selectedBlessing = draft.blessing; chosen = [...draft.lucky];
  if (selectedBlessing && draft.step === 'cards') { cardSetup(); return; }
  if (selectedBlessing && draft.step === 'lucky') { luckySetup(); return; }
  const previous = selectedBlessing ? blessing(selectedBlessing) : null;
  draft.blessingPack = restoreBlessingPackState(draft.blessingPack, selectedBlessing);
  updatePreparation();
  screen('setup'); closeModal();
  $('setup').classList.add('blessing-pack-screen');
  $('setup').innerHTML = `<header class="setup-header"><button id="setup-back" class="icon-button" aria-label="返回首页">‹</button><span>${mode === 'stage' ? `第 ${stage} 关 · 出发准备` : '无限模式 · 出发准备'}</span><span class="small-step">01 / 03</span></header>
   <div class="setup-title"><div class="blessing-heading-meta"><button id="blessing-info" class="blessing-info-button"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5m0-8v.1"/></svg>祝福介绍</button></div><h1>拆一份<span>${universe().copy.blessing}</span></h1></div>
   <div id="blessing-pack-root"></div>`;
  $('setup-back').onclick = () => confirmEndRun();
  $('blessing-info').onclick = blessingInfoModal;
  disposeBlessingPack = mountBlessingPack($('blessing-pack-root'), {
    state: draft.blessingPack,
    previous: previous ? { info: previous, pick: draft!.pick } : null,
    onPick: index => {
      selectedBlessing = BLESSINGS[index].id;
      chosen = chosen.slice(0, selectedBlessing === 'wish' ? 2 : 1);
      draft!.pick = index; updatePreparation();
      return blessing(selectedBlessing);
    },
    onStateChange: updatePreparation,
    requestChoiceAd: () => requestAdReward('blessing'),
    onContinue: () => { draft!.step = 'lucky'; updatePreparation(); luckySetup(); },
    soundEnabled: store.sound,
    soundController: cardSounds.packSound,
    onButtonClick: cardSounds.click,
    mobileEffects: import.meta.env.DEV && new URLSearchParams(location.search).has('previewMobileEffects') ? true : undefined,
    theme: universe(),
  });
}

function luckySetup() {
  if (!selectedBlessing) return;
  screen('setup'); closeModal();
  const wanted = selectedBlessing === 'wish' ? 2 : 1;
  $('setup').innerHTML = `<header class="setup-header"><button id="setup-back" class="icon-button" aria-label="返回祝福">‹</button><span>${blessing(selectedBlessing).name}</span><span class="small-step">02 / 03</span></header><div class="setup-title lucky-title"><span class="section-chip">许下你的心愿</span><h1>选择<span>幸运${universe().copy.subject}</span></h1><p>选择 ${wanted} 种，翻出它就能获得奖励卡</p></div>
  <div class="planet-selection">${universe().characters.map((p, i) => `<button data-planet="${i}" class="planet-option${chosen.includes(i) ? ' selected' : ''}" aria-pressed="${chosen.includes(i)}"><img src="${asset(i)}" alt="${p.name}"><span>${p.name}</span><i>✓</i></button>`).join('')}</div><p class="lucky-selection-note">九种${universe().copy.subject}出现机会相同，每种均为 1/9</p><button id="lucky-confirm" class="wide-button"${chosen.length === wanted ? '' : ' disabled'}>${chosen.length === wanted ? '下一步 · 选择起始牌' : `请选择 ${wanted} 种幸运${universe().copy.subject}`}</button>`;
  $('setup-back').onclick = () => { draft!.step = 'blessing'; updatePreparation(); setup(setupMode, setupStage); };
  document.querySelectorAll<HTMLButtonElement>('[data-planet]').forEach(b => b.onclick = () => {
    const type = Number(b.dataset.planet);
    if (chosen.includes(type)) chosen = chosen.filter(x => x !== type);
    else { if (chosen.length >= wanted) chosen.shift(); chosen.push(type); }
    document.querySelectorAll<HTMLButtonElement>('[data-planet]').forEach(el => { const active = chosen.includes(Number(el.dataset.planet)); el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
    const confirm = $<HTMLButtonElement>('lucky-confirm'); confirm.disabled = chosen.length !== wanted;
    confirm.textContent = chosen.length === wanted ? '下一步 · 选择起始牌' : `请选择 ${wanted} 种幸运${universe().copy.subject}`;
    updatePreparation();
  });
  $('lucky-confirm').onclick = () => {
    draft!.step = 'cards'; updatePreparation(); cardSetup();
  };
}
function updatePreparation() {
  if (!draft) return;
  draft.blessing = selectedBlessing; draft.lucky = [...chosen];
}
function cardSetup() {
  if (!draft || !selectedBlessing) return;
  refreshDay(store); updatePreparation(); screen('setup'); closeModal();
  const required = cardAdsRequired(draft.cards, store);
  const adsLeft = required === null ? 0 : Math.max(0, required - draft.cardAds);
  const bonus = selectedBlessing === 'gift' ? 20 : 0;
  const total = draft.cards + bonus;
  $('setup').innerHTML = `<header class="setup-header"><button id="setup-back" class="icon-button" aria-label="返回幸运${universe().copy.subject}">‹</button><span>${setupMode === 'stage' ? `第 ${setupStage} 关 · 出发准备` : '无限模式 · 出发准备'}</span><span class="small-step">03 / 03</span></header>
  <div class="setup-title pack-title"><span class="section-chip">准备好你的快乐行囊</span><h1>选择<span>起始牌</span></h1><p>每局重新选择，带着喜欢的祝福出发</p></div>
  <div class="pack-status"><div class="pack-lucky"><span>幸运</span>${chosen.map(i => `<img src="${asset(i)}" alt="${universe().characters[i].name}">`).join('')}</div>${energyBadge()}</div>
  <div class="pack-options">${CARD_TIERS.map(tier => {
    const cost = cardAdsRequired(tier, store);
    const left = cost === null ? 0 : Math.max(0, cost - draft!.cardAds);
    const label = cost === null ? `补体力广告 ${store.energyAds}/3 解锁` : left ? `观看 ${left} 次广告${store.infinite ? '' : ' · 1 体力'}` : store.infinite ? '今日无限体力开启' : '消耗 1 点体力';
    return `<button class="pack-option tier-${tier}${tier === draft!.cards ? ' selected' : ''}${cost === null ? ' pack-locked' : ''}" data-tier="${tier}" aria-pressed="${tier === draft!.cards}"><span class="pack-tag">${cost === null ? '待解锁' : tier === 20 ? '基础' : tier === 30 ? '今日已解锁' : `${cost} 次广告`}</span><span class="pack-art"><img src="${cardBack()}" alt=""><img src="${cardBack()}" alt=""><img src="${cardBack()}" alt=""></span><strong>${tier}<small> 张</small></strong><span class="pack-cost">${label}</span></button>`;
  }).join('')}</div><div class="pack-total">${bonus ? `<span>启程赠礼 <b>+20</b></span><strong>本局共 ${total} 张</strong>` : `<span>${blessing(selectedBlessing).name}</span><strong>本局 ${total} 张</strong>`}</div>
  <button id="pack-start" class="wide-button">${required === null ? `补充体力，解锁 30 张 · ${store.energyAds}/3` : adsLeft ? `再看 ${adsLeft} 次广告 · ${total} 张出发` : `${total} 张出发 · ${store.infinite ? '今日无限体力' : '消耗 1 体力'}`}</button>
  <p class="pack-footnote">${draft.cardAds ? `本次已完成 ${draft.cardAds} 次选牌广告，进度已保留<br>` : ''}选牌与续局广告不计入补体力的 3 次进度</p>`;
  $('setup-back').onclick = () => { draft!.step = 'lucky'; updatePreparation(); luckySetup(); };
  document.querySelectorAll<HTMLButtonElement>('[data-tier]').forEach(b => b.onclick = () => { draft!.cards = Number(b.dataset.tier) as CardTier; updatePreparation(); cardSetup(); });
  $('pack-start').onclick = startCards;
  updateEnergyUI();
}
function startCards() {
  if (!draft || !selectedBlessing) return;
  refreshDay(store); updatePreparation();
  const required = cardAdsRequired(draft.cards, store);
  if (required === null) { energyModal(cardSetup); return; }
  if (!canSpendEnergy(store)) { energyModal(cardSetup, true); return; }
  if (draft.cardAds < required) {
    void withAdReward('cards', () => {
      draft!.cardAds++; updatePreparation(); cardSetup();
      if (draft!.cardAds >= required) startCards();
      else toast('已完成 1 次选牌广告，再看 1 次即可出发');
    });
    return;
  }
  const prepared = createRun(setupMode, setupStage, selectedBlessing, chosen, draft.cards);
  if (!spendEnergy(store)) { energyModal(cardSetup, true); return; }
  run = prepared; draft = null; saveStore(store); updateEnergyUI(); void enterGame();
}
async function enterGame() {
  const current = run!;
  const opening = current.status === 'ready' && !current.started && !openingRuns.has(current);
  screen('game-screen'); closeModal(); setBusy(true);
  const before = structuredClone(current);
  if (opening) before.remaining = 0;
  updateHud(before);
  try {
    if (!gameReady) {
      message('正在准备棋盘…');
      const {createBoard} = await loadBoardModule();
      gameReady = createBoard($('phaser-board'));
    }
    scene = (await gameReady).scene;
    scene.setTheme(universe());
    scene.render(current);
    message(universe().copy.welcome);
    if (opening) {
      openingRuns.add(current);
      const total = current.remaining;
      // Paint the newly mounted board before measuring its star and deck.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const visuals: Promise<unknown>[] = [returnCards(total, '起始牌', rewardPoint(), true, () => {
        before.remaining = Math.min(total, before.remaining + 1);
        display = structuredClone(before);
        $('remaining').textContent = `剩余 ${before.remaining} 张`;
      }, {opening: true})];
      if (current.blessing === 'gift' && !current.giftShown) {
        current.giftShown = true;
        visuals.push(triggerEffect({blessing: 'gift', amount: current.giftBonus ?? 20, kind: 'opening'}));
      }
      await Promise.allSettled(visuals);
      message('起始牌已就位，可以开始发牌');
    }
  } catch (error) {
    console.error('Board failed to load', error);
    modal(`${heading('✧', '棋盘暂未准备好', '网络可能有些慢，请重试继续本局')}<button class="wide-button" id="board-load-retry">重新加载</button>`);
    $('board-load-retry').onclick = () => { void enterGame(); };
    return;
  } finally { updateHud(run!); setBusy(false); }
  updateEnergyUI();
  if (run!.status !== 'ready') endModal();
}
function updateHud(state: Run) {
  display = structuredClone(state);
  $('game-mode').textContent = state.mode === 'stage' ? universe().copy.journey : '无限挑战';
  $('stage-kicker').textContent = state.mode === 'stage' ? `收集${universe().copy.subject}，开启下一关` : '每一次相遇，都是新纪录';
  $('stage-title').textContent = state.mode === 'stage' ? `第 ${state.stage} 关` : '无限模式';
  $('score-name').textContent = state.mode === 'stage' ? '收集进度' : '本局已收集';
  $('score-value').innerHTML = state.mode === 'stage' ? `${Math.min(state.score, state.target)} <i>/ ${state.target}</i>` : `${state.score} <i>${universe().copy.unit}</i>`;
  $('progress-track').hidden = state.mode === 'endless'; $('best-label').hidden = true;
  $('progress-fill').style.width = Math.min(100, state.score / state.target * 100) + '%';
  $('remaining').textContent = `剩余 ${state.remaining} 张`;
  $('lucky-badge').innerHTML = `<span>幸运</span>${state.lucky.map(x => `<img src="${asset(x)}" alt="${universe().characters[x].name}">`).join('')}`;
  $('blessing-badge').innerHTML = `<span class="blessing-icon" aria-hidden="true">${blessing(state.blessing).symbol}</span><span class="blessing-name">${blessing(state.blessing).name}</span>`;
}
function setBusy(value: boolean) {
  busy = value; $<HTMLButtonElement>('deal').disabled = value || run?.status !== 'ready';
  $<HTMLButtonElement>('game-back').disabled = value;
  $<HTMLButtonElement>('manual').disabled = value; $<HTMLButtonElement>('automatic').disabled = value;
  $('game-screen').querySelectorAll<HTMLButtonElement>('[data-energy]').forEach(b => { b.disabled = value; });
  $('deal-label').textContent = value ? `${universe().copy.subject}相遇中…` : '发牌';
}
function message(text: string) {
  const index = PLANETS.findIndex(character => character.name === text);
  $('event-message').textContent = index >= 0 ? universe().characters[index].name : text.replaceAll('星球', universe().copy.subject);
}
const delay = (ms: number) => new Promise<void>(r => window.setTimeout(r, ms));
function slotPoint(slot: number) {
  if (slot < 0) { const b = $('bonus-card').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
  const rect = $('phaser-board').querySelector('canvas')!.getBoundingClientRect();
  return { x: rect.x + (60 + slot % 3 * 120) / 360 * rect.width, y: rect.y + (58 + Math.floor(slot / 3) * 120) / 360 * rect.height };
}
function elementPoint(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
function rewardPoint() { return elementPoint(document.querySelector<HTMLElement>('.board-jewel')!); }
const HIDDEN_CHANCE = .01;
const HIDDEN_MAX_FRAGMENTS = 30;
const DEBUG_HIDDEN = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && new URLSearchParams(location.search).has('debugHidden');
let debugHiddenUsed = false;
type ScreenPoint = { x: number; y: number };

let hiddenTeaser: { element: HTMLElement; origin: ScreenPoint } | null = null;

function showHiddenTeaser(slot: number) {
  hiddenTeaser?.element.remove();
  const origin = slotPoint(slot);
  const teaser = document.createElement('div');
  teaser.className = 'hidden-teaser'; teaser.setAttribute('aria-hidden', 'true');
  teaser.innerHTML = `<img src="${universe().hiddenPack}" alt=""><i>✦</i>`;
  teaser.style.left = `${origin.x}px`; teaser.style.top = `${origin.y}px`;
  document.body.appendChild(teaser); hiddenTeaser = { element: teaser, origin };
}

async function hiddenChallenge(origin?: ScreenPoint): Promise<number> {
  const device = $('device');
  const layer = document.createElement('div');
  layer.className = 'hidden-challenge';
  layer.style.setProperty('--slice-glow', universe().pack.highlight);
  layer.innerHTML = `<div class="hidden-challenge-card" role="dialog" aria-label="隐藏款切包挑战">
    <div class="hidden-challenge-kicker">✦ 意外相遇</div>
    <h2>发现隐藏款</h2>
    <p>快速划开${universe().copy.pack}，切出的碎片越多，奖励越多</p>
    <div class="hidden-challenge-stage"><svg class="hidden-slashes" aria-hidden="true"></svg><div class="hidden-pack"><img src="${universe().hiddenPack}" alt="${universe().copy.pack}"></div><div class="hidden-count">切出 <b>0</b> 片</div><div class="hidden-timer"><i></i><b>准备</b></div></div>
    <div class="hidden-challenge-hint">每片 +1 包 · 最多 30 包</div>
  </div>`;
  device.appendChild(layer);
  const stage = layer.querySelector<HTMLElement>('.hidden-challenge-stage')!;
  const pack = layer.querySelector<HTMLElement>('.hidden-pack')!;
  const svg = layer.querySelector<SVGSVGElement>('.hidden-slashes')!;
  const countText = layer.querySelector<HTMLElement>('.hidden-count b')!;
  const timerText = layer.querySelector<HTMLElement>('.hidden-timer b')!;
  const timerFill = layer.querySelector<HTMLElement>('.hidden-timer i')!;
  const slices = new HiddenSlices(HIDDEN_MAX_FRAGMENTS);
  const visual = new HiddenPackVisual(pack, svg);
  let fragments = 0;
  let activePointer: number | null = null;
  let cutStart: ScreenPoint | null = null;
  let previousPoint: ScreenPoint | null = null;
  let finished = false;
  let timer = 0;
  let started = false;
  let resolveResult!: (value: number) => void;
  const result = new Promise<number>(resolve => { resolveResult = resolve; });
  const startedAt = { value: 0 };
  const stageRect = stage.getBoundingClientRect();
  pack.style.transform = 'translate3d(-50%,-50%,0)';
  if (origin) {
    const from = { x: origin.x - stageRect.left, y: origin.y - stageRect.top };
    const center = { x: stage.clientWidth / 2, y: stage.clientHeight * .46 };
    pack.style.left = `${from.x}px`; pack.style.top = `${from.y}px`; pack.style.transform = 'translate3d(-50%,-50%,0) scale(.42)';
    // Let the overlay paint once before measuring/animating the pack. This
    // avoids the backdrop, layout, and transform all competing in one frame.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(async () => {
      const animation = pack.animate([
        { left: `${from.x}px`, top: `${from.y}px`, transform: 'translate3d(-50%,-50%,0) scale(.42) rotate(-8deg)', opacity: .65 },
        { left: `${from.x + (center.x - from.x) * .35}px`, top: `${from.y + (center.y - from.y) * .35}px`, transform: 'translate3d(-50%,-50%,0) scale(.68) rotate(-4deg)', opacity: .86, offset: .35 },
        { left: `${from.x + (center.x - from.x) * .72}px`, top: `${from.y + (center.y - from.y) * .72}px`, transform: 'translate3d(-50%,-50%,0) scale(.92) rotate(-1deg)', opacity: 1, offset: .72 },
        { left: `${center.x}px`, top: `${center.y}px`, transform: 'translate3d(-50%,-50%,0) scale(1) rotate(0deg)', opacity: 1 },
      ], { duration: 520, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
      await animation.finished;
      animation.cancel();
      pack.style.left = `${center.x}px`; pack.style.top = `${center.y}px`; pack.style.transform = 'translate3d(-50%,-50%,0)'; resolve();
    })));
  }
  beep('hidden');
  const toLocal = (event: PointerEvent): ScreenPoint => {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const packBounds = (): CutBounds => {
    const rect = pack.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect();
    return {left: rect.left - stageRect.left, right: rect.right - stageRect.left, top: rect.top - stageRect.top, bottom: rect.bottom - stageRect.top};
  };
  // Ignore the asset's transparent outer padding when detecting a hit, while
  // cutting/rendering in the full image coordinates so every seam stays aligned.
  const packHitBounds = (): CutBounds => {
    const bounds = packBounds(), insetX = (bounds.right - bounds.left) * .1, insetY = (bounds.bottom - bounds.top) * .05;
    return {left: bounds.left + insetX, right: bounds.right - insetX, top: bounds.top + insetY, bottom: bounds.bottom - insetY};
  };
  const insidePack = (point: ScreenPoint, bounds = packHitBounds()) => point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
  const addSlash = (from: ScreenPoint, to: ScreenPoint) => {
    if (fragments >= HIDDEN_MAX_FRAGMENTS) return;
    const bounds = packBounds();
    const cut = packCutLine(from, to, bounds);
    if (!cut) return;
    const normalize = (p: ScreenPoint) => ({x: (p.x - bounds.left) / (bounds.right - bounds.left), y: (p.y - bounds.top) / (bounds.bottom - bounds.top)});
    const fromPack = normalize(cut.from), toPack = normalize(cut.to);
    if (!slices.cut(fromPack, toPack)) return;
    visual.cut(slices.polygons, fromPack, toPack);
    fragments = slices.reward; countText.textContent = String(slices.count); beep('slice');
  };
  const finish = async () => {
    if (finished) return;
    finished = true; window.clearInterval(timer);
    layer.classList.add('hidden-complete');
    timerText.textContent = '完成'; timerFill.style.width = '0%';
    const headline = layer.querySelector<HTMLElement>('.hidden-challenge-kicker')!;
    headline.textContent = fragments ? `✦ 切出 ${slices.count} 片` : '✦ 错过隐藏款';
    layer.querySelector<HTMLElement>('.hidden-challenge-hint')!.textContent = fragments ? `获得 ${fragments} 包奖励` : '下次翻牌还会再遇见';
    if (activePointer !== null && stage.hasPointerCapture(activePointer)) stage.releasePointerCapture(activePointer);
    activePointer = null; cutStart = null; previousPoint = null;
    try {
      if (fragments) { beep('reward'); await visual.breakApart(); }
      else await pack.animate([{opacity: 1}, {opacity: 0}], {duration: 280, fill: 'forwards'}).finished;
    } catch { /* A cancelled visual must still deliver the computed reward. */ }
    finally { visual.destroy(); layer.remove(); resolveResult(fragments); }
  };
  const startChallenge = () => {
    if (started || finished) return;
    started = true; startedAt.value = performance.now(); layer.classList.add('hidden-started');
    layer.querySelector<HTMLElement>('.hidden-challenge-hint')!.textContent = '每片 +1 包 · 最多 30 包';
    timer = window.setInterval(() => {
      const left = Math.max(0, 3000 - (performance.now() - startedAt.value));
      timerText.textContent = (left / 1000).toFixed(1);
      timerFill.style.width = `${left / 30}%`;
      if (!left) void finish();
    }, 40);
  };
  const onDown = (event: PointerEvent) => {
    if (finished || activePointer !== null || event.button !== 0) return;
    startChallenge();
    const point = toLocal(event);
    event.preventDefault();
    activePointer = event.pointerId; previousPoint = point; cutStart = insidePack(point) ? point : null; stage.setPointerCapture?.(event.pointerId);
  };
  const consumeStroke = (point: ScreenPoint) => {
    if (!previousPoint) return;
    const bounds = packHitBounds();
    const hit = clipCutSegment(previousPoint, point, bounds);
    if (hit) {
      cutStart ??= hit.from;
      if (!insidePack(point, bounds)) {
        if (Math.hypot(hit.to.x - cutStart.x, hit.to.y - cutStart.y) >= 18) addSlash(cutStart, hit.to);
        cutStart = null;
      }
    }
    previousPoint = point;
  };
  const onMove = (event: PointerEvent) => {
    if (activePointer !== event.pointerId || finished) return;
    event.preventDefault(); consumeStroke(toLocal(event));
  };
  const onUp = (event: PointerEvent) => {
    if (activePointer !== event.pointerId) return;
    event.preventDefault();
    if (!finished && event.type === 'pointerup') consumeStroke(toLocal(event));
    activePointer = null; cutStart = null; previousPoint = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener('pointerdown', onDown, { passive: false });
  stage.addEventListener('pointermove', onMove, { passive: false });
  stage.addEventListener('pointerup', onUp, { passive: false });
  stage.addEventListener('pointercancel', onUp, { passive: false });
  stage.addEventListener('lostpointercapture', onUp);
  layer.querySelector<HTMLElement>('.hidden-challenge-hint')!.textContent = '点击或滑动开始切包';
  return result;
}
async function resolvePendingHidden() {
  if (!run?.pendingHidden) return;
  const consumedSlot = run.hiddenSlot;
  const origin = hiddenTeaser?.origin ?? (consumedSlot === undefined ? rewardPoint() : slotPoint(consumedSlot));
  hiddenTeaser?.element.remove(); hiddenTeaser = null;
  const fragments = await hiddenChallenge(origin);
  // The hidden pack replaces the planet card that revealed it. Once the
  // challenge is over, release that board slot so the next deal can refill it.
  if (consumedSlot !== undefined) run.board[consumedSlot] = null;
  run.pendingHidden = false; run.hiddenSlot = undefined;
  if (!fragments) { message('隐藏款没有切开'); updateHud(run); return; }
  run.remaining += fragments; updateHud(run);
  const rewardOrigin = rewardPoint();
  await Promise.all([
    triggerEffect({ blessing: null, amount: fragments, kind: 'opening', title: '隐藏款奖励', origin: rewardOrigin }),
    returnCards(fragments, '隐藏款', rewardOrigin),
  ]);
  updateHud(run);
}
async function dealCard(slot: number, type: number, reveal = true) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if (reveal) await scene.reveal(slot, type, () => cardSounds.flip(slot)); return; }
  const deck = document.querySelector<HTMLElement>('.tiny-deck img:last-child')!.getBoundingClientRect();
  const board = $('phaser-board').querySelector('canvas')!.getBoundingClientRect();
  const size = board.width * 108 / 360;
  const start = { x: deck.x + deck.width / 2, y: deck.y + deck.height / 2 };
  const end = slotPoint(slot);
  const card = document.createElement('img');
  card.src = cardBack(); card.alt = ''; card.className = 'dealing-card'; card.setAttribute('aria-hidden', 'true');
  card.style.width = card.style.height = `${size}px`;
  document.body.appendChild(card);
  const pose = (x: number, y: number, scale: number, angle: number) =>
    `translate3d(${x - size / 2}px,${y - size / 2}px,0) rotate(${angle}deg) scale(${scale})`;
  try {
    await card.animate([
      { transform: pose(start.x, start.y, .3, -12), opacity: .9 },
      { transform: pose(start.x + (end.x - start.x) * .6, start.y + (end.y - start.y) * .65, .78, 5), opacity: 1, offset: .55 },
      { transform: pose(end.x, end.y, 1, 0), opacity: 1 },
    ], { duration: 360, easing: 'cubic-bezier(.22,.65,.3,1)', fill: 'both' }).finished;
    // Hand the landed card to Phaser before removing the flight overlay.
    const revealAnimation = reveal ? scene.reveal(slot, type, () => cardSounds.flip(slot)) : Promise.resolve();
    card.remove();
    await revealAnimation;
  } finally { card.remove(); }
}
async function fly(source: { x: number; y: number }, target: HTMLElement, type: number | 'back', index = 0, stagger = true) {
  const box = target.getBoundingClientRect();
  const node = document.createElement('img'); node.src = type === 'back' ? cardBack() : asset(type);
  node.className = `flying-card${type === 'back' ? ' reward-return' : ' collection-flight'}`;
  node.style.opacity = '0'; document.body.appendChild(node);
  const endX = box.x + box.width / 2, endY = box.y + box.height / 2;
  try {
    await node.decode().catch(() => {});
    await node.animate([
    { left: source.x + 'px', top: source.y + 'px', transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
    { left: (source.x + (endX - source.x) * .55 + ((stagger ? index : index % 3) - .5) * 24) + 'px', top: (source.y + (endY - source.y) * .4) + 'px', transform: 'translate(-50%,-50%) scale(.7)', opacity: 1, offset: .5 },
    { left: endX + 'px', top: endY + 'px', transform: 'translate(-50%,-50%) scale(.22)', opacity: .3 },
  ], { duration: 440, delay: stagger ? index * 45 : 0, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).finished; }
  finally { node.remove(); }
}
async function materializeRewardCard(origin: { x: number; y: number }) {
  const layer = document.createElement('div');
  layer.className = 'reward-materialize'; layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `<span class="reward-materialize-star">✧</span><img src="${cardBack()}" alt="">`;
  const card = layer.querySelector<HTMLImageElement>('img')!;
  layer.style.left = `${origin.x}px`; layer.style.top = `${origin.y}px`;
  document.body.appendChild(layer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    await Promise.all([
      layer.querySelector<HTMLElement>('.reward-materialize-star')!.animate(
        reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5) rotate(-20deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.2) rotate(0deg)', offset: .45 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.8)' }],
        { duration: reduced ? 120 : 330, fill: 'both', easing: 'ease-out' }).finished,
      card.animate(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.25) rotate(-8deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.04) rotate(0deg)', offset: .65 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }],
        { duration: reduced ? 120 : 360, fill: 'both', easing: 'cubic-bezier(.2,.7,.3,1)' }).finished,
    ]);
  } catch { /* A cancelled visual does not affect the reward state. */ }
  layer.remove();
}
function triggerEffect(effect: RewardEffect) {
  if (effect.kind !== 'settle') beep(effect.kind === 'clear' ? 'blessing-clear' : 'blessing');
  return showRewardEffect(effect);
}
async function returnCards(count: number, label: string, origin?: { x: number; y: number }, sound = true, onArrival?: () => void, options: {opening?: boolean} = {}) {
  if (!count) return;
  const start = origin || rewardPoint();
  message(options.opening ? `${label} · ${count} 张入堆` : `${label} · 奖励 +${count} 张`);
  // Each reward is a visible card. A short stagger keeps the stream readable
  // for +2, +5 and the +10 continuation reward without blocking the UI.
  const stagger = options.opening ? Math.min(48, 1000 / Math.max(1, count - 1)) : 90;
  let lastSoundAt = -Infinity;
  const flights = Array.from({ length: count }, async (_, index) => {
    await delay(index * stagger);
    if (!options.opening) await materializeRewardCard(start);
    await fly(start, $('deal'), 'back', index, false);
    onArrival?.();
    if (sound) {
      const now = performance.now();
      if (!options.opening || now - lastSoundAt >= 100 || index === count - 1) { lastSoundAt = now; beep('reward'); }
    }
  });
  if (options.opening) await Promise.allSettled(flights);
  else await Promise.all(flights);
  $('deal').classList.remove('reward-pop'); void $('deal').offsetWidth; $('deal').classList.add('reward-pop');
}
async function playEvent(event: GameEvent, settlement?: SettlementPlayback<Run>) {
  if (event.kind === 'draw') {
    const slot = event.slots[0]; message(slot >= 0 ? `${universe().copy.subject}正在抵达…` : event.label);
    if (slot >= 0) await dealCard(slot, event.cards[0], !event.hidden);
    else {
      const type = event.cards[0], front = scene.cardArtwork(type);
      $('bonus-card').hidden = false; $('bonus-card').innerHTML = `<img src="${cardBack()}" alt="">`;
      await animateCardFlip($('bonus-card').getBoundingClientRect(), front, universe().characters[type].color, () => cardSounds.flip(-1), cardBack());
      $('bonus-card').innerHTML = `<img src="${front}" alt="免费翻开的${universe().characters[type].name}">`;
    }
    message(event.label);
    const before = structuredClone(event.state); before.remaining -= event.reward;
    if (settlement) settlement.show(before); else updateHud(before);
    if (event.hidden) {
      run!.pendingHidden = true; run!.hiddenSlot = slot;
      scene.hide([slot]);
      showHiddenTeaser(slot);
      message('发现隐藏款，满盘结算时开启');
    }
    if (event.reward) {
      // Lucky rewards are born at the lucky planet itself. Keep the source
      // shared by the highlight and the card flight so both visuals line up.
      const luckyOrigin = slotPoint(slot);
      await Promise.all([
        triggerEffect({ blessing: event.blessingReward ? event.state.blessing : null, amount: event.reward, kind: 'lucky', origin: luckyOrigin }),
        returnCards(event.reward, '幸运', luckyOrigin),
      ]);
    }
    if (settlement) settlement.show(event.state); else updateHud(event.state);
    return;
  }
  if (event.kind === 'remove') {
    message(`${event.label}！收集 +${event.cards.length}`); beep(event.label.startsWith('三连') ? 'triple' : 'pair');
    await scene.highlight(event.slots);
    const rewardOrigin = rewardPoint();
    const playback = settlement ?? new SettlementPlayback(event.state, updateHud);
    playback.track(triggerEffect({ blessing: event.blessingReward ? event.state.blessing : null, amount: event.reward, kind: 'settle', title: event.label.split(' · ')[0] }));
    const points = event.slots.map(slotPoint); scene.hide(event.slots);
    // Only collection blocks the next group. Reward flights continue beside it.
    await Promise.all(points.map((p, i) => fly(p, $('score-target'), event.cards[i], i)));
    $('bonus-card').hidden = true;
    playback.returnCards(event.state, event.reward, onArrival => returnCards(event.reward, event.label, rewardOrigin, true, onArrival));
    if (!settlement) await playback.finish();
    return;
  }
  message(universe().copy.clear);
  const rewardOrigin = rewardPoint();
  const playback = settlement ?? new SettlementPlayback(event.state, updateHud);
  if (event.blessingReward) playback.track(triggerEffect({ blessing: event.state.blessing, amount: event.blessingReward, kind: 'clear' }));
  playback.returnCards(event.state, event.reward, onArrival => returnCards(event.reward, event.label, rewardOrigin, true, onArrival));
  if (!settlement) await playback.finish();
}
async function playSettlement(events: GameEvent[]) {
  const playback = new SettlementPlayback(display ?? run!, updateHud);
  try {
    for (const event of events) await playEvent(event, playback);
  } finally {
    // Inputs and result dialogs stay blocked until every reward lands, even
    // when a visual fails and the caller needs to restore the final board.
    await playback.finish();
  }
}
async function deal() {
  if (!run || busy || run.status !== 'ready') return;
  refreshDay(store);
  setBusy(true);
  try {
    do {
      const event = drawOne(run);
      const hiddenChance = HIDDEN_CHANCE / (2 ** (run.hiddenCount ?? 0));
      if (event.kind === 'draw' && event.slots[0] >= 0 && !run.pendingHidden && ((DEBUG_HIDDEN && !debugHiddenUsed) || Math.random() < hiddenChance)) {
        event.hidden = true; debugHiddenUsed = true;
      }
      if (event.hidden) {
        run.pendingHidden = true; run.hiddenSlot = event.slots[0];
        run.hiddenCount = (run.hiddenCount ?? 0) + 1;
      } await playEvent(event);
      if (needsSettlement(run)) {
        // Let the full board breathe for a moment after the final flip so the
        // player can read the nine planets before the resolution animation starts.
        if (run.board.every(card => card !== null)) {
          message(`${universe().copy.subject}相遇，开始结算…`);
          await delay(320);
        }
        await resolvePendingHidden();
        const events = settle(run); record();
        await playSettlement(events);
        // Settlement animations already keep the Phaser board in sync. A
        // second full render here would resurrect a visually consumed hidden
        // pack slot after its reward animation finishes.
        updateHud(run); break;
      }
    } while (automatic);
    record();
  } catch (error) {
    console.error(error);
    if (needsSettlement(run)) settle(run);
    record(); scene.render(run); updateHud(run); message('动画已恢复，可以继续发牌');
  }
  if (run.status !== 'ready') {
    // Let the final board state remain visible briefly before the result card
    // arrives, matching the pause used before full-board settlement.
    message(run.status === 'won' ? `${universe().copy.subject}已收集完成…` : '本轮结算完成…');
    await delay(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 280);
    setBusy(false);
    endModal();
  } else {
    setBusy(false);
    message(automatic ? '本轮已完成，点击发牌继续' : `继续翻开下一张${universe().copy.subject}卡`);
  }
}
function record() {
  if (!run) return;
  if (run.mode === 'endless') store.endlessBest = Math.max(store.endlessBest, run.score);
  if (run.status === 'won') { store.cleared = Math.max(store.cleared, run.stage); store.unlocked = Math.max(store.unlocked, run.stage + 1); }
  saveStore(store);
}
function clearCurrentSession() {
  run = null; display = null; draft = null; selectedBlessing = null; chosen = [];
  automatic = true; setupStage = 1; busy = false;
  if (scene) scene.clear();
  hiddenTeaser?.element.remove(); hiddenTeaser = null;
  $('bonus-card').hidden = true; $('bonus-card').innerHTML = '';
  $('score-value').innerHTML = '0 <i>/ 50</i>'; $('progress-fill').style.width = '0%';
  $('remaining').textContent = '剩余 0 张';
  $('blessing-announcement').textContent = '';
  $('automatic').classList.add('active'); $('manual').classList.remove('active');
  $('mode-hint').textContent = '点一次完成一轮，结算后再次点击';
}
function confirmEndRun() {
  if (busy) return;
  modal(`${heading('✧', '是否结束本局？', '结束后，本局进度将清零')}<div class="two-actions"><button id="end-session-no">否，继续本局</button><button id="end-session-yes" class="accent">是，结束本局</button></div>`);
  $('end-session-no').onclick = closeModal;
  $('end-session-yes').onclick = () => { clearCurrentSession(); home(); };
}
function endModal() {
  if (!run) return;
  if (run.status === 'won') {
    beep('win');
    modal(`${heading('♛', '胜利！', `第 ${run.stage} 关已完成，新的旅程正在等你`)}<div class="result-score"><small>收集完成</small><strong>${run.target}<i> / ${run.target}</i></strong></div><div class="triple-actions"><button id="result-rank">查看排行榜</button><button id="result-home">返回</button><button id="result-next" class="accent">下一关</button></div>`);
    $('result-rank').onclick = () => rankModal('stage', endModal);
    $('result-home').onclick = () => { clearCurrentSession(); home(); };
    $('result-next').onclick = () => { const stage = run!.stage + 1; clearCurrentSession(); setup('stage', stage); }; return;
  }
  modal(`${heading('✧', run.mode === 'endless' ? '这次，收获满满' : '再遇见一点好运', run.mode === 'endless' ? '下一次，还会遇见更多小惊喜' : '卡牌用完了，你的下一次相遇就在前方')}<div class="result-score"><small>本局已收集</small><strong>${run.score}<i>${run.mode === 'endless' ? ' ' + universe().copy.unit : ' 张'}</i></strong></div><div class="result-details"><span>对碰 ${run.pairs} 次</span><span>三连 ${run.triples} 次</span></div>${!run.usedAd ? '<button class="wide-button" id="continue-ad">▶ 看广告，继续 +10 张</button><small class="demo-note">每局限一次</small>' : '<p class="demo-note">本局续局机会已使用</p>'}<div class="two-actions"><button id="end-home">返回首页</button><button id="end-retry" class="accent">${run.mode === 'stage' ? '再试本关' : '再来一局'}</button></div>${run.mode === 'endless' ? '<button class="plain-link" id="end-rank">查看无限榜</button>' : ''}`);
  if (!run.usedAd) $('continue-ad').onclick = () => withAdReward('continue', async () => {
    if (!continueRun(run!)) return; closeModal(); updateHud(run!); setBusy(true);
    const origin = rewardPoint();
    await Promise.all([
      triggerEffect({ blessing: null, amount: 10, kind: 'opening', title: '续航补给', origin }),
      returnCards(10, '续航补给', origin),
    ]);
    setBusy(false); message('获得 10 张卡，继续你的旅程');
  });
  $('end-home').onclick = () => confirmEndRun();
  $('end-retry').onclick = () => {
    const { mode, stage } = run!; clearCurrentSession();
    if (mode === 'endless') { home(); startMode(mode); } else setup(mode, stage);
  };
  if (run.mode === 'endless') $('end-rank').onclick = () => rankModal('endless', endModal);
}
function rankModal(mode: Mode, onClose = closeModal) {
  modal(`${heading(mode === 'stage' ? '♛' : '∞', mode === 'stage' ? '闯关榜' : '无限榜', mode === 'stage' ? '按成功通过的最高关卡排名' : '按无限模式单局收集数量排名')}<div class="empty-rank"><span>✧</span><h3>等待第一份好成绩</h3><p>全球榜单尚未开放<br>你的个人纪录已保存在本机</p></div><p class="local-best">我的纪录：${mode === 'stage' ? store.cleared + ' 关' : store.endlessBest + ' ' + universe().copy.unit}</p><button class="wide-button" id="rank-close">返回</button>`);
  $('rank-close').onclick = onClose;
}
function rulesModal() {
  modal(`${heading('✦', `${universe().copy.subject}相遇指南`, '翻开卡片，收集属于你的好运')}<div class="rules-list"><p><b>相同就对碰</b><span>全盘两张相同${universe().copy.subject}，收集 2 张，奖励 1 张。</span></p><p><b>横竖三连</b><span>优先消除成行或成列的三张，奖励 2 张；斜线不算。</span></p><p><b>幸运与清台</b><span>翻出幸运${universe().copy.subject}立即 +1；清空棋盘额外 +5。</span></p><p><b>全家福</b><span>九种${universe().copy.subject}齐聚，免费加翻一张并对碰。</span></p><p><b>两种节奏</b><span>手动每次一张；自动每次一轮，结算后再次点击。</span></p></div><button class="wide-button" id="rules-close">记住了，出发</button>`);
  $('rules-close').onclick = closeModal;
}
function blessingInfoModal() {
  modal(`<h2>旅程祝福</h2><p class="modal-subtitle">免费翻开一张 · 看广告可任意选择</p><div class="blessing-guide-list">${BLESSINGS.map(item => blessing(item.id)).map((info, index) => `<article class="blessing-guide-item"><span class="guide-symbol" aria-hidden="true"><img src="${asset(universe().blessingCharacters?.[index] ?? index)}" alt=""></span><div><strong>${info.name}</strong><p>${info.description}</p></div></article>`).join('')}</div><button class="wide-button" id="blessing-info-close">返回选卡</button>`);
  $('modal-layer').querySelector('.modal-card')!.classList.add('blessing-guide-modal');
  $('blessing-info-close').onclick = closeModal;
}
function settingsModal() {
  modal(`${heading('♫', '旅程设置', '用喜欢的节奏，收集小小快乐')}<button class="setting-row" id="sound-setting">游戏音效 <strong>${store.sound ? '已开启' : '已关闭'}</strong></button><p class="demo-note">当前为本地可玩原型<br>广告入口暂直接发放奖励，尚未接入全球榜单</p><button class="wide-button" id="settings-close">完成</button>`);
  $('sound-setting').onclick = () => { store.sound = !store.sound; saveStore(store); updateSoundUI(); settingsModal(); }; $('settings-close').onclick = closeModal;
}
function pauseModal() {
  if (busy || !run) return;
  modal(`${heading('✧', '休息一下', '准备好了，再继续翻牌')}<button class="wide-button" id="pause-resume">继续旅程</button><div class="two-actions"><button id="pause-rules">玩法说明</button><button id="pause-home">返回首页</button></div>`);
  $('pause-resume').onclick = closeModal; $('pause-rules').onclick = rulesModal; $('pause-home').onclick = () => confirmEndRun();
}
async function requestAdReward(_placement: 'energy' | 'cards' | 'continue' | 'blessing'): Promise<boolean> {
  // Temporary playtest provider. Replace this with the platform's completed-ad
  // callback when ads are connected; all reward rules stay at the call sites.
  beep('reward');
  return true;
}
async function withAdReward(placement: Parameters<typeof requestAdReward>[0], onReward: () => void | Promise<void>) {
  if (!await requestAdReward(placement)) return;
  closeModal();
  await onReward();
}
$('deal').onclick = () => void deal(); $('game-back').onclick = pauseModal;
$('manual').onclick = () => { automatic = false; $('manual').classList.add('active'); $('automatic').classList.remove('active'); $('mode-hint').textContent = '每点一次发一张，满格后自动结算'; };
$('automatic').onclick = () => { automatic = true; $('automatic').classList.add('active'); $('manual').classList.remove('active'); $('mode-hint').textContent = '点一次完成一轮，结算后再次发牌'; };
$('blessing-badge').onclick = () => { if (run) toast(blessing(run.blessing).description); };
function updateSoundUI() {
  cardSounds.syncPreference();
  document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach(b => {
    b.setAttribute('aria-pressed', String(store.sound));
    b.setAttribute('aria-label', store.sound ? '关闭音效' : '开启音效');
    b.title = store.sound ? '关闭音效' : '开启音效';
  });
}
document.querySelectorAll<HTMLButtonElement>('.sound-toggle').forEach(b => b.onclick = () => { store.sound = !store.sound; saveStore(store); updateSoundUI(); toast(store.sound ? '音效已开启' : '音效已关闭'); });
document.addEventListener('click', event => {
  if ((event.target as Element).closest('[data-energy]')) energyModal();
});
function tickEnergy() {
  const changed = refreshDay(store);
  if (changed) {
    saveStore(store);
    if (energyModalReturn) energyModal(energyModalReturn);
    else if (!$('setup').hidden && draft?.step === 'cards') cardSetup();
  }
  updateEnergyUI();
}
window.setInterval(tickEnergy, 1000);
applyUniverse();
document.addEventListener('visibilitychange', () => { if (document.hidden) { void audio?.suspend(); } else { tickEnergy(); if (store.sound) void audio?.resume(); } });
if (previewBoard) {
  run = createRun('endless', 1, 'echo', [8]);
  run.board = [0, 1, 2, 3, 4, 5, 6, 7, 8]; run.drawn = 9; run.remaining = 11; run.started = true;
  void enterGame().then(() => {
    $('deal-label').textContent = '预览翻牌';
    $('deal').onclick = async () => {
      if (busy) return;
      setBusy(true);
      try { for (let slot = 0; slot < 9; slot++) await scene.reveal(slot, slot, () => cardSounds.flip(slot)); }
      finally { setBusy(false); $('deal-label').textContent = '再次预览翻牌'; }
    };
  });
} else if (previewOpening) {
  const params = new URLSearchParams(location.search);
  const chosenBlessing = BLESSINGS.find(item => item.id === params.get('previewOpening'))?.id ?? 'echo';
  const requestedCards = Number(params.get('previewCards'));
  const cards = CARD_TIERS.find(tier => tier === requestedCards) ?? 20;
  run = createRun('stage', 1, chosenBlessing, chosenBlessing === 'wish' ? [0, 8] : [8], cards);
  void enterGame();
} else if (previewSettlement) {
  const fixture = () => {
    run = createRun('endless', 1, 'line', [8]);
    run.board = [0, 0, 0, 1, 2, 1, 2, 3, 3]; run.remaining = 11; run.drawn = 9; run.started = true;
  };
  fixture();
  void enterGame().then(() => {
    $('deal-label').textContent = '预览连续结算';
    $('deal').onclick = async () => {
      if (busy) return;
      fixture(); scene.render(run!); updateHud(run!); setBusy(true);
      try { await playSettlement(settle(run!)); }
      finally { updateHud(run!); setBusy(false); $('deal-label').textContent = '再次预览结算'; }
    };
  });
} else if (previewHidden) {
  home();
  void hiddenChallenge().then(reward => toast(reward ? `获得 ${reward} 包奖励` : '本次没有切开卡包'));
} else if (previewBlessing) setup('stage', 1);
else home();
