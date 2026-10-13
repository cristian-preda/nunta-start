import { expect, type Page, test } from '@playwright/test';
import { clearMailbox, waitForSignInCode } from './mailpit';

// In the local allow-list (supabase/seed.sql).
const OWNER = 'dev1@example.test';

async function signIn(page: Page, email: string) {
  await clearMailbox(email);
  await page.goto('/login');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-email').press('Enter');
  await page.locator('#signin-code').fill(await waitForSignInCode(email));
  await expect(page).toHaveURL(/\/w(\/|$)/);
}

/** The event titles in page order; the public page labels its list differently from the app. */
const titles = (page: Page, list = 'Events of the day') =>
  page.getByRole('list', { name: list }).getByRole('heading', { level: 2 });

async function addEvent(page: Page, event: { title: string; time: string; place: string }) {
  await page.getByRole('button', { name: 'New event' }).click();
  await page.getByLabel('What happens').fill(event.title);
  await page.getByLabel('Start time').fill(event.time);
  await page.getByLabel('Place').fill(event.place);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

// An owner can hold at most 5 spaces, so the test deletes its own: local runs can repeat on one database.
let weddingId: string | undefined;

test.afterEach(async ({ page }) => {
  if (!weddingId) return;
  await page.goto(`/w/${weddingId}/settings`);
  await page.getByRole('button', { name: 'Delete space' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete space' }).click();
  await expect(page).not.toHaveURL(new RegExp(weddingId));
  weddingId = undefined;
});

test('owner builds the day-of schedule and shares it with a vendor', async ({ page, browser }) => {
  // Sign in and create a wedding, so every run starts from an empty schedule.
  await signIn(page, OWNER);
  await page.goto('/w/new');
  await page.locator('#onb-name1').fill('Ana');
  await page.locator('#onb-name2').fill('Andrei');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#onb-date').fill('2028-06-17');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Create your space' }).click();
  await expect(page).toHaveURL(/\/w\/[0-9a-f-]{36}$/);
  weddingId = page.url().split('/').pop() as string;

  await page.goto(`/w/${weddingId}/timeline`);
  await expect(page.getByText('The schedule is empty')).toBeVisible();

  // Create: events are placed by time, whatever order they are added in.
  await addEvent(page, { title: 'Dinner', time: '19:00', place: 'Main hall' });
  await addEvent(page, { title: 'Ceremony', time: '16:00', place: 'Garden' });
  await addEvent(page, { title: 'Cake', time: '22:00', place: 'Main hall' });
  await expect(titles(page)).toHaveText(['Ceremony', 'Dinner', 'Cake']);

  // Edit: rename the dinner and change its place.
  await page.getByRole('button', { name: 'Edit: Dinner' }).click();
  await page.getByLabel('What happens').fill('Wedding dinner');
  await page.getByLabel('Place').fill('Terrace');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(titles(page)).toHaveText(['Ceremony', 'Wedding dinner', 'Cake']);
  await expect(page.getByText('Terrace')).toBeVisible();

  // Reorder: the cake moves ahead of the dinner, and the order survives a reload.
  await page.getByRole('button', { name: 'Move up: Cake' }).click();
  await expect(titles(page)).toHaveText(['Ceremony', 'Cake', 'Wedding dinner']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Ceremony', 'Cake', 'Wedding dinner']);

  // Delete: two steps, then the ceremony is gone for good.
  await page.getByRole('button', { name: 'Edit: Ceremony' }).click();
  await page.getByRole('button', { name: 'Delete the event' }).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(titles(page)).toHaveText(['Cake', 'Wedding dinner']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Cake', 'Wedding dinner']);

  // Share: the link opens for someone with no account.
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByRole('button', { name: 'Create link' }).click();
  const link = page.getByLabel('Schedule link');
  await expect(link).toHaveValue(/\/t\/[0-9a-f]{40}$/);
  const shareUrl = await link.inputValue();

  const vendor = await (await browser.newContext()).newPage();
  await vendor.goto(shareUrl);
  await expect(vendor.getByRole('heading', { level: 1 })).toContainText('Ana');
  await expect(titles(vendor, 'Day-of schedule')).toHaveText(['Cake', 'Wedding dinner']);

  // Stop sharing: the same link no longer works.
  await page.getByRole('button', { name: 'Stop sharing' }).click();
  await page.getByRole('button', { name: 'Yes, stop' }).click();
  await expect(page.getByText('Sharing is stopped. The link no longer works.')).toBeVisible();
  await vendor.reload();
  await expect(vendor.getByRole('heading', { name: 'This link no longer works' })).toBeVisible();
});
