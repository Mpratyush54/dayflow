import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      // Same-origin /api in dev: no CORS, and the httpOnly refresh cookie is
      // first-party so browsers never block it.
      '/api': 'http://localhost:5000',
    },
  },
})
