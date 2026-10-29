import {textSizeCss,textSizeHtml} from '../Website/text-size-css.mjs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const sharedAppearance=existsSync(path.resolve(directory,'../shared/appearance.js'))?path.resolve(directory,'../shared/appearance.js'):path.resolve(directory,'../Website/shared/appearance.js');

export default defineConfig({
  plugins: [react(),textSizeHtml()],
  css:{postcss:{plugins:[textSizeCss()]}},
  resolve:{alias:{'@mwa/appearance':sharedAppearance},dedupe:['react','react-dom','firebase']},
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-app': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-functions': ['firebase/functions']
        }
      }
    }
  }
});
