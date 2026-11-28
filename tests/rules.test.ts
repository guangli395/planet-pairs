import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRun, drawOne, settle, needsSettlement, continueRun, randomPlanet, shanghaiDay, BLESSINGS, type Blessing } from '../src/rules';

test('a lucky last card restores the deal allowance immediately', () => {
  const run = createRun('endless', 1, 'echo', [0]); run.remaining = 1;
  const event = drawOne(run, () => 0);
  assert.equal(event.reward, 2); assert.equal(event.blessingReward, 2); assert.equal(run.remaining, 2); assert.equal(needsSettlement(run), false);
});
test('crossed triples resolve horizontally before pairing the two remaining cards', () => {
  const run = createRun('endless', 1, 'gift', [8]);
  run.board = [1, 0, 2, 0, 0, 0, 3, 0, 4]; run.remaining = 4;
  const events = settle(run);
  assert.deepEqual(events.map(e => e.slots), [[3, 4, 5], [1, 7]]);
  assert.equal(run.remaining, 7); assert.equal(run.score, 5);
});
test('diagonal cards are a pair, not a triple', () => {
  const run = createRun('endless', 1, 'line', [8]); run.board = [0, 1, 2, 3, 0, 4, 5, 6, 0];
  settle(run); assert.equal(run.triples, 0); assert.equal(run.pairs, 1); assert.equal(run.score, 2);
});
test('final settlement is permitted on a partially filled board', () => {
  const run = createRun('endless', 1, 'gift', [8]); run.board = [2, null, 2, null, null, null, null, null, null]; run.remaining = 0;
  settle(run); assert.equal(run.score, 2); assert.equal(run.remaining, 6); assert.equal(run.status, 'ready');
});
test('collecting nine types clears once without a redraw or advancing savings', t => {
  const run = createRun('endless', 1, 'savings', [0]); run.board = [0,1,2,3,4,5,6,7,8]; run.remaining = 0; run.pairs = 2;
  run.drawn = 9;
  t.mock.method(Math, 'random', () => { throw Error('settlement must not draw a card'); });
  const events = settle(run);
  assert.deepEqual(events.map(e => e.kind), ['collection']);
  assert.deepEqual(events[0].slots, [0,1,2,3,4,5,6,7,8]);
  assert.deepEqual(events[0].cards, [0,1,2,3,4,5,6,7,8]);
  assert.equal(events[0].reward, 5); assert.equal(events[0].blessingReward, undefined);
  assert.equal(run.remaining, 5); assert.equal(run.score, 9); assert.equal(run.drawn, 9);
  assert(run.board.every(v => v === null)); assert.equal(run.pairs, 2); assert.equal(run.triples, 0);
  assert.equal(run.status, 'ready'); assert.deepEqual(events[0].state, run);
  assert.deepEqual(settle(run), []); assert.equal(run.remaining, 5);
  run.board = [0,0,null,null,null,null,null,null,null]; run.remaining = 0;
  assert.equal(settle(run)[0].blessingReward, 1); // The next real pair is still the third pair.
});
test('blessing cues distinguish total lucky rewards from extra settlement rewards', () => {
  const wish = createRun('endless', 1, 'wish', [0, 8]);
  assert.equal(drawOne(wish, () => 0).blessingReward, 1);
  wish.board = [0,1,2,3,4,5,6,7,8];
  assert.equal(settle(wish)[0].blessingReward, undefined);
  const line = createRun('endless', 1, 'line', [8]); line.board = [1,1,1,2,3,4,5,6,7];
  const triple = settle(line)[0]; assert.equal(triple.reward, 3); assert.equal(triple.blessingReward, 1);
  const clear = createRun('endless', 1, 'clear', [8]); clear.board = [0,1,2,3,4,5,6,7,8];
  const cleared = settle(clear).at(-1)!; assert.equal(cleared.reward, 7); assert.equal(cleared.blessingReward, 2);
});
test('ordinary rewards and non-milestone pairs never announce a blessing bonus', () => {
  const run = createRun('endless', 1, 'savings', [8]);
  assert.equal(drawOne(run, () => .999).blessingReward, undefined);
  run.board = [0,0,1,1,2,3,4,5,6]; run.pairs = 1;
  const events = settle(run);
  assert.equal(events[0].blessingReward, undefined); assert.equal(events[1].blessingReward, 1);
  run.board = [0,0,null,null,null,null,null,null,null]; run.remaining = 0;
  assert.equal(settle(run).at(-1)!.blessingReward, undefined);
});
test('stage victory stops at the triggering group, without carrying excess progress', () => {
  const run = createRun('stage', 1, 'line', [8]); run.score = 49; run.board = [0,0,0,1,1,2,3,4,5];
  const events = settle(run); assert.equal(run.status, 'won'); assert.equal(run.score, 52);
  assert.equal(events.length, 1); assert.equal(run.board[3], 1);
  const next = createRun('stage', 2, 'gift', [4]); assert.equal(next.target, 60); assert.equal(next.score, 0); assert.equal(next.remaining, 40); assert(next.board.every(x=>x===null));
});
test('collection blessing does not enhance ordinary clears or empty openings', () => {
  const run = createRun('endless',1,'clear',[8]); run.remaining = 0; run.board = [0,0,null,null,null,null,null,null,null];
  const events = settle(run);
  assert.deepEqual(events.map(e => e.kind), ['remove', 'clear']);
  assert.equal(events[1].reward, 5); assert.equal(events[1].blessingReward, undefined); assert.equal(run.remaining, 6);
  assert.equal(settle(createRun('endless',1,'clear',[0])).length, 0);
});

