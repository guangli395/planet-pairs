import { defineConfig } from 'vite';
import { offlineBuild } from './tools/offline-build.ts';

// Keep exported assets usable when the H5 game is hosted in a nested folder.
export default defineConfig({ base: './', plugins: [offlineBuild()] });
