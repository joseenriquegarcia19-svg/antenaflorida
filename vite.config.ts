import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

// Caché en /tmp para evitar ETIMEDOUT en carpetas sincronizadas (iCloud/Documents)
const cacheDir = process.env.VITE_CACHE_DIR || path.join(os.tmpdir(), 'vite-radio-wave')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.live365.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    watch: {
      usePolling: true,
      interval: 2000,
      cwd: __dirname,
      ignored: ['dist', 'dist/**', 'node_modules', 'node_modules/**'],
    },
  },
  build: {
    outDir: process.env.VITE_OUT_DIR || path.join(os.tmpdir(), 'vite-radio-wave-dist'),
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'framer-motion', 'react-helmet-async']
        }
      }
    }
  },
  cacheDir,
})
