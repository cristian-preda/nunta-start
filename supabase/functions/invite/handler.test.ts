import { describe, expect, it, vi } from 'vitest';
import { type CreatedInvitation, type Deps, handleInvite } from './handler';

const WEDDING = '00000000-0000-0000-0000-0000000000b1';

const created: CreatedInvitation = {
  id: 'inv1',
  token: 'tok123',
  email: 'ion@example.com',
  role: 'viewer',
  createdAt: '2026-10-11T10:00:00Z',
  expiresAt: '2026-10-25T10:00:00Z',
  weddingName: 'Ana & Mihai',
  inviterName: 'Ana',
};

function deps(over: Partial<Deps> = {}): Deps {
  return {
    siteUrl: 'https://app.test',
    deliver: vi.fn(async () => undefined),
    createInvitation: vi.fn(async () => ({ data: created, error: null })),
    cancelInvitation: vi.fn(async () => ({ error: null })),
    ...over,
  };
}

const post = (body: unknown, headers: Record<string, string> = { Authorization: 'Bearer t' }) =>
  new Request('https://x.test/invite', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const valid = { weddingId: WEDDING, email: 'ion@example.com', role: 'viewer' };

describe('handleInvite', () => {
  it('creates the invitation as the caller and emails the link', async () => {
    const d = deps();
    const res = await handleInvite(post({ ...valid, locale: 'en' }), d);
    expect(res.status).toBe(200);
    expect(d.createInvitation).toHaveBeenCalledWith('Bearer t', valid);
    const mail = vi.mocked(d.deliver!).mock.calls[0][0];
    expect(mail.to).toBe('ion@example.com');
    expect(mail.text).toContain('https://app.test/invite/tok123');
    expect(mail.text).toContain('14 days');
    expect(d.cancelInvitation).not.toHaveBeenCalled();
  });

  it('never returns the token to the browser', async () => {
    const res = await handleInvite(post(valid), deps());
    const text = await res.text();
    expect(text).not.toContain('tok123');
    expect(JSON.parse(text).invitation).toMatchObject({ id: 'inv1', email: 'ion@example.com', role: 'viewer' });
  });

  it('cancels the invitation and answers 502 when the email cannot be sent', async () => {
    const d = deps({ deliver: vi.fn(async () => Promise.reject(new Error('Resend refused 422'))) });
    const res = await handleInvite(post(valid), d);
    expect(res.status).toBe(502);
    expect(d.cancelInvitation).toHaveBeenCalledWith('Bearer t', 'inv1');
  });

  it('still answers 502 when cancelling fails too', async () => {
    const d = deps({
      deliver: vi.fn(async () => Promise.reject(new Error('down'))),
      cancelInvitation: vi.fn(async () => ({ error: { message: 'boom' } })),
    });
    const res = await handleInvite(post(valid), d);
    expect(res.status).toBe(502);
  });

  it('maps database errors to HTTP statuses without sending anything', async () => {
    const cases: [string, number][] = [
      ['42501', 403],
      ['22023', 400],
      ['23505', 409],
      ['P0001', 429],
      ['XX000', 500],
    ];
    for (const [code, status] of cases) {
      const d = deps({ createInvitation: vi.fn(async () => ({ data: null, error: { code, message: 'x' } })) });
      const res = await handleInvite(post(valid), d);
      expect(res.status).toBe(status);
      expect(d.deliver).not.toHaveBeenCalled();
    }
  });

  it('refuses when email is not configured, before creating anything', async () => {
    const d = deps({ deliver: null });
    const res = await handleInvite(post(valid), d);
    expect(res.status).toBe(500);
    expect(d.createInvitation).not.toHaveBeenCalled();
  });

  it('rejects bad input, owner invitations and a missing token', async () => {
    const d = deps();
    expect((await handleInvite(post({ ...valid, role: 'owner' }), d)).status).toBe(400);
    expect((await handleInvite(post({ ...valid, weddingId: 'nope' }), d)).status).toBe(400);
    expect((await handleInvite(post({ ...valid, email: 5 }), d)).status).toBe(400);
    expect((await handleInvite(post('{'), d)).status).toBe(400);
    expect((await handleInvite(post(valid, {}), d)).status).toBe(401);
    expect(d.createInvitation).not.toHaveBeenCalled();
  });

  it('answers the CORS preflight and rejects GET', async () => {
    expect((await handleInvite(new Request('https://x.test', { method: 'OPTIONS' }), deps())).status).toBe(200);
    expect((await handleInvite(new Request('https://x.test', { method: 'GET' }), deps())).status).toBe(405);
  });
});
