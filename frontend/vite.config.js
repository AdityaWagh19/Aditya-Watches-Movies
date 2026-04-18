import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /Aditya-Watches-Movies/
  base: '/Aditya-Watches-Movies/',
  build: {
    // Output goes directly into docs/ so GitHub Pages picks it up
    outDir: '../docs',
    // IMPORTANT: Do NOT empty the output dir — docs/data/ contains
    // 22K pre-computed recommendation JSON files we must preserve!
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
