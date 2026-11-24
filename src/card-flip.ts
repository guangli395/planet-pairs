import './card-flip.css';

/** A real two-sided CSS 3D card sits over the canvas only for the reveal. */
export async function animateCardFlip(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, frontUrl: string, accent: string, onFlip?: () => void, backUrl = './assets/cardback.svg') {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.className = `board-card-reveal${reduced ? ' reduced-motion' : ''}`;
  layer.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;--flip-accent:${accent}`;
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i class="board-card-aura"></i><div class="board-card-lift"><div class="board-card-turn"><div class="board-card-back"><img alt=""></div><div class="board-card-front"><img alt=""><i class="board-card-foil"></i><i class="board-card-glare"></i></div></div></div>';
  layer.querySelector<HTMLImageElement>('.board-card-back img')!.src = backUrl;
  const face = layer.querySelector<HTMLImageElement>('.board-card-front img')!;
  face.src = frontUrl;
  document.body.append(layer);
  const animations: Animation[] = [];
  const animate = (element: Element, frames: Keyframe[], timing: KeyframeAnimationOptions) => {
    const animation = element.animate(frames, {fill: 'both', ...timing});
    animations.push(animation); return animation;
  };
  try {
    await face.decode().catch(() => {});
    onFlip?.();
    if (reduced) {
      layer.querySelector<HTMLElement>('.board-card-turn')!.style.transform = 'rotateY(180deg)';
      animate(layer, [{opacity: .5}, {opacity: 1}], {duration: 90});
    } else {
      const duration = 380;
      animate(layer.querySelector('.board-card-lift')!, [
        {transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)'},
        {transform: 'translateY(-7px) rotateX(9deg) rotateZ(-2.5deg) scale(1.075)', offset: .32},
        {transform: 'translateY(-2px) rotateX(-3deg) rotateZ(.8deg) scale(1.025)', offset: .76},
        {transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)'},
      ], {duration, easing: 'cubic-bezier(.2,.72,.25,1)'});
      animate(layer.querySelector('.board-card-turn')!, [
        {transform: 'rotateY(0deg)'},
        {transform: 'rotateY(100deg)', offset: .43, easing: 'ease-out'},
        {transform: 'rotateY(191deg)', offset: .76},
        {transform: 'rotateY(177.5deg)', offset: .9},
        {transform: 'rotateY(180deg)'},
      ], {duration, easing: 'linear'});
      animate(layer.querySelector('.board-card-aura')!, [
        {opacity: 0, transform: 'scale(.85)'},
        {opacity: .65, transform: 'scale(1.07)', offset: .5},
        {opacity: 0, transform: 'scale(1.2)'},
      ], {duration, easing: 'ease-out'});
      animate(layer.querySelector('.board-card-foil')!, [
        {opacity: 0, backgroundPosition: '0% 50%'},
        {opacity: .65, offset: .5},
        {opacity: 0, backgroundPosition: '100% 50%'},
      ], {duration, easing: 'ease-out'});
      animate(layer.querySelector('.board-card-glare')!, [
        {transform: 'translateX(-130%)', opacity: 0},
        {opacity: .5, offset: .48},
        {transform: 'translateX(130%)', opacity: 0},
      ], {duration, easing: 'ease-out'});
    }
    await Promise.all(animations.map(animation => animation.finished));
  } catch { /* Returning to the board must still show the committed front face. */ }
  finally { animations.forEach(animation => animation.cancel()); layer.remove(); }
}
