export interface CutPoint { x: number; y: number }
export interface CutBounds { left: number; top: number; right: number; bottom: number }
const EPS = 1e-7;
const MIN_AREA = 1e-5;
const UNIT: CutBounds = {left: 0, top: 0, right: 1, bottom: 1};

function clipped(from: CutPoint, to: CutPoint, bounds: CutBounds, finite: boolean) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.hypot(dx, dy) < EPS) return null;
  let low = finite ? 0 : -Infinity, high = finite ? 1 : Infinity;
  for (const [origin, delta, min, max] of [[from.x, dx, bounds.left, bounds.right], [from.y, dy, bounds.top, bounds.bottom]]) {
    if (Math.abs(delta) < EPS) { if (origin < min || origin > max) return null; continue; }
    const a = (min - origin) / delta, b = (max - origin) / delta;
    low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
    if (high - low < EPS) return null;
  }
  return {from: {x: from.x + dx * low, y: from.y + dy * low}, to: {x: from.x + dx * high, y: from.y + dy * high}};
}

/** Segment clipping also catches fast swipes whose two sampled points miss the pack. */
export const clipCutSegment = (from: CutPoint, to: CutPoint, bounds: CutBounds) => clipped(from, to, bounds, true);
export const packCutLine = (from: CutPoint, to: CutPoint, bounds: CutBounds) => clipped(from, to, bounds, false);

function area(polygon: CutPoint[]) {
  return Math.abs(polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
}

function half(polygon: CutPoint[], from: CutPoint, to: CutPoint, sign: number): CutPoint[] {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  const distance = (p: CutPoint) => sign * (dx * (p.y - from.y) - dy * (p.x - from.x)) / length;
  const result: CutPoint[] = [];
  let previous = polygon[polygon.length - 1], d0 = distance(previous);
  for (const point of polygon) {
    const d1 = distance(point), before = d0 >= -EPS, after = d1 >= -EPS;
    if (before !== after) {
      const t = d0 / (d0 - d1);
      result.push({x: previous.x + (point.x - previous.x) * t, y: previous.y + (point.y - previous.y) * t});
    }
    if (after) result.push(point);
    previous = point; d0 = d1;
  }
  return result;
}

/** Each straight blade splits the existing convex pieces; count regions, not strokes. */
export class HiddenSlices {
  private pieces: CutPoint[][] = [[{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}]];
  private cuts = 0;
  constructor(readonly maxReward = 30) {}
  get count() { return this.cuts ? this.pieces.length : 0; }
  get reward() { return Math.min(this.count, this.maxReward); }
  /** A detached snapshot lets the artwork use exactly the regions we counted. */
  get polygons(): CutPoint[][] { return this.pieces.map(piece => piece.map(point => ({...point}))); }

  cut(from: CutPoint, to: CutPoint): boolean {
    if (this.reward >= this.maxReward || !clipCutSegment(from, to, UNIT)) return false;
    const next: CutPoint[][] = [];
    let changed = false;
    for (const piece of this.pieces) {
      const a = half(piece, from, to, 1), b = half(piece, from, to, -1);
      if (area(a) > MIN_AREA && area(b) > MIN_AREA) { next.push(a, b); changed = true; }
      else next.push(piece);
    }
    if (!changed) return false;
    this.pieces = next; this.cuts++;
    return true;
  }
}
