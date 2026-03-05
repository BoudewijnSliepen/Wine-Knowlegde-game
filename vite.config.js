import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/wset-quiz/',  // ← Change to your GitHub repo name
});
