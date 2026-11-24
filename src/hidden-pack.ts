import './hidden-pack.css';
import type { CutPoint } from './hidden-slices';

const NS = 'http://www.w3.org/2000/svg';
let serial = 0;
const percent = (value: number) => +(value * 100).toFixed(5);
const svgNode = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

/** The same cut polygons drive counting, visible seams and the final breakup. */
export class HiddenPackVisual {
  private readonly original: HTMLImageElement;
  private readonly pieces = document.createElement('div');
  private readonly seams = svgNode('svg', {viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true'});
  private readonly seamLines = svgNode('g', {});
  private readonly animations = new Set<Animation>();
  private readonly temporary = new Set<Element>();
  private polygons: CutPoint[][] = [];
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly pack: HTMLElement, private readonly trails: SVGSVGElement) {
    this.original = pack.querySelector('img')!;
    this.original.classList.add('hidden-pack-art');
    this.pieces.className = 'hidden-pack-pieces';
    this.pieces.setAttribute('aria-hidden', 'true');
    this.seams.classList.add('hidden-pack-seams');
    const id = `hidden-pack-alpha-${++serial}`;
    const defs = svgNode('defs', {});
    const mask = svgNode('mask', {id, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: '100', height: '100', 'mask-type': 'alpha'});
    mask.append(svgNode('image', {href: this.original.src, x: '0', y: '0', width: '100', height: '100', preserveAspectRatio: 'none'}));
    defs.append(mask);
    this.seamLines.setAttribute('mask', `url(#${id})`);
    this.seams.append(defs, this.seamLines);
    this.pack.classList.add('hidden-pack-sliced');
    this.pack.append(this.pieces, this.seams);
  }

  private animate(element: Element, frames: Keyframe[], timing: KeyframeAnimationOptions) {
    const animation = element.animate(frames, {fill: 'both', ...timing});
    this.animations.add(animation);
    // Observe cancellation immediately, including when a page is closed mid-cut.
    return animation.finished.catch(() => {});
  }

  cut(polygons: CutPoint[][], from: CutPoint, to: CutPoint) {
    this.polygons = polygons;
    const nodes = polygons.map(polygon => {
      const piece = document.createElement('div');
      piece.className = 'hidden-pack-piece';
      piece.style.clipPath = `polygon(${polygon.map(p => `${percent(p.x)}% ${percent(p.y)}%`).join(',')})`;
      const image = this.original.cloneNode() as HTMLImageElement;
      image.className = ''; image.alt = ''; image.draggable = false;
      piece.append(image);
      return piece;
    });
    this.pieces.replaceChildren(...nodes);
    this.pack.classList.add('has-fragments');
    this.pack.dataset.fragments = String(polygons.length);

    // This thin seam is inside the pack's alpha silhouette, in pack coordinates.
    const coords = {x1: String(percent(from.x)), y1: String(percent(from.y)), x2: String(percent(to.x)), y2: String(percent(to.y)), 'vector-effect': 'non-scaling-stroke'};
    this.seamLines.append(svgNode('line', {...coords, class: 'hidden-cut-edge'}), svgNode('line', {...coords, class: 'hidden-cut-core'}));
    if (this.reduced) return;
    const flash = svgNode('line', {...coords, class: 'hidden-cut-flash'});
    this.seamLines.append(flash); this.temporary.add(flash);
    void this.animate(flash, [{opacity: 0}, {opacity: .9, offset: .12}, {opacity: 0}], {duration: 240}).then(() => {flash.remove(); this.temporary.delete(flash);});
    this.sweep(from, to);
    void this.animate(this.pack, [
      {translate: '0 0'}, {translate: '1px -1px', offset: .22},
      {translate: '-1px 1px', offset: .55}, {translate: '0 0'},
    ], {duration: 150, easing: 'ease-out'});
  }

  private sweep(from: CutPoint, to: CutPoint) {
    const pack = this.pack.getBoundingClientRect(), stage = this.trails.getBoundingClientRect();
    let x1 = pack.left - stage.left + from.x * pack.width, y1 = pack.top - stage.top + from.y * pack.height;
    let x2 = pack.left - stage.left + to.x * pack.width, y2 = pack.top - stage.top + to.y * pack.height;
    const length = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / length, dy = (y2 - y1) / length;
    const extension = Math.min(28, pack.width * .15);
    x1 -= dx * extension; y1 -= dy * extension; x2 += dx * extension; y2 += dy * extension;
    const group = svgNode('g', {class: 'hidden-blade-sweep'});
    const coords = {x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2)};
    group.append(svgNode('line', {...coords, class: 'hidden-blade-glow'}), svgNode('line', {...coords, class: 'hidden-blade-core'}));
    this.trails.append(group); this.temporary.add(group);
    const fullLength = length + extension * 2;
    group.style.strokeDasharray = String(fullLength);
    void this.animate(group, [
      {strokeDashoffset: fullLength, opacity: 0}, {strokeDashoffset: 0, opacity: 1, offset: .3},
      {strokeDashoffset: 0, opacity: 0},
    ], {duration: 260, easing: 'cubic-bezier(.16,.7,.25,1)'}).then(() => {group.remove(); this.temporary.delete(group);});
  }

