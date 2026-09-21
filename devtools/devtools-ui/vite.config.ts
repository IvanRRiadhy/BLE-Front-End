import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/_devtools/',
  plugins: [
    react(),
    {
      name: 'bionic-python-detector-proxy',
      configureServer(server) {
        server.middlewares.use('/api-detector', (req, res) => {
          // Extracts port from path: /<port>/endpoint (e.g. /9000/health)
          const match = req.url?.match(/^\/(\d+)(\/.*)?$/);
          const port = match ? parseInt(match[1], 10) : 8000;
          const targetPath = (match && match[2]) ? match[2] : '/';

          const proxyReq = http.request(
            {
              hostname: '127.0.0.1',
              port: port,
              path: targetPath,
              method: req.method,
              headers: {
                ...req.headers,
                host: `127.0.0.1:${port}`,
              },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'FastAPI Backend Unreachable', detail: err.message }));
          });

          req.pipe(proxyReq);
        });
      },
    },
  ],
  resolve: {
    alias: {
      'devtools-floorplan-detection': path.resolve(__dirname, '../src/index.ts'),
      '@engine': path.resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
