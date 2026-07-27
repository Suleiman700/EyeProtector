import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          preferences: resolve('src/renderer/preferences/index.html'),
          break: resolve('src/renderer/break/index.html'),
          blink: resolve('src/renderer/blink/index.html')
        }
      }
    }
  }
})
