// NS-122: the request logic of `timeline-share`, free of Deno and Supabase imports so Vitest can test it.
//
//   GET timeline-share/<token>  ->  200 SharedTimeline | 404 (unknown, revoked or malformed token)

export interface SharedTimeline {
  weddingName: string;
  date: string | null;
  city: string | null;
  events: {
    title: string;
    startTime: string;
    durationMinutes: number | null;
    location: string;
    notes: string;
  }[];
}

export interface Deps {
  /** get_shared_timeline(): the schedule behind a token, or null. Throws when the database cannot be reached. */
  lookup(token: string): Promise<SharedTimeline | null>;
}

/** Tokens are 20 random bytes in hex (generate_timeline_share_token); anything else is answered without a lookup. */
const TOKEN = /^[0-9a-f]{40}$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// The link can be switched off at any moment, so nothing may be cached; the page is not for search engines.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });

/** The token is the last path segment (`/timeline-share/<token>`, with or without a trailing slash). */
export function tokenFromUrl(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  const last = segments.at(-1) ?? '';
  try {
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

export async function handleShare(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  const token = tokenFromUrl(req.url);
  if (!TOKEN.test(token)) return json({ error: 'not found' }, 404);

  let timeline: SharedTimeline | null;
  try {
    timeline = await deps.lookup(token);
  } catch (error) {
    console.error('timeline-share: lookup failed', error);
    return json({ error: 'could not load the schedule' }, 500);
  }
  return timeline ? json(timeline) : json({ error: 'not found' }, 404);
}
