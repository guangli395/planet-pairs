import { type Blessing, type Mode } from './rules';
import { freshEnergy, refreshEnergy, type CardTier, type EnergyState } from './energy';
import { type BlessingPackState } from './blessing-choice';
import { DEFAULT_UNIVERSE, getUniverse } from './themes';

export interface SetupDraft {
  id: string; mode: Mode; stage: number; step: 'blessing' | 'lucky' | 'cards';
  blessing: Blessing | null; pick: number; lucky: number[]; cards: CardTier; cardAds: number;
  blessingPack?: BlessingPackState;
}
export interface Store extends EnergyState {
  version: 2; unlocked: number; cleared: number; endlessBest: number; sound: boolean; universe: string;
}
const KEY = 'planet-pairs-v1'; // Preserve energy, records and preferences from earlier versions.
export function freshStore(now = Date.now()): Store {
  return { ...freshEnergy(now), version: 2, unlocked: 1, cleared: 0, endlessBest: 0, sound: true, universe: DEFAULT_UNIVERSE };
}
export function decodeStore(raw: string | null, now = Date.now()): Store {
  const base = freshStore(now);
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version !== 1 && value?.version !== 2) return base;
    const result: Store = { ...base,
      unlocked: Math.max(1, Math.floor(Number(value.unlocked) || 1)),
      cleared: Math.max(0, Math.floor(Number(value.cleared) || 0)),
      endlessBest: Math.max(0, Math.floor(Number(value.endlessBest) || 0)), sound: value.sound !== false,
      universe: getUniverse(value.universe).id,
    };
    if (value.version === 2) {
      result.energy = Number.isFinite(value.energy) ? Math.max(0, Math.floor(value.energy)) : 10;
      result.energyAt = Number.isFinite(value.energyAt) ? value.energyAt : now;
      result.energyAds = Math.min(3, Math.max(0, Math.floor(Number(value.energyAds) || 0)));
      result.infinite = value.infinite === true && result.energyAds === 3;
      result.day = typeof value.day === 'string' ? value.day : base.day;
    }
    refreshEnergy(result, now); return result;
  } catch { return base; }
}
export function loadStore(): Store {
  try { return decodeStore(localStorage.getItem(KEY)); }
  catch { return freshStore(); }
}
export function refreshDay(store: Store, now = Date.now()) { return refreshEnergy(store, now); }
export function encodeStore(store: Store) {
  const {version, unlocked, cleared, endlessBest, sound, universe, energy, energyAt, energyAds, infinite, day} = store;
  return JSON.stringify({version, unlocked, cleared, endlessBest, sound, universe, energy, energyAt, energyAds, infinite, day});
}
export function saveStore(store: Store) { try { localStorage.setItem(KEY, encodeStore(store)); } catch { /* Local persistence may be unavailable. */ } }
