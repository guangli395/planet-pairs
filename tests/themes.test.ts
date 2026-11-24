import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UNIVERSES, getUniverse, packAppearance } from '../src/themes';
import { freshStore, decodeStore, encodeStore } from '../src/store';

const NOW = Date.parse('2026-11-24T02:00:00Z');

test('each universe supplies all nine rule IDs and every required image exists', () => {
  assert.equal(new Set(UNIVERSES.map(theme => theme.id)).size, UNIVERSES.length);
  for (const theme of UNIVERSES) {
    assert.equal(theme.characters.length, 9);
    assert.equal(new Set(theme.characters.map(character => character.name)).size, 9);
    assert.equal(new Set(theme.characters.map(character => character.image)).size, 9);
    assert.ok(theme.characters[theme.hero]);
    if (theme.blessingCharacters) {
      assert.equal(theme.blessingCharacters.length, 6);
      assert.ok(theme.blessingCharacters.every(index => Number.isInteger(index) && index >= 0 && index < 9));
    }
    for (const image of [...theme.characters.map(character => character.image), theme.cardBack, theme.hiddenPack]) {
      const bytes = readFileSync(resolve('public', image));
      if (image.endsWith('.png')) {
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
        assert.ok(bytes.readUInt32BE(16) >= 256 && bytes.readUInt32BE(20) >= 256);
        assert.equal(bytes[25], 6, 'portraits need an RGBA transparency channel');
      } else assert.match(bytes.toString('utf8'), /<svg[^>]*viewBox=/);
    }
  }
});

test('pack iframe gets absolute parent URLs even when hosted in a nested directory', () => {
  const appearance = packAppearance(getUniverse('carrot'), 'https://example.com/games/pairs/index.html');
  assert.equal(appearance.hero, 'https://example.com/games/pairs/assets/carrot/carrot-0.svg');
  assert.equal(appearance.cardBack, 'https://example.com/games/pairs/assets/carrot/cardback.svg');
  assert.ok(appearance.characters.every(character => character.image.startsWith('https://example.com/games/pairs/assets/carrot/')));
  const tea = packAppearance(getUniverse('milktea'), 'https://example.com/games/pairs/index.html');
  assert.equal(tea.hero, 'https://example.com/games/pairs/assets/milktea/drink-0.svg');
  assert.equal(tea.cardBack, 'https://example.com/games/pairs/assets/milktea/cardback.svg');
  assert.ok(tea.characters.every(character => character.image.startsWith('https://example.com/games/pairs/assets/milktea/')));
  const naiwa = packAppearance(getUniverse('naiwa'), 'https://example.com/games/pairs/index.html');
  assert.equal(naiwa.hero, 'https://example.com/games/pairs/assets/naiwa/naiwa-0.png');
  assert.equal(naiwa.cardBack, 'https://example.com/games/pairs/assets/naiwa/cardback.svg');
  assert.equal(naiwa.material, 'gilded');
  assert.deepEqual(naiwa.blessingCharacters, [0, 1, 2, 3, 4, 5]);
  assert.ok(naiwa.characters.every(character => character.image.startsWith('https://example.com/games/pairs/assets/naiwa/')));
});

test('universe preference survives reload without introducing session persistence', () => {
  for (const theme of UNIVERSES) {
    const state = freshStore(NOW);
    state.universe = theme.id; state.unlocked = 7; state.cleared = 6; state.endlessBest = 177; state.energy = 4;
    const raw = encodeStore({...state, drafts: {blessing: 'echo'}, saves: {score: 19}} as typeof state);
    assert.deepEqual(decodeStore(raw, NOW), state);
    assert.equal('saves' in JSON.parse(raw), false);
    assert.equal('drafts' in JSON.parse(raw), false);
  }
});

test('old or unsupported theme preferences fall back while keeping player progress', () => {
  for (const universe of [undefined, null, 'unknown-theme', {id: 'carrot'}]) {
    const restored = decodeStore(JSON.stringify({version: 2, universe, unlocked: 5, cleared: 4, endlessBest: 80}), NOW);
    assert.equal(restored.universe, 'classic');
    assert.equal(restored.cleared, 4); assert.equal(restored.unlocked, 5); assert.equal(restored.endlessBest, 80);
  }
});
