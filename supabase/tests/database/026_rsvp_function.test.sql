begin;
select plan(18);

insert into public.allowed_emails (email) values ('a1@example.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com');
insert into public.weddings (id, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'Ana & Mihai'),
  ('00000000-0000-0000-0000-0000000000b2', 'Other');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.households (id, wedding_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Familia Popescu'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'Familia Alta');
insert into public.guests (id, wedding_id, household_id, first_name, last_name, position) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Ion', 'Popescu', 10),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Maria', 'Popescu', 20),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d2', 'Alt', 'Om', 10);

create temp table tokens (token text);
grant all on tokens to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into tokens select public.generate_household_rsvp_token('00000000-0000-0000-0000-0000000000d1');

-- Only the service role may call the RPCs.
select throws_ok($$select public.get_rsvp_household('x')$$, '42501', null, 'a signed-in user cannot read a household by token');
select throws_ok($$select public.submit_rsvp('x', '[]', '')$$, '42501', null, 'a signed-in user cannot submit');
select throws_ok($$select public.rsvp_rate_limit_hit('k', 1, 60)$$, '42501', null, 'a signed-in user cannot touch the rate limit');
set local role anon;
select throws_ok($$select public.get_rsvp_household('x')$$, '42501', null, 'anon cannot read a household by token');
reset role;

set local role service_role;
select is(
  public.get_rsvp_household((select token from tokens)) ->> 'householdName', 'Familia Popescu', 'the token returns the household');
select is(
  (select jsonb_agg(g ->> 'name') from jsonb_array_elements(public.get_rsvp_household((select token from tokens)) -> 'guests') g),
  '["Ion Popescu", "Maria Popescu"]'::jsonb, 'guests are returned in order, by full name');
select is(public.get_rsvp_household('nope'), null, 'an unknown token returns null');
select is(public.submit_rsvp('nope', '[{"guestId":"00000000-0000-0000-0000-0000000000c1","attending":"yes","diet":"classic"}]', ''),
  false, 'an unknown token is not saved');

select throws_ok(
  format($$select public.submit_rsvp(%L, '[{"guestId":"00000000-0000-0000-0000-0000000000c3","attending":"yes","diet":"classic"}]', '')$$,
    (select token from tokens)),
  '22023', null, 'a guest from another household is refused');
select throws_ok(
  format($$select public.submit_rsvp(%L, '[{"guestId":"00000000-0000-0000-0000-0000000000c1","attending":"yes","diet":"halal"}]', '')$$,
    (select token from tokens)),
  '22023', null, 'a diet outside the enum is refused');

select is(
  public.submit_rsvp((select token from tokens),
    '[{"guestId":"00000000-0000-0000-0000-0000000000c1","attending":"yes","diet":"vegan"},{"guestId":"00000000-0000-0000-0000-0000000000c2","attending":"no","diet":"classic"}]',
    'Abia asteptam'),
  true, 'valid answers are saved');
reset role;
select is(
  (select attending || '/' || diet from public.guests where id = '00000000-0000-0000-0000-0000000000c1'),
  'yes/vegan', 'attending and diet are stored on the guest');
select is(
  (select rsvp_note from public.households where id = '00000000-0000-0000-0000-0000000000d1'),
  'Abia asteptam', 'the note is stored on the household');

-- The guests' note is personal text: the household update is logged, but without the note.
select is(
  (select count(*)::int from public.activity_log
   where entity = 'households' and entity_id = '00000000-0000-0000-0000-0000000000d1' and action = 'update'
     and summary::text like '%Abia asteptam%'),
  0, 'the activity log holds no rsvp_note text');
select is(
  (select count(*)::int from public.activity_log
   where entity = 'households' and entity_id = '00000000-0000-0000-0000-0000000000d1'
     and summary::text like '%rsvp_note%'),
  0, 'the activity log has no rsvp_note key');

-- Rate limit: 2 allowed, the 3rd is refused.
set local role service_role;
select is(public.rsvp_rate_limit_hit('ip1', 2, 600), true, 'first hit allowed');
select is(public.rsvp_rate_limit_hit('ip1', 2, 600), true, 'second hit allowed');
select is(public.rsvp_rate_limit_hit('ip1', 2, 600), false, 'third hit refused');
reset role;

select * from finish();
rollback;
