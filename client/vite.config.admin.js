import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Отдельная сборка АДМИН-панели: entry admin.html → dist-admin
// (пользовательский сайт собирается обычным `vite build` → dist)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: 'admin.html',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
