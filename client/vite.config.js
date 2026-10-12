import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from /hospital-management-system/
  // Locally (npm run dev) it stays at "/"
  base: command === 'build' ? '/hospital-management-system/' : '/',
}))