test('collection grants five or seven once across all blessings without lucky rewards', () => {
  for (const { id } of BLESSINGS) {
    const run = createRun('endless', 1, id, id === 'wish' ? [0, 8] : [0]);
    run.board = [8,7,6,5,4,3,2,1,0]; run.remaining = 11; run.drawn = 9;
    const events = settle(run);
    const reward = id === 'clear' ? 7 : 5;
    assert.equal(events.length, 1); assert.equal(events[0].kind, 'collection');
    assert.equal(events[0].reward, reward); assert.equal(events[0].blessingReward, id === 'clear' ? 2 : undefined);
    assert.deepEqual(events[0].cards, [8,7,6,5,4,3,2,1,0]);
    assert.equal(run.remaining, 11 + reward); assert.equal(run.score, 9); assert.equal(run.drawn, 9);
    assert.equal(run.pairs, 0); assert.equal(run.triples, 0);
    assert.deepEqual(events[0].state, run);
  }
});

test('duplicates resolve as triples and pairs without collecting unrelated cards', () => {
  const run = createRun('endless', 1, 'clear', [8]);
  run.board = [0,0,0,1,2,1,3,4,5]; run.remaining = 11;
  const events = settle(run);
  assert.deepEqual(events.map(e => e.kind), ['remove', 'remove']);
  assert.equal(run.score, 5); assert.equal(run.remaining, 14);
  assert.deepEqual(run.board, [null,null,null,null,2,null,3,4,5]);
  assert.equal(run.triples, 1); assert.equal(run.pairs, 1);
});

test('an exhausted partial collection stays on the board and does not receive a collection reward', () => {
  const run = createRun('endless', 1, 'clear', [8]); run.remaining = 0;
  run.board = [0,1,2,3,4,5,6,7,null]; run.drawn = 8;
  assert.deepEqual(settle(run), []); assert.equal(run.status, 'exhausted');
  assert.equal(run.score, 0); assert.equal(run.remaining, 0); assert.equal(run.board.filter(v => v !== null).length, 8);
});

test('collection can win a stage with all nine collected and its reward already included', () => {
  for (const id of ['echo', 'clear'] as const) {
    const run = createRun('stage', 1, id, [8]); run.score = 45; run.drawn = 54; run.remaining = 0;
    run.board = [0,1,2,3,4,5,6,7,8];
    const events = settle(run);
    assert.equal(events.length, 1); assert.equal(events[0].kind, 'collection'); assert.equal(run.status, 'won');
    assert.equal(run.score, 54); assert.equal(run.drawn, 54); assert.equal(run.remaining, id === 'clear' ? 7 : 5);
    assert(run.board.every(v => v === null)); assert.deepEqual(events[0].state, run);
    assert.deepEqual(settle(run), []);
  }
});
test('ad continuation is once per challenge and retains counters', () => {
  const run = createRun('endless',1,'savings',[2]); run.status='exhausted';run.remaining=0;run.score=44;run.pairs=8;
  assert(continueRun(run)); assert.equal(run.remaining,10);assert.equal(run.score,44);assert.equal(run.pairs,8);
  run.status='exhausted';run.remaining=0;assert.equal(continueRun(run),false);
});
test('all nine types have equal probability regardless of lucky choices', () => {
  for (const lucky of [[0], [0, 8], [4]]) for (let i = 0; i < 9; i++) {
    assert.equal(randomPlanet(lucky, () => (i + .5) / 9), i);
  }
  assert.equal(randomPlanet([0],()=>1/9-.00001),0);
  assert.equal(randomPlanet([0],()=>1/9+.00001),1);
  assert.throws(()=>createRun('stage',1,'wish',[0,0]));
});
test('starting tiers stay fixed across stages and gift adds twenty once', () => {
  for (const cards of [20, 30, 40, 50]) {
    const plain = createRun('stage', 8, 'clear', [0], cards);
    assert.equal(plain.remaining, cards); assert.equal(plain.target, 120);
    const gift = createRun('endless', 1, 'gift', [0], cards);
    assert.equal(gift.remaining, cards + 20); assert.equal(gift.giftBonus, 20);
    gift.status = 'exhausted'; gift.remaining = 0;
    assert(continueRun(gift)); assert.equal(gift.remaining, 10);
  }
  assert.throws(() => createRun('stage', 1, 'gift', [0], 25));
});
test('daily date respects Shanghai midnight', () => {
  assert.equal(shanghaiDay(new Date('2026-11-24T15:59:59Z')), '2026-11-24');
  assert.equal(shanghaiDay(new Date('2026-11-24T16:00:00Z')), '2026-11-25');
});
test('many seeded challenges preserve card count across settlements and finish', () => {
  let seed=3109;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const b of BLESSINGS) for(let sample=0;sample<40;sample++){
    const run=createRun('endless',1,b.id as Blessing,b.id==='wish'?[0,1]:[0]);let operations=0;
    while(run.status==='ready'&&operations++<5000){
      if(needsSettlement(run)) settle(run); else drawOne(run,rng);
      assert.equal(run.score+run.board.filter(v=>v!==null).length,run.drawn);
      assert(run.remaining>=0);
    }
    assert.equal(run.status,'exhausted');
    const before=JSON.stringify(run);assert.equal(settle(run).length,0);assert.equal(JSON.stringify(run),before);
  }
});
