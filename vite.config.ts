import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import TanStackRouterVite from '@tanstack/router-plugin/vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const deferredChunkPattern = /(?:^|\/)(?:socket-|control-|settle-or|mock-control|socket-io)/i

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !deferredChunkPattern.test(dep)),
    },
  },
})
