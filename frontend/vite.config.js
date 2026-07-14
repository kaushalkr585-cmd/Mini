import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Framer Motion is the heaviest animation lib — isolate it
          'vendor-framer': ['framer-motion'],
          // Lucide icons are tree-shaken but still notable
          'vendor-lucide': ['lucide-react'],
          // Routing + state
          'vendor-router': ['@tanstack/react-router', '@tanstack/react-query'],
          // Everything else (zustand, axios, socket.io, etc.)
          'vendor-misc': ['zustand', 'react-hot-toast'],
        },
      },
    },
  },
})

