import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the real local stack: Keycloak on :8180 (realm crm-internal) and core-service on :8081.
 * Test users come from environment variables (see e2e/README.md); tests skip when they are not set.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
})
