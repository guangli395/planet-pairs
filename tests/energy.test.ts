import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENERGY_INTERVAL, freshEnergy, refreshEnergy, recoveryRemaining, spendEnergy, claimEnergyAd, cardAdsRequired } from '../src/energy';
import { decodeStore, freshStore, encodeStore } from '../src/store';
import { createRun } from '../src/rules';

const NOW = Date.parse('2026-11-24T00:00:00Z');
test('energy restores one point per ten minutes and preserves partial elapsed time', () => {
  const state = freshEnergy(NOW); spendEnergy(state, NOW); spendEnergy(state, NOW);
  assert.equal(state.energy, 8);
  assert.equal(recoveryRemaining(state, NOW + ENERGY_INTERVAL - 1), 1);
  refreshEnergy(state, NOW + ENERGY_INTERVAL); assert.equal(state.energy, 9);
  spendEnergy(state, NOW + ENERGY_INTERVAL + 5000);
  assert.equal(recoveryRemaining(state, NOW + ENERGY_INTERVAL + 5000), ENERGY_INTERVAL - 5000);
  refreshEnergy(state, NOW + 100 * ENERGY_INTERVAL); assert.equal(state.energy, 10);
});
test('full or excess energy does not bank recovery credit', () => {
  const state = freshEnergy(NOW); claimEnergyAd(state, NOW);
  assert.equal(state.energy, 15); refreshEnergy(state, NOW + 5 * ENERGY_INTERVAL);
  assert.equal(state.energy, 15);
  for (let i = 0; i < 6; i++) assert(spendEnergy(state, NOW + 5 * ENERGY_INTERVAL));
  assert.equal(state.energy, 9);
  assert.equal(recoveryRemaining(state, NOW + 5 * ENERGY_INTERVAL), ENERGY_INTERVAL);
});
test('three energy ads grant five, five, then unlimited and unlock thirty cards', () => {
  const state = freshEnergy(NOW);
  assert.equal(cardAdsRequired(20, state, NOW), 0); assert.equal(cardAdsRequired(30, state, NOW), null);
  assert.equal(cardAdsRequired(40, state, NOW), 1); assert.equal(cardAdsRequired(50, state, NOW), 2);
  claimEnergyAd(state, NOW); assert.equal(state.energy, 15); assert.equal(state.energyAds, 1);
  claimEnergyAd(state, NOW); assert.equal(state.energy, 20); assert.equal(state.energyAds, 2);
  claimEnergyAd(state, NOW); assert(state.infinite); assert.equal(state.energyAds, 3);
  assert.equal(cardAdsRequired(30, state, NOW), 0);
  for (let i = 0; i < 15; i++) assert(spendEnergy(state, NOW));
  assert.equal(state.energy, 20); assert.equal(claimEnergyAd(state, NOW), false);
  assert.equal(cardAdsRequired(40, state, NOW), 1); assert.equal(cardAdsRequired(50, state, NOW), 2);
});
test('Shanghai midnight ends unlimited, restores ten, resets ads and locks thirty', () => {
  const before = Date.parse('2026-11-24T15:59:59Z');
  const after = Date.parse('2026-11-24T16:00:00Z');
  const state = freshEnergy(before);
  for (let i = 0; i < 3; i++) claimEnergyAd(state, before);
  refreshEnergy(state, after);
  assert.equal(state.energy, 10); assert.equal(state.infinite, false); assert.equal(state.energyAds, 0);
  assert.equal(cardAdsRequired(30, state, after), null);
  claimEnergyAd(state, after); assert.equal(state.energyAds, 1); assert.equal(state.energy, 15);
});
test('normal recovery crosses midnight without a separate daily refill', () => {
  const start = Date.parse('2026-11-24T15:55:00Z');
  const state = freshEnergy(start); state.energy = 0;
  refreshEnergy(state, start + ENERGY_INTERVAL); assert.equal(state.energy, 1);
  assert.equal(state.day, '2026-11-25');
});
test('energy exhaustion blocks a new run and countdown recovers it', () => {
  const state = freshEnergy(NOW);
  for (let i = 0; i < 10; i++) assert(spendEnergy(state, NOW));
  assert.equal(spendEnergy(state, NOW), false);
  assert(spendEnergy(state, NOW + ENERGY_INTERVAL)); assert.equal(state.energy, 0);
});
test('old saves keep permanent progress and settings but discard unfinished runs', () => {
  const run = createRun('endless', 1, 'echo', [0]); run.started = true; run.score = 12;
  const state = decodeStore(JSON.stringify({ version: 1, chances: 0, day: '2026-11-01', unlocked: 4, cleared: 3, endlessBest: 100, sound: false, saves: { stage: null, endless: run } }), NOW);
  assert.equal(state.version, 2); assert.equal(state.energy, 10); assert.equal(state.unlocked, 4);
  assert.equal(state.cleared, 3); assert.equal(state.endlessBest, 100);
  assert.equal('saves' in state, false); assert.equal('drafts' in state, false);
  assert.equal('chances' in state, false); assert.equal(state.sound, false);
});
test('reload discards preparation and blessing privileges while keeping energy rewards', () => {
  const state = freshStore(NOW);
  claimEnergyAd(state, NOW);
  const legacy = { ...state, drafts: {stage: {id: 'pending', mode: 'stage', stage: 1, step: 'cards', blessing: 'wish', pick: 1, lucky: [0, 8], cards: 50, cardAds: 1, blessingPack: {unlocked: true}}, endless: null}, saves: {stage: createRun('stage', 1, 'echo', [0]), endless: null} };
  const restored = decodeStore(JSON.stringify(legacy), NOW + 1000);
  assert.equal('drafts' in restored, false); assert.equal('saves' in restored, false);
  assert.equal(restored.energyAds, 1); assert.equal(restored.energy, 15);
  assert.equal(cardAdsRequired(50, restored, NOW + 1000), 2);
});
test('storage serialization includes only permanent state and supports reload without session keys', () => {
  const state = freshStore(NOW); state.unlocked = 5; state.cleared = 4; state.endlessBest = 123; state.sound = false;
  spendEnergy(state, NOW);
  const polluted = {...state, saves: {stage: createRun('stage', 1, 'echo', [0])}, drafts: {stage: {cardAds: 1}}};
  const raw = encodeStore(polluted);
  assert.equal('saves' in JSON.parse(raw), false); assert.equal('drafts' in JSON.parse(raw), false);
  assert.deepEqual(decodeStore(raw, NOW), state);
  assert.equal('saves' in polluted, true); // Serializing must not clear a live in-memory value.
});
test('invalid local storage falls back to fresh energy', () => {
  assert.equal(decodeStore('{broken', NOW).energy, 10);
  assert.equal(decodeStore('null', NOW).version, 2);
});
