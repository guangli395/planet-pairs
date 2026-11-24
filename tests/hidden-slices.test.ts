import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HiddenSlices, clipCutSegment } from '../src/hidden-slices';

const p = (x: number, y: number) => ({x, y});
test('one cut makes two pieces and two crossing cuts make four', () => {
  const slices = new HiddenSlices();
  assert.equal(slices.reward, 0);
  assert(slices.cut(p(-1, .5), p(2, .5))); assert.equal(slices.count, 2);
  assert(slices.cut(p(.5, -1), p(.5, 2))); assert.equal(slices.count, 4);
});

test('parallel cuts add one region and a further crossing line cuts every region it meets', () => {
  const slices = new HiddenSlices();
  slices.cut(p(-1, .3), p(2, .3)); slices.cut(p(-1, .7), p(2, .7));
  assert.equal(slices.count, 3);
  slices.cut(p(.5, -1), p(.5, 2)); assert.equal(slices.count, 6);
});

test('repeated or reversed cuts and boundary grazes do not create more pieces', () => {
  const slices = new HiddenSlices(); slices.cut(p(-1, .5), p(2, .5));
  assert.equal(slices.cut(p(2, .5), p(-1, .5)), false);
  assert.equal(slices.cut(p(.1, .5), p(.9, .5)), false);
  assert.equal(slices.cut(p(-1, 0), p(2, 0)), false);
  assert.equal(slices.cut(p(-2, .2), p(-1, .2)), false);
  assert.equal(slices.cut(p(.2, .2), p(.2, .2)), false);
  assert.equal(slices.count, 2);
});

test('three lines meeting at one point produce six pieces, not seven', () => {
  const slices = new HiddenSlices();
  slices.cut(p(-1, .5), p(2, .5)); slices.cut(p(.5, -1), p(.5, 2));
  slices.cut(p(-1, -1), p(2, 2)); assert.equal(slices.count, 6);
});

test('a line crossing previous cuts at different points creates seven pieces', () => {
  const slices = new HiddenSlices();
  slices.cut(p(-1, .5), p(2, .5)); slices.cut(p(.5, -1), p(.5, 2));
  slices.cut(p(-.1, .1), p(1.1, .7)); assert.equal(slices.count, 7);
});

test('reward caps at thirty while the last cut still reports its actual piece count', () => {
  const slices = new HiddenSlices();
  for (let i = 1; i <= 5; i++) slices.cut(p(-1, i / 6), p(2, i / 6));
  for (let i = 1; i <= 4; i++) slices.cut(p(i / 5, -1), p(i / 5, 2));
  assert.equal(slices.count, 30); assert.equal(slices.reward, 30);
  assert.equal(slices.cut(p(-1, -1), p(2, 2)), false);
  const smallCap = new HiddenSlices(3);
  smallCap.cut(p(-1, .5), p(2, .5)); smallCap.cut(p(.5, -1), p(.5, 2));
  assert.equal(smallCap.count, 4); assert.equal(smallCap.reward, 3);
});

test('fast swipes crossing the pack are detected even without an interior sample', () => {
  const bounds = {left: 10, top: 20, right: 110, bottom: 220};
  assert.deepEqual(clipCutSegment(p(-50, 100), p(200, 100), bounds), {from: p(10, 100), to: p(110, 100)});
  assert.equal(clipCutSegment(p(-50, 10), p(200, 10), bounds), null);
  assert.equal(clipCutSegment(p(-50, -40), p(10, 20), bounds), null);
});

const polygonArea = (points: {x: number; y: number}[]) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.y - next.x * point.y;
}, 0)) / 2;

test('rendered polygons exactly cover the pack and stay on their side of each blade', () => {
  const slices = new HiddenSlices();
  const cuts = [[p(-1, .5), p(2, .5)], [p(.5, -1), p(.5, 2)], [p(-.1, .1), p(1.1, .7)]];
  const accepted: typeof cuts = [];
  for (const [from, to] of cuts) {
    assert(slices.cut(from, to)); accepted.push([from, to]);
    const polygons = slices.polygons;
    assert.equal(polygons.length, slices.count);
    assert.ok(Math.abs(polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0) - 1) < 1e-7);
    for (const polygon of polygons) {
      assert.ok(polygon.every(point => point.x >= -1e-7 && point.x <= 1 + 1e-7 && point.y >= -1e-7 && point.y <= 1 + 1e-7));
      for (const [a, b] of accepted) {
        const distances = polygon.map(point => (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x));
        assert.ok(distances.every(value => value >= -1e-7) || distances.every(value => value <= 1e-7));
      }
    }
  }
});

test('visual geometry snapshots cannot modify future cutting or reward counts', () => {
  const slices = new HiddenSlices();
  slices.cut(p(-1, .5), p(2, .5));
  const snapshot = slices.polygons;
  assert.equal(snapshot.length, 2);
  assert.ok(snapshot.every(polygon => Math.abs(polygonArea(polygon) - .5) < 1e-7));
  snapshot[0][0].x = 100; snapshot.pop();
  slices.cut(p(.5, -1), p(.5, 2));
  assert.equal(slices.count, 4); assert.equal(slices.reward, 4);
  assert.ok(slices.polygons.every(polygon => Math.abs(polygonArea(polygon) - .25) < 1e-7));
});
