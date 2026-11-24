import '../src/style.css';
import { BLESSINGS } from '../src/rules';
import { createBlessingPackState } from '../src/blessing-choice';
import { mountBlessingPack } from '../src/blessing-pack';

// Independent fixtures; this page never reads or writes player saves.
const app = document.getElementById('app')!;
app.innerHTML = `<main class="device"><section class="screen blessing-pack-screen"><header class="setup-header"><button id="preview-reset" class="icon-button" aria-label="重新预览拆包">↻</button><span>祝福预览</span><span class="small-step">01 / 03</span></header><div class="setup-title"><h1>拆一份<span>星际祝福</span></h1></div><div id="blessing-pack-root"></div></section></main>`;
let dispose: (() => void) | undefined;
let previous: { info: (typeof BLESSINGS)[number]; pick: number } | null = null;
let state = createBlessingPackState();
function render() {
  dispose?.();
  const root = document.getElementById('blessing-pack-root')!;
  dispose = mountBlessingPack(root, {
    state, previous,
    onPick: index => { const info = BLESSINGS[index]; previous = { info, pick: index }; return info; },
    onStateChange: () => {}, requestChoiceAd: async () => true,
    onContinue: () => {
      dispose?.();
      root.innerHTML = `<div style="width:100%;text-align:center;padding:60px 0"><h2>选择幸运星球</h2><p>本局祝福：${previous!.info.name}</p><p>可选择 ${previous!.info.id === 'wish' ? 2 : 1} 种幸运星球</p><button class="wide-button" id="preview-back">返回已选祝福</button></div>`;
      document.getElementById('preview-back')!.onclick = render;
    }, soundEnabled: false,
  });
}
document.getElementById('preview-reset')!.onclick = () => { previous = null; state = createBlessingPackState(); render(); };
render();
