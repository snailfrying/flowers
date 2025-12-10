import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: path.resolve(__dirname, './src/manifest.json'),
      watchFilePaths: ['src/**/*'],
      disableAutoLaunch: true,
      browser: 'chrome',
      // Avoid remote schema fetch during manifest validation (offline safe)
      skipManifestValidation: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'backend': path.resolve(__dirname, '../backend/dist'),
      // Force-disable hnswlib-wasm in extension build by aliasing to a stub
      'hnswlib-wasm': path.resolve(__dirname, './src/shared/stubs/empty-wasm.ts')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
    // Disable minification to avoid rare TDZ issues in content script on some sites
    minify: false
  },
  publicDir: false
});

