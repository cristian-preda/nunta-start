const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${MAILPIT_URL}/api/v1${path}`, init);
  if (!res.ok) throw new Error(`Mailpit ${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  return res;
}

/** Empties the mailbox of one address, so the next message found is the one we are about to trigger. */
export async function clearMailbox(email: string) {
  await api(`/search?query=${encodeURIComponent(`to:${email}`)}`, { method: 'DELETE' });
}

/** Polls Mailpit for the newest email to `email` until `pick` finds something in its text. */
async function waitForText(
  email: string,
  pick: (text: string) => string | undefined,
  what: string,
  timeoutMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await api(`/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages[0]) {
      const message = await api(`/message/${messages[0].ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const found = pick(Text);
      if (found) return found;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No ${what} email for ${email} within ${timeoutMs}ms`);
}

/** The 8-digit sign-in code from the newest email to `email`. */
export function waitForSignInCode(email: string): Promise<string> {
  return waitForText(email, (text) => text.match(/\b\d{8}\b/)?.[0], 'sign-in');
}

/** The `/invite/<token>` path from the newest invitation email to `email`. */
export function waitForInvitePath(email: string): Promise<string> {
  return waitForText(email, (text) => text.match(/\/invite\/[\w-]+/)?.[0], 'invitation');
}
