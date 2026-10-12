import { getSupabase } from '../lib/supabase';
import { DataError, unwrap } from './errors';
import {
  type ServerTimelineEvent,
  type TimelineEventUpdate,
  timelineEventFromRow,
  timelineEventToInsert,
} from './mappers';

/** RLS filtrează tăcut rândurile fără drept: zero rânduri atinse = 403. */
function requireRows(rows: readonly unknown[]): void {
  if (rows.length === 0) throw new DataError('Timeline event not written', 403, '42501');
}

export async function listTimelineEvents(weddingId: string): Promise<ServerTimelineEvent[]> {
  const rows = unwrap(
    await getSupabase()
      .from('timeline_events')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
  );
  return rows.map(timelineEventFromRow);
}

export async function insertTimelineEvent(weddingId: string, event: ServerTimelineEvent): Promise<void> {
  requireRows(
    unwrap(await getSupabase().from('timeline_events').insert(timelineEventToInsert(weddingId, event)).select('id')),
  );
}

export async function updateTimelineEvent(id: string, update: TimelineEventUpdate): Promise<void> {
  requireRows(unwrap(await getSupabase().from('timeline_events').update(update).eq('id', id).select('id')));
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  requireRows(unwrap(await getSupabase().from('timeline_events').delete().eq('id', id).select('id')));
}
