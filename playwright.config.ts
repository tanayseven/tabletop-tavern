import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  // Runs against the production build, so the e2e suite also catches things
  // that only break once Vite has bundled and code-split (the lazy game
  // chunks in particular).
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    // Never reuse: a server left over from an earlier run serves a stale dist,
    // and the suite then silently tests the previous build. The rebuild costs
    // well under a second.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // A coarse-pointer target, to prove the menu is usable where the hover
    // tooltip doesn't exist.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
