-- NS-122: public read-only timeline link (/t/<token>).
--
-- get_shared_timeline is what the `timeline-share` Edge Function calls with the service role: it turns a
-- token into the wedding's name, date, city and events, or null. It is not callable by anon or by signed-in
-- users, so a token can only be tried through the function. The token is 160 bits and only its sha256 is
-- stored (see NS-120). Event ids and audit columns are not returned.
--
-- revoke_timeline_share_token turns the link off without making a new one (generate_timeline_share_token
-- only ever replaces it). Same roles as generate: owner, partner, planner, helper.

create function public.get_shared_timeline(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'weddingName', w.name,
    'date', w.wedding_date,
    'city', w.city,
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'title', e.title,
          'startTime', to_char(e.start_time, 'HH24:MI'),
          'durationMinutes', e.duration_minutes,
          'location', e.location,
          'notes', e.notes
        )
        order by e.position, e.created_at
      )
      from public.timeline_events e
      where e.wedding_id = w.id
    ), '[]'::jsonb)
  )
  from public.timeline_share_tokens t
  join public.weddings w on w.id = t.wedding_id and w.deleted_at is null
  where t.token_hash = private.rsvp_token_hash(p_token);
$$;

-- Supabase grants execute on new public functions to anon and authenticated by default.
revoke all on function public.get_shared_timeline(text) from public, anon, authenticated;
grant execute on function public.get_shared_timeline(text) to service_role;

create function public.revoke_timeline_share_token(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(p_wedding_id, array['owner', 'partner', 'planner', 'helper']::public.member_role[]) then
    raise exception 'not allowed to share this timeline' using errcode = '42501';
  end if;
  delete from public.timeline_share_tokens where wedding_id = p_wedding_id;
end;
$$;

revoke all on function public.revoke_timeline_share_token(uuid) from public, anon;
grant execute on function public.revoke_timeline_share_token(uuid) to authenticated;
