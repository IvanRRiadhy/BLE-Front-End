import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs-extra';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 1000,
    allowedHosts:[
      'memphis-existing-decent-engineering.trycloudflare.com',
      '.trycloudflare.com',
    ],
    headers: {
      'referrer-policy': 'same-origin',
    }
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom', 'react-redux'],
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.tsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'load-js-files-as-tsx',
          setup(build) {
            build.onLoad(
              { filter: /src\\.*\.js$/ },
              async (args) => ({
                loader: 'tsx',
                contents: await fs.readFile(args.path, 'utf8'),
              })
            );
          },
        },
      ],
    },
  },

  plugins: [
    {
      name: 'remove-object-freeze',
      transform(code, id) {
        if (id.endsWith('.svg') && code.includes('Object.freeze')) {
          return {
            code: code.replace(/Object\.freeze\((.*?)\)/g, '$1'),
            map: null,
          };
        }
      },
    },
    svgr({
      exclude: ['**/area/*.svg', '**/devices/*.svg'],
    }),
    react(),
    {
      name: 'clean-dist',
      buildStart() {
        fs.removeSync(resolve(__dirname, 'dist'));
        console.log('🧹 Cleaned /dist before build');
      },
    },
  ],

  // 🧪 Added Vitest config block
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.test.{ts,tsx}'], // optional: limits test search path
coverage: {
  provider: 'v8', // ✅ required field //or istanbul
  reporter: ['text', 'json', 'html'],
},
  },
});
