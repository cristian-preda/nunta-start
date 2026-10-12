import { FunctionsHttpError } from '@supabase/supabase-js';
import { isValidISODate } from '../domain/dates';
import { isValidTime } from '../domain/timeline';
import { timelineSharePath } from '../lib/paths';
import { getSupabase } from '../lib/supabase';
import { type SharedTimeline, type TimelineShareClient, TimelineShareNotFoundError } from '../lib/timelineShare';
import { unwrap } from './errors';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Răspunsul funcției `timeline-share` în forma paginii; un eveniment fără titlu sau fără oră validă se omite. */
export function sharedTimelineFromJson(json: unknown): SharedTimeline {
  const o = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  const events = Array.isArray(o.events) ? o.events : [];
  return {
    weddingName: str(o.weddingName),
    date: typeof o.date === 'string' && isValidISODate(o.date) ? o.date : null,
    city: str(o.city) || null,
    events: events.flatMap((e) => {
      const r = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
      const title = str(r.title).trim();
      const startTime = str(r.startTime);
      if (!title || !isValidTime(startTime)) return [];
      const d = r.durationMinutes;
      return [
        {
          title,
          startTime,
          durationMinutes: typeof d === 'number' && Number.isInteger(d) && d > 0 ? d : null,
          location: str(r.location),
          notes: str(r.notes),
        },
      ];
    }),
  };
}

/** Un 404 al funcției înseamnă link necunoscut sau oprit; alt refuz HTTP e eroare; o cerere căzută din rețea e `TypeError`. */
function mapError(error: unknown): unknown {
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response).status;
    return status === 404 ? new TimelineShareNotFoundError() : new Error(`Timeline share failed (${status})`);
  }
  return error instanceof Error ? new TypeError(error.message) : error;
}

/** Clientul real al paginii publice, către Edge Function-ul `timeline-share`; vezi docs/runbooks/timeline-share.md. */
export const supabaseTimelineShareClient: TimelineShareClient = {
  async fetchTimeline(token) {
    const { data, error } = await getSupabase().functions.invoke(`timeline-share/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    if (error) throw mapError(error);
    return sharedTimelineFromJson(data);
  },
};

/** Creează sau înlocuiește linkul programului; textul clar vine o singură dată, serverul ține doar hash-ul. */
export async function generateTimelineShareToken(weddingId: string): Promise<string> {
  return unwrap(await getSupabase().rpc('generate_timeline_share_token', { p_wedding_id: weddingId }));
}

/** Oprește distribuirea: linkul trimis nu mai funcționează și nu se face altul. */
export async function revokeTimelineShareToken(weddingId: string): Promise<void> {
  unwrap(await getSupabase().rpc('revoke_timeline_share_token', { p_wedding_id: weddingId }));
}

export const timelineShareUrl = (token: string) => `${window.location.origin}${timelineSharePath(token)}`;
