import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.MINIMAX_API_KEY': JSON.stringify(env.MINIMAX_API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          manualChunks: {
            reactflow: ['@xyflow/react', 'dagre'],
            motion: ['motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
