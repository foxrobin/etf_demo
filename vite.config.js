import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/InfoPool-ASA': {
        target: 'http://10.1.8.151',
        changeOrigin: true,
      },
    },
  },
});
