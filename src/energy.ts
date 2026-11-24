import { shanghaiDay } from './rules';

export const ENERGY_CAP = 10;
export const ENERGY_INTERVAL = 10 * 60 * 1000;
export const CARD_TIERS = [20, 30, 40, 50] as const;
export type CardTier = typeof CARD_TIERS[number];
export interface EnergyState {
  day: string; energy: number; energyAt: number; energyAds: number; infinite: boolean;
}
export function freshEnergy(now = Date.now()): EnergyState {
  return { day: shanghaiDay(new Date(now)), energy: ENERGY_CAP, energyAt: now, energyAds: 0, infinite: false };
}
/** Offline recovery uses elapsed time; only unlimited energy refills to ten at midnight. */
export function refreshEnergy(state: EnergyState, now = Date.now()): boolean {
  const before = `${state.day}|${state.energy}|${state.energyAds}|${state.infinite}`;
  const day = shanghaiDay(new Date(now));
  if (day !== state.day) {
    if (state.infinite) { state.energy = ENERGY_CAP; state.energyAt = now; }
    state.day = day; state.energyAds = 0; state.infinite = false;
  }
  if (state.infinite || state.energy >= ENERGY_CAP || now < state.energyAt) state.energyAt = now;
  else {
    const gained = Math.floor((now - state.energyAt) / ENERGY_INTERVAL);
    state.energy = Math.min(ENERGY_CAP, state.energy + gained);
    state.energyAt = state.energy >= ENERGY_CAP ? now : state.energyAt + gained * ENERGY_INTERVAL;
  }
  return before !== `${state.day}|${state.energy}|${state.energyAds}|${state.infinite}`;
}
export function recoveryRemaining(state: EnergyState, now = Date.now()): number | null {
  refreshEnergy(state, now);
  return state.infinite || state.energy >= ENERGY_CAP ? null : Math.max(0, ENERGY_INTERVAL - (now - state.energyAt));
}
export function canSpendEnergy(state: EnergyState, now = Date.now()): boolean {
  refreshEnergy(state, now); return state.infinite || state.energy > 0;
}
export function spendEnergy(state: EnergyState, now = Date.now()): boolean {
  if (!canSpendEnergy(state, now)) return false;
  if (!state.infinite) state.energy--;
  return true;
}
/** Only the energy plus / insufficient-energy placement may call this. */
export function claimEnergyAd(state: EnergyState, now = Date.now()): boolean {
  refreshEnergy(state, now);
  if (state.infinite) return false;
  state.energyAds++;
  if (state.energyAds >= 3) { state.energyAds = 3; state.infinite = true; state.energyAt = now; }
  else { state.energy += 5; if (state.energy >= ENERGY_CAP) state.energyAt = now; }
  return true;
}
/** null means the thirty-card tier needs today's three energy-ad claims first. */
export function cardAdsRequired(tier: CardTier, state: EnergyState, now = Date.now()): number | null {
  refreshEnergy(state, now);
  if (tier === 30) return state.energyAds >= 3 ? 0 : null;
  return tier === 50 ? 2 : tier === 40 ? 1 : 0;
}
