import { defineConfig } from 'vite'

export default defineConfig({
  // Relative assets keep the app deployable from GitHub Pages project paths.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
})
