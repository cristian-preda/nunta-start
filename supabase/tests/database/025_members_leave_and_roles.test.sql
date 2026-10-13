begin;
select plan(9);

insert into public.allowed_emails (email) values
  ('m1@example.com'), ('m2@example.com'), ('m3@example.com'), ('m4@example.com');

-- m1 owner, m2 partner, m3 planner, m4 viewer (all of W1)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'm1@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'm2@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'm3@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'm4@example.com');
insert into public.weddings (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'W1');
insert into public.wedding_members (wedding_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2', 'partner'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c3', 'planner'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c4', 'viewer');

create function public.test_rows_affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

set local role authenticated;

-- the (last) owner cannot leave or be demoted
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000c1'$q$),
  0, 'the last owner cannot leave');
select is(
  public.test_rows_affected($q$update public.wedding_members set role = 'partner' where user_id = '00000000-0000-0000-0000-0000000000c1'$q$),
  0, 'the last owner cannot be demoted');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is(
  public.test_rows_affected($q$update public.wedding_members set role = 'partner' where user_id = '00000000-0000-0000-0000-0000000000c1'$q$),
  0, 'a partner cannot demote the owner');
select throws_ok(
  $$update public.wedding_members set role = 'owner' where user_id = '00000000-0000-0000-0000-0000000000c2'$$,
  '42501', null, 'a partner cannot promote themselves to owner');
select is(
  public.test_rows_affected($q$update public.wedding_members set role = 'viewer' where user_id = '00000000-0000-0000-0000-0000000000c3'$q$),
  1, 'a partner can change a planner role');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000c2'$q$),
  0, 'a member below partner cannot remove a partner');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000c3'$q$),
  0, 'a viewer cannot remove another member');
select is(
  public.test_rows_affected($q$delete from public.wedding_members where user_id = '00000000-0000-0000-0000-0000000000c4'$q$),
  1, 'a non-owner member can leave');

reset role;
select is(
  (select count(*)::int from public.wedding_members where wedding_id = '00000000-0000-0000-0000-0000000000d1'),
  3, 'three members remain, the owner among them');

select * from finish();
rollback;
