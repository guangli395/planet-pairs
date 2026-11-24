import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlessingPackState, chooseBlessing, restoreBlessingPackState } from '../src/blessing-choice';

test('a sealed pack hides six unique blessings in a stable shuffled order', () => {
  const state = createBlessingPackState(null, () => 0);
  assert.equal(state.order.length, 6);
  assert.equal(new Set(state.order).size, 6);
  assert.equal(chooseBlessing(state, 'gift'), false);
  assert.deepEqual(restoreBlessingPackState(JSON.parse(JSON.stringify(state)), null), state);
});

test('the free reveal permits only one card when revisiting the same preparation', () => {
  const state = createBlessingPackState(); state.opened = true;
  assert(chooseBlessing(state, 'wish'));
  assert.equal(chooseBlessing(state, 'gift'), false);
  const restored = restoreBlessingPackState(JSON.parse(JSON.stringify(state)), 'wish');
  assert.equal(chooseBlessing(restored, 'gift'), false);
  assert.equal(restored.freePick, 'wish');
});

test('a completed ad allows all choices before or after a free reveal', () => {
  for (const picked of [null, 'echo'] as const) {
    const state = createBlessingPackState(picked); state.opened = true;
    state.unlocked = true;
    assert(chooseBlessing(state, 'gift'));
    assert(chooseBlessing(state, 'clear'));
    assert.equal(state.freePick, picked);
  }
});

test('revisiting in-memory preparation retains the completed ad unlock and free reveal', () => {
  const blessingPack = createBlessingPackState('wish'); blessingPack.unlocked = true;
  const restored = restoreBlessingPackState(blessingPack, 'wish');
  assert.deepEqual(restored, blessingPack);
  assert(chooseBlessing(restored, 'gift'));
});

test('old selected drafts keep their blessing without receiving ad privileges', () => {
  const restored = restoreBlessingPackState(undefined, 'gift');
  assert.equal(restored.opened, true);
  assert.equal(restored.freePick, 'gift');
  assert.equal(restored.unlocked, false);
  assert.equal(chooseBlessing(restored, 'clear'), false);
});
