import { describe, expect, it, vi } from 'vitest';
import { type Deps, handleShare, type SharedTimeline, tokenFromUrl } from './handler';

const TOKEN = '0123456789abcdef0123456789abcdef01234567';

const timeline: SharedTimeline = {
  weddingName: 'Ana & Mihai',
  date: '2027-06-12',
  city: 'Brașov',
  events: [{ title: 'Cununia', startTime: '16:00', durationMinutes: 60, location: 'Biserica', notes: '' }],
};

const deps = (over: Partial<Deps> = {}): Deps => ({ lookup: vi.fn(async () => timeline), ...over });
const get = (path: string, method = 'GET') =>
  new Request(`https://x.test/functions/v1/timeline-share${path}`, { method });

describe('tokenFromUrl', () => {
  it('takes the last path segment', () => {
    expect(tokenFromUrl(`https://x.test/functions/v1/timeline-share/${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromUrl(`https://x.test/timeline-share/${TOKEN}/`)).toBe(TOKEN);
  });
  it('decodes it and survives bad encoding', () => {
    expect(tokenFromUrl('https://x.test/timeline-share/a%20b')).toBe('a b');
    expect(tokenFromUrl('https://x.test/timeline-share/%E0%A4%A')).toBe('');
  });
});

describe('handleShare', () => {
  it('serves the schedule for a known token, uncached and unindexed', async () => {
    const d = deps();
    const res = await handleShare(get(`/${TOKEN}`), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(timeline);
    expect(d.lookup).toHaveBeenCalledWith(TOKEN);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('answers 404 for an unknown or revoked token, also uncached', async () => {
    const res = await handleShare(get(`/${TOKEN}`), deps({ lookup: vi.fn(async () => null) }));
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 404 without a lookup for anything that cannot be a token', async () => {
    const d = deps();
    for (const bad of ['', '/short', `/${TOKEN}0`, `/${TOKEN.toUpperCase()}`, '/%E0%A4%A', '/..%2F..']) {
      expect((await handleShare(get(bad), d)).status).toBe(404);
    }
    expect(d.lookup).not.toHaveBeenCalled();
  });

  it('answers the CORS preflight', async () => {
    const res = await handleShare(get('', 'OPTIONS'), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('allows GET only', async () => {
    const d = deps();
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect((await handleShare(get(`/${TOKEN}`, method), d)).status).toBe(405);
    }
    expect(d.lookup).not.toHaveBeenCalled();
  });

  it('answers 500 when the lookup fails, and never as a 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handleShare(
      get(`/${TOKEN}`),
      deps({
        lookup: vi.fn(async () => {
          throw new Error('db down');
        }),
      }),
    );
    expect(res.status).toBe(500);
  });
});
