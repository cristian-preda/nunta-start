// NS-081: the request logic of `rsvp`, free of Deno and Supabase imports so Vitest can test it.
//
//   GET  rsvp/<token>  ->  200 RsvpHousehold | 404 | 429
//   POST rsvp/<token>  body {answers: [{guestId, attending: 'yes'|'no', diet}], note, turnstileToken?}
//                      ->  204 | 400 (invalid answers) | 403 (bot check) | 404 | 429
//
// The wire shapes mirror src/lib/rsvp.ts. There is deliberately no allergy field.

export const DIETS = ['classic', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

export interface RsvpAnswer {
  guestId: string;
  attending: 'yes' | 'no';
  diet: Diet;
}

export interface RsvpHousehold {
  householdName: string;
  weddingName: string;
  guests: { id: string; name: string; ageGroup: string; attending: string; diet: string }[];
  note: string;
}

export interface Deps {
  /** One request counted against the caller's budget; false when it is spent. `key` identifies the client (an IP). */
  allowRequest(key: string): Promise<boolean>;
  /**
   * Checks the Turnstile token with Cloudflare. `null` means Turnstile is not configured (TURNSTILE_SECRET_KEY unset):
   * the check is skipped so local development and CI work. Throws when Cloudflare cannot be reached.
   */
  verifyTurnstile: ((token: string, ip: string | null) => Promise<boolean>) | null;
  /** get_rsvp_household(): the household behind a token, or null. Throws when the database cannot be reached. */
  lookup(token: string): Promise<RsvpHousehold | null>;
  /** submit_rsvp(): false for an unknown token; `invalid` when an answer names a guest outside the household. */
  submit(token: string, answers: RsvpAnswer[], note: string): Promise<'saved' | 'not_found' | 'invalid'>;
}

/** Tokens are 20 random bytes in hex (generate_household_rsvp_token); anything else is answered without a lookup. */
const TOKEN = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_GUESTS = 50;
const MAX_NOTE = 500;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const headers = { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const noContent = () => new Response(null, { status: 204, headers: { ...cors, 'Cache-Control': 'no-store' } });

/** The token is the last path segment (`/rsvp/<token>`, with or without a trailing slash). */
export function tokenFromUrl(url: string): string {
  const last = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  try {
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

/**
 * The caller's IP, from a header the proxy sets rather than one the caller can forge: Cloudflare's
 * `cf-connecting-ip`, else the LAST `x-forwarded-for` entry (the one the proxy appended; earlier entries
 * are whatever the client sent). Null when neither is present.
 */
export function clientIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return forwarded || null;
}

type Parsed = { answers: RsvpAnswer[]; note: string; turnstileToken: string } | null;

/** Only the whitelisted fields survive; anything else in the body (an allergies field, say) is dropped. */
export function parseSubmission(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null) return null;
  const { answers, note, turnstileToken } = body as Record<string, unknown>;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > MAX_GUESTS) return null;
  if (note !== undefined && typeof note !== 'string') return null;
  if (typeof note === 'string' && note.length > MAX_NOTE) return null;

  const seen = new Set<string>();
  const parsed: RsvpAnswer[] = [];
  for (const raw of answers) {
    if (typeof raw !== 'object' || raw === null) return null;
    const { guestId, attending, diet } = raw as Record<string, unknown>;
    if (typeof guestId !== 'string' || !UUID.test(guestId) || seen.has(guestId)) return null;
    if (attending !== 'yes' && attending !== 'no') return null;
    if (!DIETS.includes(diet as Diet)) return null;
    seen.add(guestId);
    parsed.push({ guestId, attending, diet: diet as Diet });
  }
  return {
    answers: parsed,
    note: note ?? '',
    turnstileToken: typeof turnstileToken === 'string' ? turnstileToken : '',
  };
}

export async function handleRsvp(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = tokenFromUrl(req.url);
  if (!TOKEN.test(token)) return json({ error: 'not found' }, 404);

  const ip = clientIp(req);
  try {
    // No IP at all (should not happen behind the platform proxy) shares one bucket instead of bypassing the limit.
    if (!(await deps.allowRequest(ip ?? 'unknown'))) return json({ error: 'too many requests' }, 429);

    if (req.method === 'GET') {
      const household = await deps.lookup(token);
      return household ? json(household) : json({ error: 'not found' }, 404);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid body' }, 400);
    }
    const submission = parseSubmission(body);
    if (!submission) return json({ error: 'invalid answers' }, 400);

    // After validation, because a Turnstile token is single-use: a typo must not cost the guest a new challenge.
    if (deps.verifyTurnstile) {
      if (!submission.turnstileToken || !(await deps.verifyTurnstile(submission.turnstileToken, ip))) {
        return json({ error: 'bot check failed' }, 403);
      }
    }

    const result = await deps.submit(token, submission.answers, submission.note);
    if (result === 'not_found') return json({ error: 'not found' }, 404);
    if (result === 'invalid') return json({ error: 'invalid answers' }, 400);
    return noContent();
  } catch (error) {
    console.error('rsvp: request failed', error);
    return json({ error: 'could not process the request' }, 500);
  }
}
