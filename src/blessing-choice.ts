import { BLESSINGS, type Blessing } from './rules';

export interface BlessingPackState {
  order: Blessing[];
  opened: boolean;
  freePick: Blessing | null;
  unlocked: boolean;
}

export function createBlessingPackState(previous: Blessing | null = null, random = Math.random): BlessingPackState {
  const order = BLESSINGS.map(b => b.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, opened: Boolean(previous), freePick: previous, unlocked: false };
}

export function restoreBlessingPackState(raw: unknown, previous: Blessing | null): BlessingPackState {
  const value = raw as Partial<BlessingPackState> | null;
  const ids = BLESSINGS.map(b => b.id);
  const validOrder = Array.isArray(value?.order) && value.order.length === ids.length
    && new Set(value.order).size === ids.length && value.order.every(id => ids.includes(id));
  if (!validOrder) return createBlessingPackState(previous);
  const unlocked = value!.unlocked === true;
  const freePick = ids.includes(value!.freePick as Blessing) ? value!.freePick as Blessing : unlocked ? null : previous;
  return { order: [...value!.order!], opened: value!.opened === true || Boolean(freePick || previous || unlocked), freePick, unlocked };
}

/** The first free reveal commits immediately. Further choices require a completed ad. */
export function chooseBlessing(state: BlessingPackState, id: Blessing): boolean {
  if (!state.opened || !state.order.includes(id)) return false;
  if (state.unlocked) return true;
  if (state.freePick && state.freePick !== id) return false;
  state.freePick = id;
  return true;
}
