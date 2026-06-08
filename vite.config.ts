import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs-extra';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 3000,
    allowedHosts:[
      'memphis-existing-decent-engineering.trycloudflare.com',
      '.trycloudflare.com',
    ],
    headers: {
      'referrer-policy': 'same-origin',
    },
    proxy: {
      // In case they have an existing backend on port 5000
      '/api-backend': {
        target: 'http://192.168.1.10:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-backend/, ''),
      },
    },
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
      name: 'image-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.includes('/api/proxy-image')) {
            const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
            const imageUrl = urlParams.get('url');
            
            if (!imageUrl) {
              res.statusCode = 400;
              res.end('URL is required');
              return;
            }

            try {
              const { default: axios } = await import('axios');
              const resp = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                validateStatus: false,
              });
              
              if (resp.headers['content-type']) {
                res.setHeader('Content-Type', resp.headers['content-type']);
              }
              res.end(Buffer.from(resp.data));
            } catch (error) {
              console.error('Vite Image proxy error:', error.message);
              res.statusCode = 500;
              res.end('Failed to proxy image');
            }
            return;
          }
          next();
        });
      },
    },
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
