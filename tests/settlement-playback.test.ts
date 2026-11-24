import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRun, settle, type Run } from '../src/rules';
import { SettlementPlayback } from '../src/settlement-playback';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('later groups start before earlier rewards arrive and old arrivals keep the latest progress', async () => {
  const frames: { remaining: number; score: number }[] = [];
  const playback = new SettlementPlayback({ remaining: 10, score: 0 }, state => frames.push(state));
  const first = deferred(), second = deferred();
  let firstArrival!: () => void, secondArrival!: () => void;
  playback.returnCards({ remaining: 12, score: 2 }, 2, arrive => { firstArrival = arrive; return first.promise; });
  playback.returnCards({ remaining: 15, score: 5 }, 3, arrive => { secondArrival = arrive; return second.promise; });
  assert.deepEqual(frames.at(-1), { remaining: 10, score: 5 });

  secondArrival(); firstArrival();
  assert.deepEqual(frames.at(-1), { remaining: 12, score: 5 });
  let finished = false;
  const finishing = playback.finish().then(() => { finished = true; });
  firstArrival(); firstArrival(); // Duplicate completion must not add an extra card.
  first.resolve();
  await first.promise;
  assert.equal(finished, false);
  assert.deepEqual(frames.at(-1), { remaining: 13, score: 5 });
  secondArrival(); secondArrival(); second.resolve();
  await finishing;
  assert.equal(finished, true);
  assert.deepEqual(frames.at(-1), { remaining: 15, score: 5 });
});

test('triple, three pairs and a clear preserve every reward when flights finish out of order', async () => {
  const run = createRun('endless', 1, 'line', [8]);
  run.board = [0, 0, 0, 1, 2, 1, 2, 3, 3]; run.remaining = 11; run.drawn = 9; run.started = true;
  const frames: Run[] = [];
  const playback = new SettlementPlayback(run, state => frames.push(state));
  const flights: { arrive: () => void; count: number; done: ReturnType<typeof deferred> }[] = [];
  const events = settle(run);
  assert.deepEqual(events.map(event => event.reward), [3, 1, 1, 1, 5]);
  for (const event of events) {
    const done = deferred();
    playback.returnCards(event.state, event.reward, arrive => {
      flights.push({ arrive, count: event.reward, done }); return done.promise;
    });
  }
  assert.equal(frames.at(-1)!.remaining, 11);
  assert.equal(frames.at(-1)!.score, 9);
  for (const flight of flights.reverse()) {
    for (let i = 0; i < flight.count; i++) flight.arrive();
    flight.done.resolve();
    assert.equal(frames.at(-1)!.score, 9);
    assert.deepEqual(frames.at(-1)!.board, Array(9).fill(null));
  }
  await playback.finish();
  assert.deepEqual(frames.at(-1), run);
  assert.equal(run.remaining, 22);
});

test('a failed animation is observed immediately but recovery waits for the other flights', async () => {
  const playback = new SettlementPlayback({ remaining: 10 }, () => {});
  const failed = deferred(), flying = deferred();
  const error = new Error('cancelled flight');
  playback.track(failed.promise); playback.track(flying.promise);
  failed.reject(error);
  let drained = false;
  const finishing = playback.finish().finally(() => { drained = true; });
  const rejection = assert.rejects(finishing, candidate => candidate === error);
  await failed.promise.catch(() => {});
  assert.equal(drained, false);
  flying.resolve();
  await rejection;
  assert.equal(drained, true);
});
