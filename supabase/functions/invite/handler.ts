// NS-050: the request logic of `invite`, kept free of Deno and Supabase imports so Vitest can test it.
import { inviteEmail, parseEmailLocale } from './email.ts';

const ROLES = ['partner', 'planner', 'helper', 'viewer'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface CreatedInvitation {
  id: string;
  token: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  weddingName: string;
  inviterName: string;
}

export interface RpcError {
  code?: string;
  message: string;
}

export interface Deps {
  /** The app origin without a trailing slash, or undefined when it is not configured. */
  siteUrl: string | undefined;
  /** Sends the email (throws on failure); null when email is not configured. */
  deliver: ((mail: { to: string; subject: string; html: string; text: string }) => Promise<void>) | null;
  /** create_invitation(), run as the caller so the role rules apply. */
  createInvitation(
    authorization: string,
    input: { weddingId: string; email: string; role: string },
  ): Promise<{ data: CreatedInvitation | null; error: RpcError | null }>;
  /** cancel_invitation(): marks a pending invitation whose email never left as cancelled (it still counts toward the send limit). */
  cancelInvitation(authorization: string, id: string): Promise<{ error: RpcError | null }>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Postgres error codes raised by create_invitation, as HTTP statuses. */
function statusOf(code: string | undefined): number {
  switch (code) {
    case '42501':
      return 403;
    case '22023':
      return 400;
    case '23505':
      return 409;
    case 'P0001':
      return 429;
    default:
      return 500;
  }
}

export async function handleInvite(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'sign in required' }, 401);

  let body: { weddingId?: unknown; email?: unknown; role?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const { weddingId, email, role } = body;
  if (
    typeof weddingId !== 'string' ||
    !UUID.test(weddingId) ||
    typeof email !== 'string' ||
    typeof role !== 'string' ||
    !ROLES.includes(role)
  ) {
    return json({ error: 'invalid input' }, 400);
  }

  if (!deps.siteUrl || !deps.deliver) return json({ error: 'email is not configured' }, 500);

  const { data, error } = await deps.createInvitation(authorization, { weddingId, email, role });
  if (error || !data)
    return json({ error: error?.message ?? 'could not create the invitation' }, statusOf(error?.code));

  const mail = inviteEmail({
    locale: parseEmailLocale(body.locale),
    inviterName: data.inviterName,
    weddingName: data.weddingName,
    role: data.role,
    link: `${deps.siteUrl}/invite/${data.token}`,
    days: Math.round((Date.parse(data.expiresAt) - Date.parse(data.createdAt)) / 86_400_000),
  });

  try {
    await deps.deliver({ to: data.email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    console.error('[invite] email not sent', e);
    // An invitation whose email never left must not stay pending: the owner would see it but nobody has
    // the link. Cancelling keeps the row, so the 24-hour send limit still counts it and cannot be bypassed.
    const { error: undoError } = await deps.cancelInvitation(authorization, data.id);
    if (undoError) console.error('[invite] could not cancel the invitation', data.id, undoError);
    return json({ error: 'the email could not be sent' }, 502);
  }

  return json({
    invitation: {
      id: data.id,
      email: data.email,
      role: data.role,
      created_at: data.createdAt,
      expires_at: data.expiresAt,
    },
  });
}
