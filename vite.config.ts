import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts:   ['recharts'],
          pdf:      ['jspdf', 'html2canvas'],
          forms:    ['react-hook-form', '@hookform/resolvers', 'zod'],
          offline:  ['dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
