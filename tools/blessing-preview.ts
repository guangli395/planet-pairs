import '../src/style.css';
import '../src/themes.css';
import { getUniverse } from '../src/themes';
import { createBoard } from '../src/board';
import { BLESSINGS, createRun, drawOne, settle, type Blessing, type GameEvent } from '../src/rules';
import { showRewardEffect, type RewardEffect } from '../src/effects';

// Development preview uses fresh rule fixtures and never reads gameplay saves.
const theme = getUniverse(new URLSearchParams(location.search).get('theme'));
document.documentElement.dataset.palette = theme.palette;
document.documentElement.dataset.universe = theme.id;
for (const [key, value] of Object.entries(theme.colors)) document.documentElement.style.setProperty(`--${key}`, value);
document.querySelector('#app')!.innerHTML = `<main class="device"><section class="screen game-screen">
  <header class="game-top"><a href="./" style="color:inherit;text-decoration:none">‹ 返回游戏</a><span>祝福效果预览</span><span>✦</span></header>
  <div class="game-scenery"><p>选择一种奖励，查看触发效果</p><h1>${theme.copy.blessing}</h1></div>
  <div class="run-badges"><div id="lucky-badge"><span>幸运</span><img src="${theme.characters[0].image}" alt="${theme.characters[0].name}"></div><button id="blessing-badge">旅程祝福</button></div>
  <div class="event-lane"><span id="preview-description" style="font-size:10px;line-height:1.7;text-align:center;color:var(--theme-muted)">点击下方按钮预览</span></div>
  <div class="board-frame"><div id="phaser-board" aria-label="祝福预览棋盘"></div></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:26px">${BLESSINGS.map(b => `<button class="wide-button" data-effect="${b.id}" style="padding:12px 4px;font-size:11px;letter-spacing:0">${b.name}</button>`).join('')}<button class="wide-button" data-reward="lucky" style="padding:12px 4px;font-size:11px;letter-spacing:0">普通幸运 +1</button><button class="wide-button" data-reward="settle" style="padding:12px 4px;font-size:11px;letter-spacing:0">对碰 +1</button></div>
  <span id="blessing-announcement" class="sr-only" role="status" aria-live="polite"></span>
</section></main>`;
const { scene } = await createBoard(document.getElementById('phaser-board')!);
scene.setTheme(theme);
const sample = createRun('endless', 1, 'echo', [0]);
sample.board = [0, 2, null, 4, null, 3, null, 8, null]; scene.render(sample);
document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(button => button.onclick = async () => {
  const id = button.dataset.effect as Blessing;
  const run = createRun('endless', 1, id, id === 'wish' ? [0, 8] : [0]);
  let event: GameEvent | undefined;
  let effect: RewardEffect;
  if (id === 'echo' || id === 'wish') {
    event = drawOne(run, () => 0);
    effect = { blessing: id, amount: event.blessingReward!, kind: 'lucky' };
  } else if (id === 'gift') {
    effect = { blessing: id, amount: run.giftBonus!, kind: 'opening' };
  } else {
    if (id === 'savings') { run.pairs = 2; run.board = [1, 1, 2, 3, 4, 5, 6, 7, 8]; }
    if (id === 'line') run.board = [1, 1, 1, 2, 3, 4, 5, 6, 7];
    if (id === 'clear') { run.remaining = 0; run.board = [1, 1, null, null, null, null, null, null, null]; }
    event = settle(run).find(e => e.blessingReward);
    effect = { blessing: id, amount: event!.blessingReward!, kind: id === 'clear' ? 'clear' : 'bonus' };
  }
  scene.render(run);
  if (effect.kind === 'lucky') {
    const rect = document.querySelector('canvas')!.getBoundingClientRect();
    const p = scene.point(event!.slots[0]);
    effect.origin = { x: rect.x + p.x / 360 * rect.width, y: rect.y + p.y / 360 * rect.height };
  }
  const info = BLESSINGS.find(b => b.id === id)!;
  document.getElementById('blessing-badge')!.innerHTML = `<span class="blessing-icon" aria-hidden="true">${info.symbol}</span><span class="blessing-name">${info.name}</span>`;
  document.getElementById('preview-description')!.textContent = info.description.replaceAll('星球', theme.copy.subject);
  document.querySelectorAll<HTMLButtonElement>('[data-effect],[data-reward]').forEach(b => { b.disabled = true; });
  try { await showRewardEffect(effect); }
  finally { document.querySelectorAll<HTMLButtonElement>('[data-effect],[data-reward]').forEach(b => { b.disabled = false; }); }
});

document.querySelectorAll<HTMLButtonElement>('[data-reward]').forEach(button => button.onclick = async () => {
  scene.render(sample);
  const kind = button.dataset.reward as 'lucky' | 'settle';
  const rect = document.querySelector('canvas')!.getBoundingClientRect();
  const p = scene.point(0);
  const origin = {x: rect.x + p.x / 360 * rect.width, y: rect.y + p.y / 360 * rect.height};
  document.querySelectorAll<HTMLButtonElement>('[data-effect],[data-reward]').forEach(b => { b.disabled = true; });
  try { await showRewardEffect({blessing: null, amount: 1, kind, title: kind === 'settle' ? '对碰' : undefined, origin}); }
  finally { document.querySelectorAll<HTMLButtonElement>('[data-effect],[data-reward]').forEach(b => { b.disabled = false; }); }
});
