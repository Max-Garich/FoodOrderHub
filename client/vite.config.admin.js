import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Сборка админ-панели — отдельное приложение (вход admin.html, вывод dist-admin)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: 'admin.html',
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
