
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(path.resolve(), './'),
      },
    },
    // Eliminamos 'define' para no exponer process.env.API_KEY en el cliente
    build: {
      target: 'esnext'
    }
  };
});
