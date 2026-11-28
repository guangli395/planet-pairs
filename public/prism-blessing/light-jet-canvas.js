// Mobile paints the same ribbon polygons once, instead of reparsing 32 SVG paths.
export class LightJetCanvas {
  constructor(root) {
    this.canvas = root.ownerDocument.createElement('canvas');
    this.canvas.className = 'jet-raster';
    this.context = this.canvas.getContext('2d', {alpha: true});
    if (!this.context) throw new Error('Canvas 2D unavailable');
    root.append(this.canvas);
    root.dataset.renderer = 'canvas';
    this.mote = root.ownerDocument.createElement('canvas');
    this.mote.width = this.mote.height = 96;
    const ctx = this.mote.getContext('2d');
    const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(.2, '#fff'); gradient.addColorStop(.45, '#ffffff8c'); gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 96, 96);
  }
  resize(bounds, unit, pixelRatio, bands, edges, startY, lighten) {
    this.bounds = bounds; this.scale = unit * Math.min(3, pixelRatio || 1);
    const canvas = this.canvas, ctx = this.context, scale = this.scale;
    const width = Math.ceil(bounds.width * scale), height = Math.ceil(bounds.height * scale);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    canvas.style.cssText = `left:${bounds.x * unit}px;top:${bounds.y * unit}px;width:${width / scale * unit}px;height:${height / scale * unit}px`;
    ctx.setTransform(scale, 0, 0, scale, -bounds.x * scale, -bounds.y * scale);
    this.gradients = bands.map((band, j) => {
      const ux = (edges[j].ux + edges[j + 1].ux) / 2;
      const uy = (edges[j].uy + edges[j + 1].uy) / 2;
      const hotDist = 26 + startY - 62.5;
      const grad = ctx.createLinearGradient(Number(band.gradX.toFixed(2)), startY,
        Number((band.gradX + ux * hotDist).toFixed(2)), Number((startY + uy * hotDist).toFixed(2)));
      grad.addColorStop(0, lighten(band.color, .7)); grad.addColorStop(1, band.color);
      return grad;
    });
  }
  begin() {
    const ctx = this.context, scale = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -this.bounds.x * scale, -this.bounds.y * scale);
  }
  band(index, left, right, length, step) {
    const leftCount = Math.min(left.pts.length / 2, Math.max(0, Math.ceil(length / step) - left.iStart + 1));
    const rightCount = Math.min(right.pts.length / 2, Math.max(0, Math.ceil(length / step) - right.iStart + 1));
    if (leftCount < 2 || rightCount < 2) return;
    const ctx = this.context;
    ctx.beginPath(); ctx.moveTo(left.pts[0], left.pts[1]);
    for (let i = 1; i < leftCount; i++) ctx.lineTo(left.pts[i * 2], left.pts[i * 2 + 1]);
    for (let i = rightCount - 1; i >= 0; i--) ctx.lineTo(right.pts[i * 2], right.pts[i * 2 + 1]);
    ctx.closePath(); ctx.fillStyle = this.gradients[index]; ctx.fill();
  }
  spark(x, y, radius, opacity) {
    const ctx = this.context;
    ctx.globalAlpha = opacity;
    ctx.drawImage(this.mote, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }
}
