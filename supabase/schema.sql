-- Nido database setup. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run once on a fresh project.

-- 1. Tables ---------------------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  data        jsonb       not null default '{}'::jsonb,   -- the whole home: lists, money, chores…
  version     bigint      not null default 1,             -- bumps on every save (conflict detection)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  email        text not null check (email = lower(email)),
  member_id    text,                                      -- which housemate in the app this email is
  created_at   timestamptz not null default now(),
  primary key (household_id, email)
);

-- 2. Helpers ----------------------------------------------------------------
create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id = hid and email = public.my_email() and public.my_email() <> '');
$$;

-- Same check, for storage paths ("<household id>/<file>").
create or replace function public.is_member_text(hid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id::text = hid and email = public.my_email() and public.my_email() <> '');
$$;

-- Creates a home and makes the caller its first member.
create or replace function public.create_household(initial jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid; e text := public.my_email();
begin
  if e = '' then raise exception 'Not signed in'; end if;
  insert into public.households (data) values (coalesce(initial, '{}'::jsonb)) returning id into hid;
  insert into public.household_members (household_id, email) values (hid, e);
  return hid;
end $$;

revoke all on function public.create_household(jsonb) from public, anon;
grant execute on function public.create_household(jsonb) to authenticated;

-- 3. Row-level security: only people on a home's member list can see or change it.
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

drop policy if exists "members read home"   on public.households;
drop policy if exists "members update home" on public.households;
create policy "members read home"   on public.households for select to authenticated using (public.is_member(id));
create policy "members update home" on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists "read own memberships"   on public.household_members;
drop policy if exists "read home memberships"  on public.household_members;
drop policy if exists "members invite"         on public.household_members;
drop policy if exists "members edit"           on public.household_members;
drop policy if exists "members remove"         on public.household_members;
create policy "read own memberships"  on public.household_members for select to authenticated using (email = public.my_email());
create policy "read home memberships" on public.household_members for select to authenticated using (public.is_member(household_id));
create policy "members invite" on public.household_members for insert to authenticated with check (public.is_member(household_id));
create policy "members edit"   on public.household_members for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members remove" on public.household_members for delete to authenticated using (public.is_member(household_id));

-- 4. Live updates between phones
do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null; end $$;

-- 5. Private storage for bill PDFs and photos
insert into storage.buckets (id, name, public, file_size_limit)
values ('nido-files', 'nido-files', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "nido files read"   on storage.objects;
drop policy if exists "nido files upload" on storage.objects;
drop policy if exists "nido files delete" on storage.objects;
create policy "nido files read"   on storage.objects for select to authenticated
  using (bucket_id = 'nido-files' and public.is_member_text((storage.foldername(name))[1]));
create policy "nido files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'nido-files' and public.is_member_text((storage.foldername(name))[1]));
create policy "nido files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'nido-files' and public.is_member_text((storage.foldername(name))[1]));
