import { describe, expect, it } from 'vitest';
import { redactDeep, redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('hides the invite token', () => {
    expect(redactSecrets('https://x.ro/invite/abc123_-XYZ?preview=1')).toBe('https://x.ro/invite/[redacted]?preview=1');
  });

  it('hides the RSVP token', () => {
    expect(redactSecrets('https://x.ro/r/0123abcd?x=1')).toBe('https://x.ro/r/[redacted]?x=1');
  });

  it('hides the timeline share token', () => {
    expect(redactSecrets('https://x.ro/t/0123abcd?print=1')).toBe('https://x.ro/t/[redacted]?print=1');
  });

  it('hides the token in the Edge Function request urls Faro records', () => {
    expect(redactSecrets('https://abc.supabase.co/functions/v1/timeline-share/0123abcd')).toBe(
      'https://abc.supabase.co/functions/v1/timeline-share/[redacted]',
    );
    expect(redactSecrets('https://abc.supabase.co/functions/v1/rsvp/0123abcd?x=1')).toBe(
      'https://abc.supabase.co/functions/v1/rsvp/[redacted]?x=1',
    );
  });

  it('hides the token in a resource timing entry, wherever the url sits', () => {
    const entry = { name: 'https://abc.supabase.co/functions/v1/timeline-share/0123abcd', initiatorType: 'fetch' };
    expect(JSON.stringify(redactDeep({ payload: { entries: [entry] } }))).not.toContain('0123abcd');
  });

  it('hides auth params in query and hash', () => {
    expect(redactSecrets('/auth/callback?code=abc&next=/w')).toBe('/auth/callback?code=[redacted]&next=/w');
    expect(redactSecrets('/auth/callback#access_token=a.b.c&refresh_token=r&type=magiclink')).toBe(
      '/auth/callback#access_token=[redacted]&refresh_token=[redacted]&type=magiclink',
    );
  });

  it('leaves ordinary urls alone', () => {
    expect(redactSecrets('/w/123/calculator?tab=1')).toBe('/w/123/calculator?tab=1');
  });
});

describe('redactDeep', () => {
  it('cleans nested strings without touching the shape', () => {
    const item = {
      meta: { page: { url: 'https://x.ro/invite/secret' } },
      payload: { n: 1, list: ['/auth/callback?code=c'] },
    };
    expect(redactDeep(item)).toEqual({
      meta: { page: { url: 'https://x.ro/invite/[redacted]' } },
      payload: { n: 1, list: ['/auth/callback?code=[redacted]'] },
    });
  });
});
