import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative asset URLs so the same build works from a web server, from Tauri's
  // custom protocol, and from itch.io's html5 player (which serves out of a
  // subdirectory, not a domain root).
  base: './',
  server: {
    // Tauri shows a blank window rather than a useful error if the dev server
    // silently picks a different port, so fail loudly instead.
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
})
