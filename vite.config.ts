import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves from /IAMMUSIC/, local dev uses /
  base: mode === 'production' ? '/IAMMUSIC/' : '/',
  plugins: [
    react({ fastRefresh: false }),
    tailwindcss(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
