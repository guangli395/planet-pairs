import { BLESSINGS, type Blessing } from './rules';

export interface RewardEffect {
  blessing: Blessing | null;
  amount: number;
  kind: 'lucky' | 'bonus' | 'clear' | 'opening' | 'settle';
  title?: string;
  origin?: { x: number; y: number };
}

/** Presentation only: amounts are supplied by the already settled game event. */
export async function showRewardEffect(effect: RewardEffect): Promise<void> {
  const board = document.querySelector<HTMLElement>('.board-frame')!;
  const rect = board.getBoundingClientRect();
  const info = BLESSINGS.find(b => b.id === effect.blessing);
  const lucky = effect.kind === 'lucky';
  const strong = effect.kind === 'clear';
  const settle = effect.kind === 'settle';
  const highlight = lucky || settle || effect.kind === 'bonus' || effect.kind === 'clear' || effect.kind === 'opening';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Settlement callouts finish with collection, before the next group arrives.
  const duration = settle ? (reduced ? 200 : 480) : reduced ? (highlight ? 520 : 350) : (highlight ? 1000 : 620);
  const layer = document.createElement('div');
  layer.className = `blessing-fx${lucky ? ' is-lucky' : ''}${strong ? ' is-clear' : ''}${highlight ? ' is-reward' : ''}`;
  layer.setAttribute('aria-hidden', 'true');
  const title = effect.title ?? info?.name ?? '幸运降临';
  const detail = info && effect.title ? `${info.name} · ` : '';
  layer.innerHTML = `<div class="blessing-copy"><span class="blessing-symbol">${info?.symbol ?? (settle ? '✦' : '✧')}</span><strong>${title}</strong><small>${detail}${effect.kind === 'bonus' || strong ? '额外 ' : ''}+${effect.amount} 张</small></div>`;
  const copy = layer.querySelector<HTMLElement>('.blessing-copy')!;
  const center = { x: rect.width / 2, y: rect.height / 2 };
  const origin = effect.origin ? { x: effect.origin.x - rect.x, y: effect.origin.y - rect.y } : center;
  if (lucky) {
    copy.style.left = `${Math.max(82, Math.min(rect.width - 82, origin.x))}px`;
    copy.style.top = `${Math.max(15, origin.y - rect.width * .13)}px`;
  }
  board.appendChild(layer);
  const animations: Animation[] = [];
  const animate = (node: Element, frames: Keyframe[], options: KeyframeAnimationOptions = {}) => {
    const animation = node.animate(frames, { duration, easing: 'ease-out', fill: 'both', ...options });
    animations.push(animation);
  };
  const rest = 'translate(-50%,-50%)';
  animate(copy, reduced ? [
    { opacity: 0, transform: rest }, { opacity: 1, transform: rest, offset: .2 }, { opacity: 0, transform: rest },
  ] : [
    { opacity: 0, transform: `${rest} translateY(8px) scale(${lucky ? .9 : .65})` },
    { opacity: 1, transform: `${rest} scale(${lucky ? 1 : 1.07})`, offset: .25 },
    { opacity: 1, transform: `${rest} scale(1)`, offset: highlight ? .78 : .65 },
    { opacity: 0, transform: `${rest} translateY(-18px) scale(.98)` },
  ]);
  const badge = info ? document.getElementById('blessing-badge') : null;
  if (badge) animate(badge, [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: `scale(${reduced ? 1 : 1.1})`, filter: 'brightness(1.7)', offset: .28 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ]);
  if (lucky) {
    const halo = document.createElement('i');
    halo.className = 'blessing-halo';
    const size = (board.querySelector('canvas')?.getBoundingClientRect().width ?? rect.width) * .3 + 10;
    halo.style.cssText = `left:${origin.x}px;top:${origin.y}px;width:${size}px;height:${size}px`;
    layer.prepend(halo);
    animate(halo, [
      { opacity: 0, transform: `${rest} scale(.95)` },
      { opacity: .9, transform: `${rest} scale(1.03)`, offset: .3 },
      { opacity: 0, transform: `${rest} scale(${reduced ? 1.03 : 1.12})` },
    ]);
  }
  if (!reduced) {
    const count = lucky ? 4 : strong ? 12 : settle ? 8 : 7;
    const radius = lucky ? rect.width * .13 : rect.width * (strong ? .42 : .28);
    const source = lucky ? origin : center;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'blessing-spark'; spark.textContent = i % 3 === 0 ? '✦' : '·';
      spark.style.cssText = `left:${source.x}px;top:${source.y}px;font-size:${i % 3 === 0 ? 12 : 21}px`;
      layer.prepend(spark);
      const angle = i / count * Math.PI * 2 - Math.PI / 2;
      animate(spark, [
        { opacity: 0, transform: `${rest} scale(.25)` },
        { opacity: .95, offset: .2 },
        { opacity: 0, transform: `${rest} translate(${Math.cos(angle) * radius}px,${Math.sin(angle) * radius}px) rotate(45deg) scale(.6)` },
      ]);
    }
    if (strong) {
      const ring = document.createElement('i'); ring.className = 'blessing-ring'; layer.prepend(ring);
      animate(ring, [
        { opacity: .7, transform: `${rest} scale(.3)` },
        { opacity: 0, transform: `${rest} scale(1.3)` },
      ]);
    }
  }
  const live = document.getElementById('blessing-announcement');
  if (live) live.textContent = `${title}，${effect.kind === 'bonus' || strong ? '额外' : ''}获得 ${effect.amount} 张卡`;
  try { await Promise.all(animations.map(a => a.finished)); }
  catch { /* A cancelled visual never changes the already computed reward. */ }
  finally { animations.forEach(a => a.cancel()); layer.remove(); }
}
