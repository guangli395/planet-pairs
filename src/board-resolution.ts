export const BOARD_SIZE = 360;
export const MAX_BOARD_PIXELS = BOARD_SIZE * 3;
// All four themes share enough detail for a 3x phone display.
export const CHARACTER_PIXELS = 384;
export const CARD_ART_PIXELS = 324;

export function boardPixels(cssWidth: number, devicePixelRatio: number) {
  const width = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : BOARD_SIZE;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.max(BOARD_SIZE, Math.min(MAX_BOARD_PIXELS, Math.ceil(width * Math.min(3, ratio))));
}
