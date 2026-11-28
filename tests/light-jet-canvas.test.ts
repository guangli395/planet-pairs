import assert from 'node:assert/strict';
import {test} from 'node:test';

const {LightJetCanvas} = await import(new URL('../public/prism-blessing/light-jet-canvas.js', import.meta.url).href);

function renderer() {
  const drawn: number[][] = [];
  const sizes: number[][] = [];
  let polygon: number[] = [];
  const context = {
    globalAlpha: 1, fillStyle: null as unknown,
    setTransform() {}, clearRect() {}, fillRect() {},
    createRadialGradient: () => ({addColorStop() {}}),
    createLinearGradient: () => ({addColorStop() {}}),
    beginPath() { polygon = []; },
    moveTo(x: number, y: number) { polygon.push(x, y); },
    lineTo(x: number, y: number) { polygon.push(x, y); },
    closePath() {}, fill() { drawn.push(polygon); },
    drawImage(_image: unknown, ...bounds: number[]) { sizes.push(bounds); },
  };
  const root = {dataset: {}, append() {}, ownerDocument: {createElement: () => ({style: {}, width:0, height:0, getContext: () => context})}};
  const paint = new LightJetCanvas(root);
  const bands = [{gradX:50, color:'#ff0088'}], edges = [{ux:-.5,uy:-.8},{ux:.5,uy:-.8}];
  return {paint, context, drawn, sizes, prepare(dpr = 3) { paint.resize({x:-70,y:-120,width:240,height:260}, 2, dpr, bands, edges, 65, (color:string)=>color); }};
}

test('canvas ribbon keeps SVG point ordering and clips each edge to its own sampled length', () => {
  const {paint, drawn, prepare} = renderer(); prepare();
  // Original SVG: left points forward, right points backward, close. The
  // partial ribbon must not consume points from the longer neighbouring band.
  paint.band(0, {iStart:2, pts:[10,20, 11,21, 12,22, 13,23]}, {iStart:2, pts:[30,40, 31,41, 32,42, 33,43]}, 15, 5);
  assert.deepEqual(drawn[0], [10,20, 11,21, 31,41, 30,40]);
  paint.band(0, {iStart:2, pts:[]}, {iStart:2, pts:[30,40,31,41]}, 5, 5);
  assert.equal(drawn.length, 1, 'a fully drained band must leave no polygon');
});

test('full screen ribbon raster retains device pixels with an explicit 3x upper bound', () => {
  const {paint, prepare} = renderer();
  for (const [dpr,width] of [[1,480],[2,960],[3,1440],[4,1440]]) {
    prepare(dpr); assert.equal(paint.canvas.width, width);
    assert.match(paint.canvas.style.cssText, /left:-140px;top:-240px;width:480px;height:520px/);
  }
});

test('glowing motes keep their diameter and do not leak opacity into the next band', () => {
  const {paint, context, sizes, prepare} = renderer(); prepare();
  paint.spark(15, 25, 3, .4);
  assert.deepEqual(sizes[0], [12, 22, 6, 6]);
  assert.equal(context.globalAlpha, 1);
});
