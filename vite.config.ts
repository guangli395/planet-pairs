import { defineConfig } from 'vite';

// Keep exported assets usable when the H5 game is hosted in a nested folder.
export default defineConfig({ base: './' });
