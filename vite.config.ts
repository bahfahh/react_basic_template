import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? './' : '/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { chunkSizeWarningLimit: 800 },
}));
