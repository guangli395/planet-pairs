import { PLANETS } from './rules';

export interface CharacterAppearance { name: string; color: string; image: string }
export interface UniverseTheme {
  id: string;
  name: string;
  palette: 'night' | 'warm';
  hero: number;
  material?: 'gilded';
  blessingCharacters?: readonly number[];
  characters: readonly CharacterAppearance[];
  cardBack: string;
  hiddenPack: string;
  copy: { title: string; subtitle: string; blessing: string; subject: string; unit: string; journey: string; pack: string; welcome: string; clear: string; desktop: string };
  colors: Record<string, string>;
  board: { slot: string; edge: string; dot: string; face: readonly [string, string, string]; side: string; ink: string };
  pack: { color: string; highlight: string; shadow: string; face: string; ink: string };
}

// Appearance alone maps the same nine rule IDs. New universes register here;
// game probabilities, rewards and achievements never depend on the skin.
export const UNIVERSES: readonly UniverseTheme[] = [
  {
    id: 'classic', name: '经典宇宙', palette: 'night', hero: 2,
    characters: PLANETS.map((p, i) => ({ ...p, image: `./assets/planet-${i}.svg` })),
    cardBack: './assets/cardback.svg', hiddenPack: './assets/hidden-pack.svg',
    copy: { title: '星球', subtitle: '翻出小惊喜，收集大宇宙', blessing: '星际祝福', subject: '星球', unit: '颗星球', journey: '星际旅程', pack: '星尘包', welcome: '让星球相遇，让好运发生', clear: '清台！一整片宇宙都为你闪耀', desktop: '把小小的幸运<br>收进你的宇宙。' },
    colors: { 'theme-accent': '#ae96e5', 'theme-secondary': '#9fe4d4', 'theme-ink': '#f4f0ff', 'theme-muted': '#a6aac8', 'theme-surface': '#252942', 'theme-soft': '#ffffff0b', 'theme-edge': '#c5b5e52b', 'theme-page': '#101326' },
    board: { slot: '#141c36', edge: '#7180a8', dot: '#8d95bd', face: ['#fff8eb', '#eee8f2', '#d5d0e5'], side: '#696380', ink: '#606079' },
    pack: { color: '#7152a0', highlight: '#d4bbe9', shadow: '#211c3d', face: '#eadedb', ink: '#43384e' },
  },
  {
    id: 'carrot', name: '萝卜宇宙', palette: 'warm', hero: 0,
    characters: [
      ['绿', '#6d9c45'], ['粉', '#f49bcd'], ['紫', '#a582c7'],
      ['蓝', '#679ccf'], ['黄', '#f0df2e'], ['红', '#bd2942'],
      ['橙', '#df7619'], ['青', '#4fafa0'], ['白', '#b1b9a2'],
    ].map(([name, color], i) => ({ name: `${name}萝卜星球`, color, image: `./assets/carrot/carrot-${i}.svg` })),
    cardBack: './assets/carrot/cardback.svg', hiddenPack: './assets/carrot/hidden-pack.svg',
    copy: { title: '萝卜', subtitle: '翻出小可爱，收获好心情', blessing: '萝卜祝福', subject: '萝卜', unit: '根萝卜', journey: '萝卜乐园', pack: '惊喜萝卜包', welcome: '让萝卜碰个面，好运就出现', clear: '清台！收获满满一篮小可爱', desktop: '把小小的开心<br>装进萝卜口袋。' },
    colors: { 'theme-accent': '#de7b3d', 'theme-secondary': '#6b904a', 'theme-ink': '#61452f', 'theme-muted': '#997b60', 'theme-surface': '#fffdf6', 'theme-soft': '#f6e8d4', 'theme-edge': '#e6cdb0', 'theme-page': '#f4e7d4', 'warm-bg': '#fff4df', 'warm-card': '#fffdf6', 'warm-soft': '#faecd6', 'warm-ink': '#61452f', 'warm-muted': '#997b60', 'warm-edge': '#e6cdb0', 'warm-orange': '#de7b3d', 'warm-orange-light': '#f2b16b', 'warm-green': '#6b904a', 'warm-green-light': '#a9c77d' },
    board: { slot: '#d7b98c', edge: '#c49a64', dot: '#b69a72', face: ['#ffffff', '#fff9ec', '#f2dfc1'], side: '#c6a77a', ink: '#775a3c' },
    pack: { color: '#e8a35f', highlight: '#ffedbf', shadow: '#9d572f', face: '#fff5dd', ink: '#69432e' },
  },
  {
    id: 'milktea', name: '奶茶宇宙', palette: 'warm', hero: 0,
    characters: [
      ['伯牙', '#a82b34'], ['茉莉', '#527b47'], ['拿铁', '#7b3349'],
      ['豆乳', '#2469ab'], ['糯米', '#c14580'], ['波霸', '#23754e'],
      ['三兄弟', '#ed762c'], ['烤奶', '#256961'], ['珍珠', '#de343e'],
    ].map(([name, color], i) => ({ name, color, image: `./assets/milktea/drink-${i}.svg` })),
    cardBack: './assets/milktea/cardback.svg', hiddenPack: './assets/milktea/hidden-pack.svg',
    copy: { title: '奶茶', subtitle: '今天的快乐，满杯供应', blessing: '满杯祝福', subject: '奶茶', unit: '杯奶茶', journey: '甜蜜茶铺', pack: '奶茶惊喜包', welcome: '让奶茶碰杯，让快乐续杯', clear: '清台！今天的快乐，满杯续上', desktop: '把今天的快乐<br>装进奶茶杯。' },
    colors: { 'theme-accent': '#ba383b', 'theme-secondary': '#906047', 'theme-ink': '#573d32', 'theme-muted': '#997665', 'theme-surface': '#fffcf5', 'theme-soft': '#f8e7d7', 'theme-edge': '#e7c8b4', 'theme-page': '#f1e5d7', 'warm-bg': '#fff6e9', 'warm-card': '#fffcf5', 'warm-soft': '#f8e7d7', 'warm-ink': '#573d32', 'warm-muted': '#997665', 'warm-edge': '#e7c8b4', 'warm-orange': '#ba383b', 'warm-orange-light': '#ebaba0', 'warm-green': '#906047', 'warm-green-light': '#d8b997', 'tea-red': '#ba383b', 'tea-red-light': '#d85b59', 'tea-red-dark': '#8e292e', 'tea-cream': '#fff6e9', 'tea-paper': '#fffcf5', 'tea-brown': '#906047', 'tea-caramel': '#b98a60', 'tea-blush': '#f7ded5' },
    board: { slot: '#d9b696', edge: '#b48466', dot: '#bb8e72', face: ['#ffffff', '#fffaf0', '#f2deca'], side: '#c6a084', ink: '#745241' },
    pack: { color: '#c24643', highlight: '#ffe6c6', shadow: '#78322d', face: '#fff8e9', ink: '#6e3e32' },
  },
  {
    id: 'naiwa', name: '奶娃宇宙', palette: 'night', hero: 0, material: 'gilded',
    blessingCharacters: [0, 1, 2, 3, 4, 5],
    characters: [
      ['黄', '#edc04a'], ['红', '#dc4e4d'], ['紫', '#9756d3'],
      ['蓝', '#4b9cdb'], ['绿', '#60b963'], ['粉', '#e877b3'],
      ['橙', '#e69635'], ['青', '#45beb2'], ['白', '#c4c3b5'],
    ].map(([name, color], i) => ({name: `${name}奶娃`, color, image: `./assets/naiwa/naiwa-${i}.png`})),
    cardBack: './assets/naiwa/cardback.svg', hiddenPack: './assets/naiwa/hidden-pack.svg',
    copy: {title: '奶娃', subtitle: '翻开一份可爱，遇见满满好运', blessing: '鎏金祝福', subject: '奶娃', unit: '只奶娃', journey: '鎏金旅程', pack: '奶娃惊喜包', welcome: '让奶娃相遇，让好运闪光', clear: '清台！把闪闪的好运全部收好', desktop: '把闪闪的好运<br>藏进奶娃宇宙。'},
    colors: {'theme-accent': '#dfc184', 'theme-secondary': '#a9bcca', 'theme-ink': '#f4ecda', 'theme-muted': '#acadb7', 'theme-surface': '#222a3a', 'theme-soft': '#d6bb7610', 'theme-edge': '#ccb17545', 'theme-page': '#0d1220', 'naiwa-gold': '#dfc184', 'naiwa-gold-light': '#fff0bd', 'naiwa-gold-dark': '#806039', 'naiwa-ink': '#f4ecda', 'naiwa-muted': '#a5a8b6', 'naiwa-panel': '#20283a', 'naiwa-deep': '#111827', 'naiwa-edge': '#bea16b4d'},
    board: {slot: '#101728', edge: '#b89b62', dot: '#bbaa7f', face: ['#323b50', '#20283a', '#161d2c'], side: '#94764a', ink: '#e7d6ae'},
    pack: {color: '#252d40', highlight: '#e2c78e', shadow: '#080d18', face: '#20283a', ink: '#f3dfae'},
  },
];

export const DEFAULT_UNIVERSE = 'classic';
export function getUniverse(id: unknown): UniverseTheme {
  return UNIVERSES.find(theme => theme.id === id) ?? UNIVERSES[0];
}

/** Resolve parent-relative files before sending appearance into the pack iframe. */
export function packAppearance(theme: UniverseTheme, base: string) {
  return {
    id: theme.id, palette: theme.palette, material: theme.material, blessingCharacters: theme.blessingCharacters, logo: theme.copy.blessing,
    hero: new URL(theme.characters[theme.hero].image, base).href,
    characters: theme.characters.map(character => ({ ...character, image: new URL(character.image, base).href })),
    cardBack: new URL(theme.cardBack, base).href, backEdge: theme.board.side, colors: theme.colors, ...theme.pack,
  };
}
