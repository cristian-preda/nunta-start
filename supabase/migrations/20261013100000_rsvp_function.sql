-- NS-081: what the `rsvp` Edge Function needs from the database. All three RPCs are service_role only, so a
-- token can only be tried through the function (same shape as get_shared_timeline, NS-122).
--
-- households.rsvp_note is the note the family left on /r/<token>; unlike households.notes (the couple's own
-- notes) it is written by the guests, so it has its own column. Members read it through the existing RLS.

alter table public.households
  add column rsvp_note text not null default '' check (char_length(rsvp_note) <= 500),
  add column rsvp_answered_at timestamptz;

-- The household behind a token, in the shape of RsvpHousehold (src/lib/rsvp.ts), or null.
-- A deleted wedding is not served, even with a valid token.
create function public.get_rsvp_household(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'householdName', h.name,
    'weddingName', w.name,
    'note', h.rsvp_note,
    'guests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'name', btrim(g.first_name || ' ' || g.last_name),
          'ageGroup', g.age_group,
          'attending', g.attending,
          'diet', g.diet
        )
        order by g.position, g.created_at
      )
      from public.guests g
      where g.household_id = h.id
    ), '[]'::jsonb)
  )
  from public.household_rsvp_tokens t
  join public.households h on h.id = t.household_id
  join public.weddings w on w.id = t.wedding_id and w.deleted_at is null
  where t.token_hash = private.rsvp_token_hash(p_token);
$$;

-- Saves the family's answers. p_answers is [{guestId, attending: 'yes'|'no', diet}]; every guestId must be a
-- guest of the token's household (22023 otherwise, and nothing is written: the whole call rolls back).
-- Returns false for an unknown token. Only attending and diet are written: there is no allergy field anywhere.
create function public.submit_rsvp(p_token text, p_answers jsonb, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid;
  v_answer jsonb;
  v_updated int;
begin
  select t.household_id into v_household
  from public.household_rsvp_tokens t
  join public.weddings w on w.id = t.wedding_id and w.deleted_at is null
  where t.token_hash = private.rsvp_token_hash(p_token);
  if v_household is null then
    return false;
  end if;

  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'answers must be a non-empty array' using errcode = '22023';
  end if;

  for v_answer in select * from jsonb_array_elements(p_answers) loop
    if v_answer ->> 'attending' is null or v_answer ->> 'attending' not in ('yes', 'no')
      or v_answer ->> 'diet' is null or v_answer ->> 'diet' not in ('classic', 'vegetarian', 'vegan') then
      raise exception 'invalid answer' using errcode = '22023';
    end if;
    update public.guests
      set attending = v_answer ->> 'attending', diet = v_answer ->> 'diet'
      where id = (v_answer ->> 'guestId')::uuid and household_id = v_household;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'guest is not in this household' using errcode = '22023';
    end if;
  end loop;

  update public.households
    set rsvp_note = left(coalesce(p_note, ''), 500), rsvp_answered_at = now()
    where id = v_household;
  return true;
end;
$$;

-- Per-IP request budget for the function. The key is a hash of the IP computed by the function, so no raw
-- address is stored; rows older than a day are dropped on the way. Fixed window: the first hit opens it.
create table private.rsvp_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

create function public.rsvp_rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits int;
begin
  delete from private.rsvp_rate_limits where window_start < now() - interval '1 day';
  insert into private.rsvp_rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning r.hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- Supabase grants execute on new public functions to anon and authenticated by default.
revoke all on function public.get_rsvp_household(text) from public, anon, authenticated;
revoke all on function public.submit_rsvp(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.rsvp_rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.get_rsvp_household(text) to service_role;
grant execute on function public.submit_rsvp(text, jsonb, text) to service_role;
grant execute on function public.rsvp_rate_limit_hit(text, int, int) to service_role;
