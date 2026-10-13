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

/** Polls Mailpit for the newest email to `email` and returns the 8-digit sign-in code from its text. */
export async function waitForSignInCode(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await api(`/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages[0]) {
      const message = await api(`/message/${messages[0].ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const code = Text.match(/\b\d{8}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No sign-in email for ${email} within ${timeoutMs}ms`);
}
