import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.test.ts'],
    // Both Tic Tac Toe games search their game tree in these tests, and they
    // run in parallel across workers -- so the slowest of them sits well past
    // the 5s default even on a fast machine, let alone in CI.
    testTimeout: 30_000,
    // Transforming Svelte dominates the run otherwise (~20s of a 21s run).
    fsModuleCache: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
    },
  },
})
