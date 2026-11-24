// Design experiments only. Calls production rules without changing game settings.
import { BLESSINGS, createRun, drawOne, settle, needsSettlement } from '../src/rules';
import { writeFileSync } from 'node:fs';

const samplesPerBlessing = 2000;
const targets = [20, 30, 35, 40, 50, 60, 70, 80, 90, 100];
const scenarios = [
  { cards: 20, luckyWeight: 1 }, { cards: 30, luckyWeight: 1 },
  { cards: 40, luckyWeight: 1 }, { cards: 50, luckyWeight: 1 },
];
const results = [];
for (const scenario of scenarios) {
  const rows = [];
  for (const b of BLESSINGS) {
    let seed = 20261124 + BLESSINGS.indexOf(b) * 17341;
    const uniform = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const lucky = b.id === 'wish' ? [0, 8] : [0];
    const weights = Array.from({ length: 9 }, (_, i) => lucky.includes(i) ? scenario.luckyWeight : 1);
    const total = weights.reduce((a, x) => a + x, 0);
    const baseWeights = weights.map(() => 1);
    const baseTotal = baseWeights.reduce((a, x) => a + x, 0);
    // Map selected types into the production sampler's intervals; settlement stays identical.
    const sample = () => {
      let p = uniform() * total, baseEdge = 0;
      for (let i = 0; i < 9; i++) {
        p -= weights[i];
        if (p < 0) return (baseEdge + baseWeights[i] / 2) / baseTotal;
        baseEdge += baseWeights[i];
      }
      throw new Error('Sampler range');
    };
    const scores: number[] = [];
    for (let i = 0; i < samplesPerBlessing; i++) {
      const run = createRun('endless', 1, b.id, lucky, scenario.cards);
      let steps = 0;
      while (run.status === 'ready' && steps++ < 10000) {
        if (needsSettlement(run)) settle(run, sample); else drawOne(run, sample);
      }
      if (run.status !== 'exhausted') throw new Error('Run did not finish');
      scores.push(run.score);
    }
    rows.push({ blessing: b.name, mean: scores.reduce((a, s) => a + s, 0) / scores.length,
      reach: Object.fromEntries(targets.map(t => [t, scores.filter(s => s >= t).length / scores.length * 100])) });
  }
  const aggregate = { ...scenario, samples: samplesPerBlessing * BLESSINGS.length,
    mean: +(rows.reduce((a, r) => a + r.mean, 0) / rows.length).toFixed(2),
    reach: Object.fromEntries(targets.map(t => [t, +(rows.reduce((a, r) => a + r.reach[t], 0) / rows.length).toFixed(2)])),
    blessings: rows };
  results.push(aggregate);
  console.log(JSON.stringify({ ...aggregate, blessings: undefined }));
}
writeFileSync(new URL('../docs/体力版难度模拟.json', import.meta.url), JSON.stringify({ samplesPerBlessing, targets, results }, null, 2));
