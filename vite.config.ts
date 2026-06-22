import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domain': resolve(__dirname, './src/packages/domain'),
      '@platform': resolve(__dirname, './src/packages/platform'),
      '@ui': resolve(__dirname, './src/packages/ui'),
      '@shared': resolve(__dirname, './src/packages/shared'),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/apps/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/apps/sidepanel/index.html'),
      },
      output: {
        entryFileNames: 'apps/[name]/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  test: {
    exclude: ['node_modules', 'dist', 'tests/e2e/**/*']
  }
});
