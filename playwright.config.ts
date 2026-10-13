import { defineConfig } from '@playwright/test';

const PORT = 5173; // supabase/config.toml: site_url and the redirect allow-list point here

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1, // one shared Mailpit mailbox
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY come from the environment (.env.local or CI).
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
