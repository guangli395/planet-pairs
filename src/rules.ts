export type Mode = 'stage' | 'endless';
export type Blessing = 'echo' | 'wish' | 'gift' | 'savings' | 'line' | 'clear';
export const BLESSINGS: { id: Blessing; name: string; symbol: string; description: string }[] = [
  { id: 'echo', name: '幸运回响', symbol: '✦', description: '每翻出一张幸运星球，立即获得 2 张奖励卡。' },
  { id: 'wish', name: '双重心愿', symbol: '❖', description: '选择两种幸运星球，翻出任意一种都奖励 1 张卡。' },
  { id: 'gift', name: '启程赠礼', symbol: '✧', description: '在所选起始牌数量上，额外获得 20 张卡。' },
  { id: 'savings', name: '配对积蓄', symbol: '∞', description: '本局每累计 3 次对碰，额外奖励 1 张卡。' },
  { id: 'line', name: '三连余韵', symbol: '≋', description: '每次横向或竖向三连，额外奖励 1 张卡。' },
  { id: 'clear', name: '清场礼赞', symbol: '☀', description: '每次清空棋盘，额外奖励 2 张卡，共获得 7 张。' },
];
export const PLANETS = [
  { name: '薄荷星', color: '#81e6cc' }, { name: '蜜桃星', color: '#ff856f' },
  { name: '星环星', color: '#d9b3ff' }, { name: '琉璃星', color: '#83ceff' },
  { name: '奶油星', color: '#f9db82' }, { name: '莓果星', color: '#c84fa4' },
  { name: '赤砂星', color: '#d85c32' }, { name: '极光星', color: '#a4b8ff' },
  { name: '青柠星', color: '#bfdf7c' },
];
export interface Run {
  id: string; mode: Mode; stage: number; target: number; board: (number | null)[];
  remaining: number; score: number; pairs: number; triples: number; drawn: number;
  blessing: Blessing; lucky: number[]; usedAd: boolean; started: boolean; giftShown?: boolean; pendingHidden?: boolean; hiddenSlot?: number; hiddenCount?: number;
  baseCards?: number; giftBonus?: number;
  status: 'ready' | 'won' | 'exhausted';
}
export interface GameEvent {
  kind: 'draw' | 'remove' | 'clear'; slots: number[]; cards: number[];
  reward: number; luckyReward?: number; blessingReward?: number; hidden?: boolean; label: string; state: Run;
}
export const snapshot = (run: Run): Run => structuredClone(run);
export function createRun(mode: Mode, stage: number, blessing: Blessing, lucky: number[], baseCards = 20): Run {
  const unique = [...new Set(lucky)];
  if (unique.length !== (blessing === 'wish' ? 2 : 1) || unique.some(x => !Number.isInteger(x) || x < 0 || x > 8)) throw Error('请选择幸运星球');
  if (![20, 30, 40, 50].includes(baseCards)) throw Error('请选择有效的起始牌数量');
  const giftBonus = blessing === 'gift' ? 20 : 0;
  return {
    id: crypto.randomUUID(), mode, stage, target: 50 + (stage - 1) * 10,
    board: Array(9).fill(null), remaining: baseCards + giftBonus, baseCards, giftBonus,
    score: 0, pairs: 0, triples: 0, drawn: 0, blessing, lucky: unique,
    usedAd: false, started: false, status: 'ready',
  };
}
export function randomPlanet(_lucky: number[], rng: () => number = Math.random): number {
  return Math.min(8, Math.floor(rng() * 9));
}
export function drawOne(run: Run, rng: () => number = Math.random): GameEvent {
  if (run.status !== 'ready' || run.remaining <= 0) throw Error('当前无法发牌');
  const slot = run.board.indexOf(null);
  if (slot < 0) throw Error('请先结算棋盘');
  const card = randomPlanet(run.lucky, rng);
  run.remaining--; run.drawn++; run.started = true; run.board[slot] = card;
  const reward = run.lucky.includes(card) ? (run.blessing === 'echo' ? 2 : 1) : 0;
  run.remaining += reward;
  const blessingReward = reward && (run.blessing === 'echo' || run.blessing === 'wish') ? reward : undefined;
  return { kind: 'draw', slots: [slot], cards: [card], reward, blessingReward, label: reward ? '幸运降临' : PLANETS[card].name, state: snapshot(run) };
}
export function needsSettlement(run: Run): boolean {
  return run.status === 'ready' && (run.remaining === 0 || !run.board.includes(null));
}
export function settle(run: Run, rng: () => number = Math.random): GameEvent[] {
  if (!needsSettlement(run)) return [];
  const events: GameEvent[] = [];
  let removed = false;
  const remove = (slots: number[], cards: number[], triple: boolean, luckyReward = 0) => {
    let reward = triple ? 2 : 1;
    let label = triple ? '三连' : '对碰';
    if (triple) {
      run.triples++;
      if (run.blessing === 'line') { reward++; label += ' · 祝福'; }
    } else {
      run.pairs++;
      if (run.blessing === 'savings' && run.pairs % 3 === 0) { reward++; label += ' · 积蓄'; }
    }
    slots.filter(s => s >= 0).forEach(s => { run.board[s] = null; });
    run.remaining += reward; run.score += cards.length; removed = true;
    if (run.mode === 'stage' && run.score >= run.target) run.status = 'won';
    events.push({ kind: 'remove', slots, cards, reward, luckyReward, blessingReward: reward - (triple ? 2 : 1) || undefined, label, state: snapshot(run) });
  };
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]];
  for (const line of lines) {
    const card = run.board[line[0]];
    if (card !== null && line.every(s => run.board[s] === card)) remove(line, [card, card, card], true);
    if (run.status === 'won') return events;
  }
  for (let type = 0; type < 9; type++) {
    const slots = run.board.flatMap((v, i) => v === type ? [i] : []);
    for (let i = 0; i + 1 < slots.length; i += 2) {
      remove([slots[i], slots[i + 1]], [type, type], false);
      if (run.status === 'won') return events;
    }
  }
  if (!run.board.includes(null)) {
    const bonus = randomPlanet(run.lucky, rng);
    const luckyReward = run.lucky.includes(bonus) ? (run.blessing === 'echo' ? 2 : 1) : 0;
    run.remaining += luckyReward; run.drawn++;
    const blessingReward = luckyReward && (run.blessing === 'echo' || run.blessing === 'wish') ? luckyReward : undefined;
    events.push({ kind: 'draw', slots: [-1], cards: [bonus], reward: luckyReward, blessingReward, label: '全家福 · 免费加翻', state: snapshot(run) });
    remove([-1, run.board.indexOf(bonus)], [bonus, bonus], false);
    if (run.status === 'won') return events;
  }
  if (removed && run.board.every(v => v === null)) {
    const reward = run.blessing === 'clear' ? 7 : 5;
    run.remaining += reward;
    events.push({ kind: 'clear', slots: [], cards: [], reward, blessingReward: reward - 5 || undefined, label: '清台' + (reward === 7 ? ' · 祝福' : ''), state: snapshot(run) });
  }
  run.status = run.remaining > 0 ? 'ready' : 'exhausted';
  if (events.length) events[events.length - 1].state = snapshot(run);
  return events;
}
export function continueRun(run: Run): boolean {
  if (run.status !== 'exhausted' || run.usedAd) return false;
  run.remaining += 10; run.usedAd = true; run.status = 'ready'; return true;
}
export function shanghaiDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
