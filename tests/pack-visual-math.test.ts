import {test} from 'node:test';
import assert from 'node:assert/strict';
const {opticalPose} = await import(new URL('../public/prism-blessing/optics.js', import.meta.url).href);


test('cached reflection layers retain the original gradient centers, farthest corner and sweep position', () => {
  for (const width of [140, 179.5, 234, 280]) for (const height of [width * 1.4, width * 1.6]) {
    for (const px of [0, 16.7, 50, 81.3, 100]) for (const py of [0, 25, 50, 75, 100]) {
      const pose = opticalPose(width, height, px, py, .37);
      assert.ok(Math.abs(width / 2 + pose.x - width * px / 100) < 1e-10);
      assert.ok(Math.abs(height / 2 + pose.y - height * py / 100) < 1e-10);
      const farthest = Math.max(...[0, width].flatMap(x => [0, height].map(y => Math.hypot(x - width * px / 100, y - height * py / 100))));
      assert.ok(Math.abs(pose.radius * width - farthest) < 1e-10);
      assert.ok(Math.abs(pose.sweep - (width - width * 2.2) * (100 - px) / 100) < 1e-10);
      assert.equal(pose.glare, .22 + .37 * .54); assert.equal(pose.gloss, .06 + .37 * .34);
    }
  }
});


