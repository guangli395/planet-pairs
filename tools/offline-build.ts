import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

/** Cache only the shipped game, never source documents or player state. */
export function offlineBuild(): Plugin {
  let output = '';
  let root = '';
  return {
    name: 'game-offline-bundle',
    apply: 'build',
    configResolved(config) { root = config.root; output = resolve(root, config.build.outDir); },
    async closeBundle() {
      const files: {path: string; bytes: number}[] = [];
      const hash = createHash('sha256');
      async function walk(folder: string) {
        for (const item of (await readdir(folder, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
          const absolute = resolve(folder, item.name);
          if (item.isDirectory()) { await walk(absolute); continue; }
          const path = relative(output, absolute).replaceAll('\\', '/');
          if (path === 'sw.js' || path === 'game-assets.json' || /(?:preview\.(?:jpg|svg)|\.nojekyll|LICENSE\.txt|README\.md)$/.test(path)) continue;
          const bytes = await readFile(absolute);
          hash.update(path).update(bytes);
          files.push({path, bytes: bytes.length});
        }
      }
      await walk(output);
      const manifest = {version: hash.digest('hex').slice(0, 16), files};
      await writeFile(resolve(output, 'game-assets.json'), JSON.stringify(manifest));
      const worker = await readFile(resolve(root, 'tools/service-worker.js'), 'utf8');
      await writeFile(resolve(output, 'sw.js'), `const BUILD = ${JSON.stringify(manifest)};\n${worker}`);
    },
  };
}
