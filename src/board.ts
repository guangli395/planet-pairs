import Phaser from 'phaser';
import { type Run } from './rules';
import { UNIVERSES, getUniverse, type UniverseTheme } from './themes';
import { animateCardFlip } from './card-flip';
import { BOARD_SIZE, CHARACTER_PIXELS, CARD_ART_PIXELS, boardPixels } from './board-resolution';

export class BoardScene extends Phaser.Scene {
  private tiles = new Map<number, Phaser.GameObjects.Container>();
  private artwork = new Map<number, string>();
  private backdrop!: Phaser.GameObjects.Graphics;
  private theme = getUniverse('classic');
  private readyResolve!: () => void;
  readonly loaded = new Promise<void>(resolve => { this.readyResolve = resolve; });
  constructor() { super('board'); }
  preload() {
    for (const theme of UNIVERSES) theme.characters.forEach((character, i) => {
      const key = `${theme.id}:character:${i}`;
      if (character.image.endsWith('.svg')) this.load.svg(key, character.image, {width: CHARACTER_PIXELS, height: CHARACTER_PIXELS});
      else this.load.image(key, character.image);
    });
  }
  create() {
    this.fitViewport();
    this.backdrop = this.add.graphics();
    this.setTheme(this.theme);
    this.readyResolve();
  }
  fitViewport() {
    // Phaser 4 has no game-level resolution option. Render a larger canvas,
    // then keep the existing 360-unit board through the camera projection.
    const pixels = this.scale.width;
    this.cameras.main.setSize(pixels, pixels).setZoom(pixels / BOARD_SIZE).centerOn(BOARD_SIZE / 2, BOARD_SIZE / 2);
    this.game.canvas.dataset.logicalSize = String(BOARD_SIZE);
  }
  private key(kind: string, type: number) { return `${this.theme.id}:${kind}:${type}`; }
  setTheme(theme: UniverseTheme) {
    this.clear(); this.artwork.clear(); this.theme = theme;
    this.backdrop.clear();
    const hex = (value: string) => Number.parseInt(value.slice(1), 16);
    for (let i = 0; i < 9; i++) {
      const { x, y } = this.point(i);
      this.backdrop.fillStyle(hex(theme.board.slot), theme.palette === 'warm' ? .28 : .66).fillRoundedRect(x - 55, y - 53, 110, 110, 18)
        .lineStyle(1, hex(theme.board.edge), .2).strokeRoundedRect(x - 55, y - 53, 110, 110, 18)
        .fillStyle(hex(theme.board.dot), .3).fillCircle(x, y, 3);
    }
    for (let i = 0; i < 9; i++) {
      if (this.textures.exists(this.key('front', i))) continue;
      const texture = this.textures.createCanvas(this.key('front', i), CARD_ART_PIXELS, CARD_ART_PIXELS)!;
      const ctx = texture.context;
      ctx.scale(CARD_ART_PIXELS / 216, CARD_ART_PIXELS / 216);
      const gradient = ctx.createLinearGradient(0, 0, 216, 216);
      gradient.addColorStop(0, theme.board.face[0]); gradient.addColorStop(.6, theme.board.face[1]); gradient.addColorStop(1, theme.board.face[2]);
      ctx.fillStyle = theme.board.side; ctx.beginPath(); ctx.roundRect(0, 6, 216, 210, 28); ctx.fill();
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(0, 0, 216, 206, 28); ctx.fill();
      const gilded = theme.material === 'gilded';
      const rim = ctx.createLinearGradient(0, 0, 216, 206);
      for (const [offset, color] of [[0, '#806039'], [.2, '#fff0bd'], [.4, '#a17f45'], [.65, '#ead39a'], [.85, '#765833'], [1, '#dfbf76']] as const) rim.addColorStop(offset, color);
      ctx.strokeStyle = gilded ? rim : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(4, 4, 208, 196, 25); ctx.stroke();
      if (gilded) {
        ctx.strokeStyle = '#dfc18435'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(10, 10, 196, 184, 21); ctx.stroke();
      }
      const glow = ctx.createRadialGradient(108, 86, 4, 108, 86, 100);
      glow.addColorStop(0, theme.characters[i].color + (gilded ? '24' : theme.palette === 'warm' ? '26' : '80')); glow.addColorStop(1, theme.characters[i].color + '00');
      ctx.fillStyle = glow; ctx.fillRect(4, 4, 208, 192);
      // Composite artwork and its translucent edges once at full resolution.
      // The settled board and temporary flip layer then use the identical face.
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.textures.get(this.key('character', i)).getSourceImage() as CanvasImageSource, 14, 4, 188, 188);
      ctx.font = 'bold 20px Microsoft YaHei, sans-serif'; ctx.fillStyle = theme.board.ink;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(theme.characters[i].name, 108, 186);
      texture.refresh();
    }
  }
  point(slot: number) { return { x: 60 + (slot % 3) * 120, y: 58 + Math.floor(slot / 3) * 120 }; }
  private tile(slot: number, type: number) {
    const p = this.point(slot);
    const container = this.add.container(p.x, p.y);
    const bg = this.add.image(0, 0, this.key('front', type)).setDisplaySize(108, 108);
    container.add(bg);
    this.tiles.set(slot, container); return container;
  }
  clear() {
    for (const tile of this.tiles.values()) tile.destroy(); this.tiles.clear();
  }
  render(run: Run) {
    this.clear();
    run.board.forEach((type, slot) => { if (type !== null) this.tile(slot, type); });
  }
  cardArtwork(type: number) {
    const cached = this.artwork.get(type);
    if (cached) return cached;
    const texture = this.textures.get(this.key('front', type)) as Phaser.Textures.CanvasTexture;
    const image = texture.canvas.toDataURL('image/png'); this.artwork.set(type, image); return image;
  }
  async reveal(slot: number, type: number, onFlip?: () => void) {
    this.tiles.get(slot)?.destroy();
    const tile = this.tile(slot, type).setVisible(false);
    const canvas = this.game.canvas.getBoundingClientRect();
    const point = this.point(slot), size = canvas.width * 108 / 360;
    try {
      await animateCardFlip({left: canvas.left + point.x / 360 * canvas.width - size / 2, top: canvas.top + point.y / 360 * canvas.height - size / 2, width: size, height: size}, this.cardArtwork(type), this.theme.characters[type].color, onFlip, this.theme.cardBack);
    } finally { if (tile.active) tile.setVisible(true); }
  }
  async highlight(slots: number[]) {
    const tiles = slots.filter(s => s >= 0).map(s => this.tiles.get(s)).filter(Boolean);
    await Promise.all(tiles.map(t => this.tween(t, { scaleX: 1.07, scaleY: 1.07, duration: 130, yoyo: true, ease: 'Sine.easeOut' })));
  }
  hide(slots: number[]) { slots.forEach(s => { this.tiles.get(s)?.destroy(); this.tiles.delete(s); }); }
  private tween(targets: unknown, config: Record<string, unknown>): Promise<void> {
    return new Promise(resolve => this.tweens.add({ targets, ...config, onComplete: () => resolve() }));
  }
}

export async function createBoard(parent: HTMLElement) {
  const scene = new BoardScene();
  const previewDpr = import.meta.env.DEV && new URLSearchParams(location.search).has('previewBoard')
    ? Number(new URLSearchParams(location.search).get('previewBoardDpr')) : 0;
  const pixels = () => boardPixels(parent.getBoundingClientRect().width, previewDpr || window.devicePixelRatio);
  const initialPixels = pixels();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: initialPixels, height: initialPixels, transparent: true,
    scene: [scene], render: { antialias: true, antialiasGL: true, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true }, banner: false,
  });
  await scene.loaded;
  const resize = () => {
    const next = pixels();
    if (game.scale.width !== next) game.scale.setGameSize(next, next);
    scene.fitViewport();
  };
  const observer = new ResizeObserver(resize); observer.observe(parent);
  window.addEventListener('resize', resize);
  game.events.once(Phaser.Core.Events.DESTROY, () => { observer.disconnect(); window.removeEventListener('resize', resize); });
  return { game, scene };
}
