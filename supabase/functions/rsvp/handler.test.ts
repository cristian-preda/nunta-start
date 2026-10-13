import { describe, expect, it, vi } from 'vitest';
import { clientIp, type Deps, handleRsvp, parseSubmission, type RsvpHousehold, tokenFromUrl } from './handler';

const TOKEN = '0123456789abcdef0123456789abcdef01234567';
const G1 = '00000000-0000-4000-8000-000000000001';
const G2 = '00000000-0000-4000-8000-000000000002';

const household: RsvpHousehold = {
  householdName: 'Familia Popescu',
  weddingName: 'Ana & Mihai',
  note: '',
  guests: [{ id: G1, name: 'Ion Popescu', ageGroup: 'adult', attending: 'unknown', diet: 'classic' }],
};

const deps = (over: Partial<Deps> = {}): Deps => ({
  allowRequest: vi.fn(async () => true),
  verifyTurnstile: null,
  lookup: vi.fn(async () => household),
  submit: vi.fn(async () => 'saved' as const),
  ...over,
});

const url = (token = TOKEN) => `https://x.test/functions/v1/rsvp/${token}`;
const get = (token?: string, init: RequestInit = {}) => new Request(url(token), init);
const post = (body: unknown, token?: string, headers: Record<string, string> = {}) =>
  new Request(url(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const valid = { answers: [{ guestId: G1, attending: 'yes', diet: 'vegan' }], note: 'Abia asteptam' };

describe('tokenFromUrl / clientIp', () => {
  it('takes the last path segment and survives bad encoding', () => {
    expect(tokenFromUrl(`https://x.test/rsvp/${TOKEN}/`)).toBe(TOKEN);
    expect(tokenFromUrl('https://x.test/rsvp/%E0%A4%A')).toBe('');
  });
  it('uses the last forwarded address, the one the proxy appended', () => {
    expect(clientIp(get(TOKEN, { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('10.0.0.1');
    expect(clientIp(get())).toBeNull();
  });
  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    const headers = { 'cf-connecting-ip': '7.7.7.7', 'x-forwarded-for': 'spoofed, 10.0.0.1' };
    expect(clientIp(get(TOKEN, { headers }))).toBe('7.7.7.7');
  });
  it('is not changed by a spoofed leading x-forwarded-for entry', async () => {
    const d = deps();
    await handleRsvp(get(TOKEN, { headers: { 'x-forwarded-for': 'spoofed-1, 10.0.0.1' } }), d);
    await handleRsvp(get(TOKEN, { headers: { 'x-forwarded-for': 'spoofed-2, 10.0.0.1' } }), d);
    expect(d.allowRequest).toHaveBeenNthCalledWith(1, '10.0.0.1');
    expect(d.allowRequest).toHaveBeenNthCalledWith(2, '10.0.0.1');
  });
});

describe('GET', () => {
  it('returns the household, uncached and unindexed', async () => {
    const d = deps();
    const res = await handleRsvp(get(), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(household);
    expect(d.lookup).toHaveBeenCalledWith(TOKEN);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('answers 404 for an unknown token', async () => {
    const res = await handleRsvp(get(), deps({ lookup: vi.fn(async () => null) }));
    expect(res.status).toBe(404);
  });

  it('answers 404 without any lookup for a malformed token', async () => {
    const d = deps();
    const res = await handleRsvp(get('not-a-token'), d);
    expect(res.status).toBe(404);
    expect(d.allowRequest).not.toHaveBeenCalled();
    expect(d.lookup).not.toHaveBeenCalled();
  });

  it('answers 500 when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleRsvp(
      get(),
      deps({
        lookup: vi.fn(async () => {
          throw new Error('down');
        }),
      }),
    );
    expect(res.status).toBe(500);
  });
});

describe('rate limit', () => {
  it('answers 429 before touching the database, keyed by the caller IP', async () => {
    const d = deps({ allowRequest: vi.fn(async () => false) });
    const res = await handleRsvp(get(TOKEN, { headers: { 'x-forwarded-for': '9.9.9.9' } }), d);
    expect(res.status).toBe(429);
    expect(d.allowRequest).toHaveBeenCalledWith('9.9.9.9');
    expect(d.lookup).not.toHaveBeenCalled();
  });

  it('limits POST too', async () => {
    const d = deps({ allowRequest: vi.fn(async () => false) });
    const res = await handleRsvp(post(valid), d);
    expect(res.status).toBe(429);
    expect(d.submit).not.toHaveBeenCalled();
  });

  it('does not let a request without an IP skip the limit', async () => {
    const d = deps();
    await handleRsvp(get(), d);
    expect(d.allowRequest).toHaveBeenCalledWith('unknown');
  });
});

describe('POST', () => {
  it('saves the answers and answers 204', async () => {
    const d = deps();
    const res = await handleRsvp(post(valid), d);
    expect(res.status).toBe(204);
    expect(d.submit).toHaveBeenCalledWith(TOKEN, [{ guestId: G1, attending: 'yes', diet: 'vegan' }], 'Abia asteptam');
  });

  it('answers 404 for an unknown token', async () => {
    const res = await handleRsvp(post(valid), deps({ submit: vi.fn(async () => 'not_found' as const) }));
    expect(res.status).toBe(404);
  });

  it('answers 400 when an answer names a guest outside the household', async () => {
    const res = await handleRsvp(post(valid), deps({ submit: vi.fn(async () => 'invalid' as const) }));
    expect(res.status).toBe(400);
  });

  it('never passes an allergies field on', async () => {
    const d = deps();
    const body = { ...valid, allergies: 'nuts', answers: [{ ...valid.answers[0], allergies: 'nuts' }] };
    await handleRsvp(post(body), d);
    expect(d.submit).toHaveBeenCalledWith(TOKEN, [{ guestId: G1, attending: 'yes', diet: 'vegan' }], 'Abia asteptam');
  });

  it.each([
    ['not json', 'nope'],
    ['no answers', { answers: [], note: '' }],
    ['answers not an array', { answers: 'yes', note: '' }],
    ['unknown attending', { answers: [{ guestId: G1, attending: 'maybe', diet: 'classic' }] }],
    ['unknown attending value unknown', { answers: [{ guestId: G1, attending: 'unknown', diet: 'classic' }] }],
    ['diet outside the enum', { answers: [{ guestId: G1, attending: 'yes', diet: 'gluten-free' }] }],
    ['missing diet', { answers: [{ guestId: G1, attending: 'yes' }] }],
    ['guest id not a uuid', { answers: [{ guestId: 'x', attending: 'yes', diet: 'classic' }] }],
    [
      'duplicate guest',
      {
        answers: [
          { guestId: G1, attending: 'yes', diet: 'classic' },
          { guestId: G1, attending: 'no', diet: 'classic' },
        ],
      },
    ],
    ['note too long', { ...valid, note: 'x'.repeat(501) }],
    ['note not a string', { ...valid, note: 5 }],
  ])('answers 400 for %s', async (_name, body) => {
    const d = deps();
    const res = await handleRsvp(post(body), d);
    expect(res.status).toBe(400);
    expect(d.submit).not.toHaveBeenCalled();
  });

  it('accepts every diet in the enum and no note', async () => {
    for (const diet of ['classic', 'vegetarian', 'vegan']) {
      const out = parseSubmission({ answers: [{ guestId: G2, attending: 'no', diet }] });
      expect(out?.note).toBe('');
      expect(out?.answers[0].diet).toBe(diet);
    }
  });

  it('rejects other methods with 405', async () => {
    const res = await handleRsvp(get(TOKEN, { method: 'DELETE' }), deps());
    expect(res.status).toBe(405);
  });
});

describe('Turnstile', () => {
  const withBotCheck = (ok: boolean) => vi.fn(async () => ok);

  it('rejects a POST without a token when configured', async () => {
    const d = deps({ verifyTurnstile: withBotCheck(true) });
    const res = await handleRsvp(post(valid), d);
    expect(res.status).toBe(403);
    expect(d.submit).not.toHaveBeenCalled();
  });

  it('rejects a bot whose token fails verification', async () => {
    const verify = withBotCheck(false);
    const d = deps({ verifyTurnstile: verify });
    const res = await handleRsvp(post({ ...valid, turnstileToken: 'bad' }, TOKEN, { 'x-forwarded-for': '5.5.5.5' }), d);
    expect(res.status).toBe(403);
    expect(verify).toHaveBeenCalledWith('bad', '5.5.5.5');
    expect(d.submit).not.toHaveBeenCalled();
  });

  it('accepts a verified token', async () => {
    const d = deps({ verifyTurnstile: withBotCheck(true) });
    const res = await handleRsvp(post({ ...valid, turnstileToken: 'good' }), d);
    expect(res.status).toBe(204);
  });

  it('is skipped when not configured', async () => {
    const res = await handleRsvp(post(valid), deps({ verifyTurnstile: null }));
    expect(res.status).toBe(204);
  });

  it('does not spend the token on an invalid body', async () => {
    const verify = withBotCheck(true);
    await handleRsvp(post({ answers: [], turnstileToken: 'good' }), deps({ verifyTurnstile: verify }));
    expect(verify).not.toHaveBeenCalled();
  });

  it('does not require it for GET', async () => {
    const res = await handleRsvp(get(), deps({ verifyTurnstile: withBotCheck(false) }));
    expect(res.status).toBe(200);
  });
});
