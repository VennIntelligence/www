import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import seoStatic from './vite-plugins/seoStatic.js'
import preloadHome from './vite-plugins/preloadHome.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoStatic(), preloadHome()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // three.js changes only on dependency upgrades; keep it in its own
            // long-lived chunk so app edits do not invalidate the ~160 KB (gz) download.
            { name: 'three', test: 'node_modules/three/' },
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5273,
    strictPort: true,
  },
})
