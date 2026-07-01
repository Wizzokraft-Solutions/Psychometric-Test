import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Load .env so Node-level tests can reach Supabase (does not overwrite existing vars).
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  /* .env optional */
}

const BASE = 'http://localhost:4173/Psychometric-Test/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
