// NS-122: serves the read-only day-of schedule behind a share link, with no account. Runs with the service
// role because the token table has no client access; the only thing it can do is call get_shared_timeline().
//
// Needs no secrets of its own: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
// See docs/runbooks/timeline-share.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleShare, type SharedTimeline } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve((req) =>
  handleShare(req, {
    async lookup(token) {
      const { data, error } = await admin.rpc('get_shared_timeline', { p_token: token });
      if (error) throw new Error(error.message);
      return (data as SharedTimeline | null) ?? null;
    },
  }),
);
