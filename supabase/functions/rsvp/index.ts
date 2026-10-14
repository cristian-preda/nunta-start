// NS-081: the public RSVP endpoint behind /r/<token>: reads a household and saves its answers, with no account.
// Runs with the service role because the token table has no client access; it can only call the three RPCs
// get_rsvp_household, submit_rsvp and rsvp_rate_limit_hit.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from the platform.
// TURNSTILE_SECRET_KEY (optional): when set, every POST must carry a valid Turnstile token; when unset the
// check is skipped so local development and CI work. Provisioning Turnstile is NS-023.
// See docs/runbooks/rsvp.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRsvp, type RsvpHousehold } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');

// 60 requests per IP per 10 minutes (GET and POST together): plenty for a family on one phone, not for a script.
const LIMIT = 60;
const WINDOW_SECONDS = 600;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve((req) =>
  handleRsvp(req, {
    async allowRequest(key) {
      const { data, error } = await admin.rpc('rsvp_rate_limit_hit', {
        p_key: await sha256Hex(key),
        p_limit: LIMIT,
        p_window_seconds: WINDOW_SECONDS,
      });
      if (error) throw new Error(error.message);
      return data === true;
    },
    verifyTurnstile: turnstileSecret
      ? async (token, ip) => {
          const form = new URLSearchParams({ secret: turnstileSecret, response: token });
          if (ip) form.set('remoteip', ip);
          const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: form,
          });
          if (!res.ok) throw new Error(`Turnstile siteverify answered ${res.status}`);
          return ((await res.json()) as { success?: boolean }).success === true;
        }
      : null,
    async lookup(token) {
      const { data, error } = await admin.rpc('get_rsvp_household', { p_token: token });
      if (error) throw new Error(error.message);
      return (data as RsvpHousehold | null) ?? null;
    },
    async submit(token, answers, note) {
      const { data, error } = await admin.rpc('submit_rsvp', { p_token: token, p_answers: answers, p_note: note });
      if (error) {
        if (error.code === '22023') return 'invalid';
        throw new Error(error.message);
      }
      return data === true ? 'saved' : 'not_found';
    },
  }),
);