  async breakApart() {
    this.pack.classList.add('is-breaking');
    // Let the blade disappear before the actual picture pieces pull apart.
    const fade = this.animate(this.seams, [{opacity: 1}, {opacity: 0}], {duration: this.reduced ? 80 : 160});
    for (const node of this.trails.children) void this.animate(node, [{opacity: 1}, {opacity: 0}], {duration: 100});
    const width = this.pack.clientWidth, height = this.pack.clientHeight;
    const animations = [...this.pieces.children].map((piece, i) => {
      const polygon = this.polygons[i];
      const center = polygon.reduce((sum, p) => ({x: sum.x + p.x / polygon.length, y: sum.y + p.y / polygon.length}), {x: 0, y: 0});
      let nx = (center.x - .5) * width, ny = (center.y - .5) * height;
      const length = Math.hypot(nx, ny);
      if (length < 1) {nx = Math.cos(i * 2.4); ny = Math.sin(i * 2.4);}
      else {nx /= length; ny /= length;}
      const distance = 66 + width * (.23 + (i % 4) * .045);
      const dx = nx * distance, dy = ny * distance;
      const angle = (nx < 0 ? -1 : 1) * (10 + i % 5 * 4);
      (piece as HTMLElement).style.transformOrigin = `${percent(center.x)}% ${percent(center.y)}%`;
      if (this.reduced) return this.animate(piece, [{opacity: 1}, {opacity: 0}], {duration: 180});
      return this.animate(piece, [
        {transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1},
        {transform: `translate3d(${dx * .32}px,${dy * .32 - 5}px,0) rotate(${angle * .22}deg)`, opacity: 1, offset: .23},
        {transform: `translate3d(${dx * .83}px,${dy * .83 + 20}px,0) rotate(${angle * .75}deg)`, opacity: .95, offset: .63},
        {transform: `translate3d(${dx}px,${dy + 115}px,0) rotate(${angle * 1.25}deg)`, opacity: 0},
      ], {duration: 940, delay: 120 + i % 4 * 20, easing: 'cubic-bezier(.22,.6,.36,1)'});
    });
    if (!this.reduced && this.polygons.length) {
      const glow = document.createElement('i'); glow.className = 'hidden-break-glow';
      this.pack.prepend(glow); this.temporary.add(glow);
      animations.push(this.animate(glow, [
        {opacity: 0, transform: 'scale(.45)'}, {opacity: .8, transform: 'scale(1)', offset: .24},
        {opacity: 0, transform: 'scale(1.6)'},
      ], {duration: 510}));
    }
    await Promise.all([fade, ...animations]);
  }

  destroy() {
    this.animations.forEach(animation => animation.cancel()); this.animations.clear();
    this.temporary.forEach(node => node.remove()); this.temporary.clear();
  }
}
