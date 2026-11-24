// Game definitions arrive from rules.ts. There is one of each blessing in a pack.
const skin = window.__blessingInit.theme;
const warm = skin?.palette === 'warm';
const milkTea = skin?.id === 'milktea';
const gilded = skin?.material === 'gilded';
export const PACK_BRAND = {
  logo: skin?.logo ?? '星际祝福', seriesCode: '', tearHint: '横向撕开 →',
  footerLeft: '', footerRight: '', microSpec: '',
  backHeadline: skin?.logo ?? '星际祝福', backSpec: '',
};
export const PACK_THEMES = [
  {name: 'CELESTIAL', code: 'VOL.01', color: skin?.color ?? '#7152a0', highlight: skin?.highlight ?? '#d4bbe9', shadow: skin?.shadow ?? '#211c3d'},
  {name: 'STARDUST', code: 'VOL.01', color: skin?.color ?? '#7152a0', highlight: skin?.highlight ?? '#d4bbe9', shadow: skin?.shadow ?? '#211c3d'},
];
// All blessings have the same foil treatment. These levels only drive upstream effects.
export const RARITY_META = {
  common: {rank: 1, aura: 'transparent', shockColor: '#ffffff', autoFlip: true},
  rare: {rank: 2, aura: '#c6a7ff', shockColor: '#c6a7ff', autoFlip: true},
  holo: {rank: 3, aura: '#d7beff', shockColor: '#b6e9ff', autoFlip: true},
  ultra: {rank: 4, aura: '#ffbe2e', shockColor: '#ffd454', autoFlip: false},
  secret: {rank: 5, aura: '#ff5cd6', shockColor: '#ff7ae6', autoFlip: false},
};
export const MASCOT_CONFIG = {image: skin?.hero ?? '../assets/planet-2.svg', rigged: false};
const colors = skin ? skin.characters.slice(0, 6).map(character => character.color) : ['#9bdde8', '#c4a5ed', '#e9c793', '#a2ddc6', '#adc4ee', '#e9b99c'];
const planets = [3, 2, 4, 0, 7, 6];
export const CARD_POOL = window.__blessingInit.blessings.map((blessing, index) => ({
  ...blessing, tag: blessing.symbol, trait: blessing.description, serial: `00${index + 1}/006`,
  rarity: 'holo', rarityMark: '✦', rarityLabel: '旅程祝福',
  frameBg: gilded ? `linear-gradient(135deg, #9e793e, #fae5af 12%, #6b532f 26%, #1c2537 30%, #263047 64%, #cfab63 87%, #fff0bd 92%, #79603c)` : milkTea ? `linear-gradient(150deg, #fffcf1, ${colors[index]}55 30%, #e8bdac 70%, #fff4dd)` : warm ? `linear-gradient(150deg, #fff7d8, ${colors[index]}77 28%, #edb779 65%, #fff1cb)` : `linear-gradient(150deg, #fff0cc, ${colors[index]} 28%, #ab89c0 60%, #f4d8ac)`,
  plaqueBg: gilded ? 'linear-gradient(180deg, #273147, #171f30)' : warm ? `linear-gradient(180deg, #fffdf2, ${skin.face})` : 'linear-gradient(180deg, #f9efe5, #eadedb)', edgeColor: gilded ? '#b99b60' : colors[index], textColor: skin?.ink ?? '#43384e',
  windowBg: gilded ? `radial-gradient(ellipse at 50% 35%, ${colors[index]}38, #202a40 65%, #111827)` : milkTea ? `radial-gradient(ellipse at 50% 40%, #fffdf3, ${colors[index]}22 70%, #f1dfca)` : warm ? `radial-gradient(ellipse at 50% 40%, #fffdf1, ${colors[index]}40 70%, #f4d9a4)` : `radial-gradient(ellipse at 50% 40%, ${colors[index]}bb, #424568 65%, #202b44)`,
  character: {image: skin ? skin.characters[skin.blessingCharacters?.[index] ?? (warm ? index : planets[index])].image : `../assets/planet-${planets[index]}.svg`, rigged: false},
}));
