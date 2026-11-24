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
test('family bonus keeps other cards, costs no card and counts as a pair for savings', () => {
  const run = createRun('endless', 1, 'savings', [0]); run.board = [0,1,2,3,4,5,6,7,8]; run.remaining = 0; run.pairs = 2;
  const events = settle(run, () => 0);
  assert.deepEqual(events.map(e => e.kind), ['draw', 'remove']);
  assert.equal(run.remaining, 3); // lucky +1, pair +1, third-pair bonus +1
  assert.equal(run.score, 2); assert.equal(run.board.filter(v => v !== null).length, 8);
  assert.equal(run.pairs, 3);
  assert.equal(events[0].blessingReward, undefined); assert.equal(events[1].blessingReward, 1);
});
test('blessing cues distinguish total lucky rewards from extra settlement rewards', () => {
  const wish = createRun('endless', 1, 'wish', [0, 8]);
  assert.equal(drawOne(wish, () => 0).blessingReward, 1);
  wish.board = [0,1,2,3,4,5,6,7,8];
  assert.equal(settle(wish, () => 0)[0].blessingReward, 1);
  const line = createRun('endless', 1, 'line', [8]); line.board = [1,1,1,2,3,4,5,6,7];
  const triple = settle(line)[0]; assert.equal(triple.reward, 3); assert.equal(triple.blessingReward, 1);
  const clear = createRun('endless', 1, 'clear', [8]); clear.board = [1,1,null,null,null,null,null,null,null]; clear.remaining = 0;
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
test('clear blessing adds to baseline reward and never fires on an empty opening', () => {
  const run = createRun('endless',1,'clear',[8]); run.remaining = 0; run.board = [0,0,null,null,null,null,null,null,null];
  settle(run); assert.equal(run.remaining, 8);
  assert.equal(settle(createRun('endless',1,'clear',[0])).length, 0);
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
      if(needsSettlement(run)) settle(run,rng); else drawOne(run,rng);
      assert.equal(run.score+run.board.filter(v=>v!==null).length,run.drawn);
      assert(run.remaining>=0);
    }
    assert.equal(run.status,'exhausted');
    const before=JSON.stringify(run);assert.equal(settle(run,rng).length,0);assert.equal(JSON.stringify(run),before);
  }
});
