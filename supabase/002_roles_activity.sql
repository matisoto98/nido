-- Nido update 2: roles (admin / user), activity log and "last seen".
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- 1. Roles and last-seen on memberships ------------------------------------
alter table public.household_members add column if not exists role text not null default 'user';
alter table public.household_members drop constraint if exists household_members_role_check;
alter table public.household_members add constraint household_members_role_check check (role in ('admin', 'user'));
alter table public.household_members add column if not exists last_seen_at timestamptz;

-- The person who created each home becomes its admin (if it has none yet).
update public.household_members hm set role = 'admin'
where (hm.household_id, hm.created_at) in
      (select household_id, min(created_at) from public.household_members group by household_id)
  and not exists (select 1 from public.household_members a
                  where a.household_id = hm.household_id and a.role = 'admin');

create or replace function public.is_admin(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id = hid and email = public.my_email()
                   and role = 'admin' and public.my_email() <> '');
$$;
grant execute on function public.is_admin(uuid) to authenticated;

-- New homes: the creator is the admin.
create or replace function public.create_household(initial jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid; e text := public.my_email();
begin
  if e = '' then raise exception 'Not signed in'; end if;
  insert into public.households (data) values (coalesce(initial, '{}'::jsonb)) returning id into hid;
  insert into public.household_members (household_id, email, role) values (hid, e, 'admin');
  return hid;
end $$;

-- 2. Only admins add, change or remove people -------------------------------
drop policy if exists "members invite" on public.household_members;
drop policy if exists "members edit"   on public.household_members;
drop policy if exists "members remove" on public.household_members;
drop policy if exists "admins invite"  on public.household_members;
drop policy if exists "admins edit"    on public.household_members;
drop policy if exists "admins remove"  on public.household_members;
create policy "admins invite" on public.household_members for insert to authenticated
  with check (public.is_admin(household_id));
create policy "admins edit" on public.household_members for update to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
create policy "admins remove" on public.household_members for delete to authenticated
  using (public.is_admin(household_id) and email <> public.my_email());

-- A home always keeps at least one admin.
create or replace function public.keep_an_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from public.households where id = old.household_id)
     and not exists (select 1 from public.household_members
                     where household_id = old.household_id and role = 'admin' and email <> old.email) then
    raise exception 'A home needs at least one admin';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists keep_an_admin on public.household_members;
create trigger keep_an_admin before update or delete on public.household_members
  for each row execute function public.keep_an_admin();

-- Things everyone may do for themselves.
create or replace function public.set_my_member(hid uuid, mid text) returns void
language sql security definer set search_path = public as $$
  update public.household_members set member_id = mid
  where household_id = hid and email = public.my_email() and public.my_email() <> '';
$$;
create or replace function public.touch_presence(hid uuid) returns void
language sql security definer set search_path = public as $$
  update public.household_members set last_seen_at = now()
  where household_id = hid and email = public.my_email() and public.my_email() <> '';
$$;
revoke all on function public.set_my_member(uuid, text), public.touch_presence(uuid) from public, anon;
grant execute on function public.set_my_member(uuid, text), public.touch_presence(uuid) to authenticated;

-- 3. Activity log: everyone writes their own actions, only admins can read --
create table if not exists public.activity (
  id           bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  email        text not null,
  member_id    text,
  action       text not null check (char_length(action) <= 300),
  at           timestamptz not null default now()
);
create index if not exists activity_household_at on public.activity (household_id, at desc);
alter table public.activity enable row level security;
grant select, insert on public.activity to authenticated;
revoke all on public.activity from anon;

drop policy if exists "members log own actions" on public.activity;
drop policy if exists "admins read activity"    on public.activity;
create policy "members log own actions" on public.activity for insert to authenticated
  with check (public.is_member(household_id) and email = public.my_email());
create policy "admins read activity" on public.activity for select to authenticated
  using (public.is_admin(household_id));

do $$ begin
  alter publication supabase_realtime add table public.activity;
exception when duplicate_object then null; end $$;
