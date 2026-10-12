begin;
select plan(18);

insert into public.allowed_emails (email) values ('a1@example.com'), ('a2@example.com'), ('a3@example.com'), ('a4@example.com');

-- a1 owner, a2 viewer, a3 outsider, a4 helper of W1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com');
insert into public.weddings (id, name, wedding_date, city) values
  ('00000000-0000-0000-0000-0000000000b1', 'Ana & Mihai', '2027-06-12', 'Brașov');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'viewer'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', 'helper');
-- inserted out of position order on purpose
insert into public.timeline_events (wedding_id, title, start_time, duration_minutes, location, notes, position) values
  ('00000000-0000-0000-0000-0000000000b1', 'Petrecere', '19:30', null, 'Sala Cristal', '', 20),
  ('00000000-0000-0000-0000-0000000000b1', 'Cununia', '16:00', 60, 'Biserica', 'Verighetele', 10);

create temp table tokens (who text primary key, token text);
grant all on tokens to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into tokens select 'first', public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1');
insert into tokens select 'second', public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1');

-- Only the service role may look a token up.
select throws_ok($$select public.get_shared_timeline('x')$$, '42501', null, 'a signed-in user cannot call get_shared_timeline');
set local role anon;
select throws_ok($$select public.get_shared_timeline('x')$$, '42501', null, 'anon cannot call get_shared_timeline');
reset role;

set local role service_role;
select is(
  public.get_shared_timeline((select token from tokens where who = 'second')) ->> 'weddingName',
  'Ana & Mihai', 'the current token returns the wedding name');
select is(
  public.get_shared_timeline((select token from tokens where who = 'second')) ->> 'date',
  '2027-06-12', 'and the date');
select is(
  public.get_shared_timeline((select token from tokens where who = 'second')) -> 'events' -> 0 ->> 'title',
  'Cununia', 'events come back in position order');
select is(
  public.get_shared_timeline((select token from tokens where who = 'second')) -> 'events' -> 0 ->> 'startTime',
  '16:00', 'the start time has no seconds');
select is(
  public.get_shared_timeline((select token from tokens where who = 'second')) -> 'events' -> 1 -> 'durationMinutes',
  'null'::jsonb, 'an unknown duration is null');
select is(
  (select count(*)::int from jsonb_object_keys(
    public.get_shared_timeline((select token from tokens where who = 'second')) -> 'events' -> 0)),
  5, 'an event exposes only title, time, duration, location and notes');
select is(public.get_shared_timeline((select token from tokens where who = 'first')), null, 'a rotated-out token returns null');
select is(public.get_shared_timeline('not-a-token'), null, 'a wrong token returns null');
select is(public.get_shared_timeline(''), null, 'an empty token returns null');
select is(public.get_shared_timeline(null), null, 'a null token returns null');
reset role;

-- Revoking.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.revoke_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'a viewer cannot revoke the link');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$select public.revoke_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'an outsider cannot revoke the link');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select lives_ok(
  $$select public.revoke_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  'a helper can revoke the link');
select lives_ok(
  $$select public.revoke_timeline_share_token('00000000-0000-0000-0000-0000000000b1')$$,
  'revoking again is harmless');
reset role;

set local role service_role;
select is(public.get_shared_timeline((select token from tokens where who = 'second')), null, 'a revoked link stops working');
reset role;

-- A deleted wedding is not served, even with a valid token.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into tokens select 'third', public.generate_timeline_share_token('00000000-0000-0000-0000-0000000000b1');
update public.weddings set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000b1';
reset role;
set local role service_role;
select is(public.get_shared_timeline((select token from tokens where who = 'third')), null, 'a deleted wedding is not served');
reset role;

select * from finish();
rollback;
