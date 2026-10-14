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

// An owner can hold at most 5 spaces, so the test deletes its own: local runs can repeat on one database.
let weddingId: string | undefined;
let owner: Page | undefined;

test.afterEach(async () => {
  if (!weddingId || !owner) return;
  await owner.goto(`/w/${weddingId}/settings`);
  await owner.getByRole('button', { name: 'Delete space' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Delete space' }).click();
  await expect(owner).not.toHaveURL(new RegExp(weddingId));
  weddingId = undefined;
  owner = undefined;
});

/** Adds a guest to the household and names it; returns its row. */
async function addGuest(page: Page, index: number, first: string, last: string) {
  await page.getByRole('button', { name: 'Add guest' }).click();
  const row = page
    .getByRole('listitem')
    .filter({ has: page.getByLabel('First name') })
    .nth(index);
  await row.getByLabel('First name').fill(first);
  await row.getByLabel('Last name').fill(last);
  await row.getByLabel('Last name').blur();
  return row;
}

test('a household answers its RSVP link from an anonymous browser', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  owner = await context.newPage();

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
  weddingId = owner.url().split('/').pop() as string;

  // Owner: one household with two guests.
  await owner.goto(`/w/${weddingId}/guests`);
  await owner.getByRole('button', { name: 'Add household' }).click();
  await owner.getByLabel('Household name').fill('Popescu family');
  await owner.getByLabel('Household name').blur();
  const first = await addGuest(owner, 0, 'Maria', 'Popescu');
  const second = await addGuest(owner, 1, 'Ion', 'Popescu');
  await expect(first.getByLabel('RSVP')).toHaveValue('unknown');

  // Owner: generate the household link (the first click asks for confirmation).
  owner.once('dialog', (dialog) => dialog.accept());
  await owner.getByRole('button', { name: 'Copy link' }).click();
  await expect(owner.getByText('Link copied')).toBeVisible();
  const link = await owner.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/r\/[A-Za-z0-9_-]{20,}$/);

  // Guest: no account, a fresh context.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(link);
  await expect(guest.getByRole('heading', { level: 1 })).toContainText('Popescu family');
  await expect(guest.getByText('Maria Popescu', { exact: true })).toBeVisible();
  await expect(guest.getByText('Ion Popescu', { exact: true })).toBeVisible();

  // A missing answer is refused.
  await guest.getByRole('button', { name: 'Send answer' }).click();
  await expect(guest.getByText('An answer is missing. Pick one for every guest.')).toBeVisible();

  await guest
    .getByRole('radiogroup', { name: 'Answer for Maria Popescu' })
    .getByRole('radio', { name: 'Attending' })
    .click();
  await guest.getByRole('combobox', { name: 'Menu' }).selectOption('vegetarian');
  await guest
    .getByRole('radiogroup', { name: 'Answer for Ion Popescu' })
    .getByRole('radio', { name: 'Cannot attend' })
    .click();
  await guest.getByLabel('A message for the couple (optional)').fill('We bring a stroller');
  await guest.getByRole('button', { name: 'Send answer' }).click();
  await expect(guest.getByRole('heading', { name: 'Your answer was sent' })).toBeVisible();

  // Owner: the guest list reflects the answers after a reload.
  await owner.reload();
  await expect(first.getByLabel('RSVP')).toHaveValue('yes');
  await expect(first.getByLabel('Menu')).toHaveValue('vegetarian');
  await expect(second.getByLabel('RSVP')).toHaveValue('no');

  // Guest: opening the link again shows the saved note.
  await guest.reload();
  await expect(guest.getByLabel('A message for the couple (optional)')).toHaveValue('We bring a stroller');
});

test('an invalid RSVP link shows the not-found state', async ({ page }) => {
  await page.goto('/r/not-a-real-token-0000000000000000');
  await expect(page.getByRole('heading', { name: 'We could not find this invitation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send answer' })).toHaveCount(0);
});
