import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/InfoPool-ASA': {
        target: 'http://10.1.8.151',
        changeOrigin: true,
      },
      '/lambda': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
