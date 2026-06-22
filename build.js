import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('Starting UI Compilation (Popup, Side Panel)...');
  await build({
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    resolve: {
      alias: {
        '@domain': resolve(__dirname, 'src/packages/domain'),
        '@platform': resolve(__dirname, 'src/packages/platform'),
        '@ui': resolve(__dirname, 'src/packages/ui'),
        '@shared': resolve(__dirname, 'src/packages/shared'),
      }
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
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
    }
  });

  console.log('\nStarting Background Service Worker Compilation...');
  await build({
    resolve: {
      alias: {
        '@domain': resolve(__dirname, 'src/packages/domain'),
        '@platform': resolve(__dirname, 'src/packages/platform'),
        '@ui': resolve(__dirname, 'src/packages/ui'),
        '@shared': resolve(__dirname, 'src/packages/shared'),
      }
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/apps/background/index.ts'),
        output: {
          entryFileNames: 'apps/background/index.js',
          format: 'es',
          inlineDynamicImports: true
        }
      }
    }
  });

  console.log('\nStarting Content Script Compilation...');
  await build({
    resolve: {
      alias: {
        '@domain': resolve(__dirname, 'src/packages/domain'),
        '@platform': resolve(__dirname, 'src/packages/platform'),
        '@ui': resolve(__dirname, 'src/packages/ui'),
        '@shared': resolve(__dirname, 'src/packages/shared'),
      }
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, 'src/apps/content/index.ts'),
        output: {
          entryFileNames: 'apps/content/index.js',
          format: 'iife',
          name: 'content',
          inlineDynamicImports: true
        }
      }
    }
  });

  console.log('\nCopying extension manifest...');
  copyFileSync(
    resolve(__dirname, 'src/manifest.json'),
    resolve(__dirname, 'dist/manifest.json')
  );

  console.log('\nWebLens OS Bundling Complete!');
}

run().catch((err) => {
  console.error('Compilation Failed:', err);
  process.exit(1);
});
