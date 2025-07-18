import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig({
      base: '/',

    // server: {
    //     proxy: {
    //       '/api': {
    //         target: 'http://192.168.1.116:5000', // Your back-end server
    //         changeOrigin: true,
    //         rewrite: (path) => path.replace(/^\/api/, ''), // Optional path rewrite
    //         configure: (proxy) => {
    //             proxy.on('proxyReq', (proxyReq, req) => {
    //               console.log('Proxying request:', req.url);
    //             });
    //         },
    //       },
    //     },
    //   },
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
        },
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


    
    // plugins: [react(),svgr({
    //   exportAsDefault: true
    // })],

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
  react()
]
});