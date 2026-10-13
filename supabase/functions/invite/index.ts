// NS-050: creates an invitation (the create_invitation RPC runs as the caller, so the role rules and
// RLS apply) and emails the one-time link through Resend. The plain token never goes back to the browser.
//
// Secrets (supabase secrets set): RESEND_API_KEY, INVITE_FROM (e.g. "Nunta Start <invitatii@example.ro>"),
// SITE_URL (the app origin, no trailing slash). INVITE_DEV_LOG=1 logs the link instead of emailing it (local only).
// INVITE_MAILPIT_URL (e.g. http://supabase_inbucket_nunta-start:8025) delivers to the local Mailpit instead (e2e only).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type CreatedInvitation, handleInvite } from './handler.ts';

const apiKey = Deno.env.get('RESEND_API_KEY');
const from = Deno.env.get('INVITE_FROM');
const devLog = Deno.env.get('INVITE_DEV_LOG') === '1';
const mailpitUrl = Deno.env.get('INVITE_MAILPIT_URL');

const asCaller = (authorization: string) =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
  });

Deno.serve((req) =>
  handleInvite(req, {
    siteUrl: Deno.env.get('SITE_URL')?.replace(/\/$/, ''),
    deliver: devLog
      ? async (mail) => {
          console.log(`[invite] ${mail.to}: ${mail.text}`);
        }
      : mailpitUrl
        ? async (mail) => {
            const res = await fetch(`${mailpitUrl}/api/v1/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                From: { Email: 'invitatii@nunta-start.test' },
                To: [{ Email: mail.to }],
                Subject: mail.subject,
                HTML: mail.html,
                Text: mail.text,
              }),
            });
            if (!res.ok) throw new Error(`Mailpit refused ${res.status}: ${await res.text()}`);
          }
        : apiKey && from
          ? async (mail) => {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
              });
              if (!res.ok) throw new Error(`Resend refused ${res.status}: ${await res.text()}`);
            }
          : null,
    async createInvitation(authorization, input) {
      const { data, error } = await asCaller(authorization).rpc('create_invitation', {
        p_wedding_id: input.weddingId,
        p_email: input.email,
        p_role: input.role,
      });
      return { data: (data as CreatedInvitation | null) ?? null, error };
    },
    async cancelInvitation(authorization, id) {
      const { error } = await asCaller(authorization).rpc('cancel_invitation', { p_id: id });
      return { error };
    },
  }),
);
