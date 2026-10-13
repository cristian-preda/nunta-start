import { expect, test } from '@playwright/test';
import { clearMailbox, waitForSignInCode } from './mailpit';

// In the local allow-list (supabase/seed.sql).
const EMAIL = 'dev1@example.test';

test('signs in with the emailed code', async ({ page }) => {
  await clearMailbox(EMAIL);

  await page.goto('/login');
  await page.locator('#signin-email').fill(EMAIL);
  await page.locator('#signin-email').press('Enter');

  // The 8-digit code verifies on its own as soon as it is complete.
  await page.locator('#signin-code').fill(await waitForSignInCode(EMAIL));

  await expect(page).toHaveURL(/\/w(\/|$)/);
});
