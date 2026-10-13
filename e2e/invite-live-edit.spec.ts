import { type Browser, expect, type Page, test } from '@playwright/test';
import { clearMailbox, waitForInvitePath, waitForSignInCode } from './mailpit';

// Both in the local allow-list (supabase/seed.sql).
const OWNER = 'dev1@example.test';
const PARTNER = 'dev2@example.test';

async function signIn(page: Page, email: string) {
  await clearMailbox(email);
  await page.goto('/login');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-email').press('Enter');
  await page.locator('#signin-code').fill(await waitForSignInCode(email));
  await expect(page).toHaveURL(/\/w(\/|$)/);
}

async function newPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}

/** The category view keeps every group open, so a row is visible as soon as it exists. */
async function openTasks(page: Page, weddingId: string) {
  await page.goto(`/w/${weddingId}/start`);
  await page.getByRole('radio', { name: 'By category' }).click();
}

const row = (page: Page, title: string) => page.locator('li[id^="task-"]').filter({ hasText: title });

test('partner is invited and both edit a task live', async ({ browser }) => {
  const owner = await newPage(browser);
  const partner = await newPage(browser);
  const created = `Venue tour ${Date.now()}`;
  const renamed = `${created} (confirmed)`;

  // Owner: sign in and create a wedding.
  await signIn(owner, OWNER);
  await owner.goto('/w/new');
  await owner.locator('#onb-name1').fill('Ana');
  await owner.locator('#onb-name2').fill('Andrei');
  await owner.getByRole('button', { name: 'Continue' }).click();
  await owner.locator('#onb-date').fill('2028-06-17');
  await owner.getByRole('button', { name: 'Continue' }).click();
  await owner.getByRole('button', { name: 'Create your space' }).click();
  await expect(owner).toHaveURL(/\/w\/[0-9a-f-]{36}$/);
  const weddingId = owner.url().split('/').pop() as string;

  // Owner: invite the partner; the link arrives by email.
  await clearMailbox(PARTNER);
  await owner.goto(`/w/${weddingId}/settings`);
  await owner.getByLabel('Email address').fill(PARTNER);
  await owner.getByLabel('Role').selectOption('partner');
  await owner.getByRole('button', { name: 'Send invitation' }).click();
  await expect(owner.getByText(PARTNER, { exact: true })).toBeVisible();
  const invitePath = await waitForInvitePath(PARTNER);

  // Partner: sign in and accept.
  await signIn(partner, PARTNER);
  await partner.goto(invitePath);
  await partner.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(partner.getByRole('link', { name: 'Open the space' })).toBeVisible();

  // Both on Tasks; the owner adds a task and the partner sees it without reloading.
  await openTasks(owner, weddingId);
  await openTasks(partner, weddingId);
  await owner.getByRole('button', { name: 'Add a task' }).click();
  await owner.getByLabel('Activity').fill(created);
  await owner.getByLabel('Activity').blur();
  await expect(row(partner, created)).toHaveCount(1, { timeout: 10_000 });

  // The partner renames it and the owner sees the change.
  await row(partner, created).locator('button[aria-expanded]').click();
  await partner.getByLabel('Activity').fill(renamed);
  await partner.getByLabel('Activity').blur();
  await expect(row(owner, renamed)).toHaveCount(1, { timeout: 10_000 });
});
