import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-syntax-highlighter')) return 'syntaxHighlighter'
            if (id.includes('react-router-dom')) return 'router'
            if (id.includes('/react/') || id.includes('react-dom')) return 'react'
            if (id.includes('zustand')) return 'zustand'
            if (id.includes('lucide-react')) return 'icons'
          }
        },
      },
    },
  },
})
