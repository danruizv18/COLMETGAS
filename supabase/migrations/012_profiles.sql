-- RBAC foundation: user roles, profiles table, auto-create trigger, helper functions.
-- Run this on DEV first. After applying, run the bootstrap SQL to promote yourself to admin.

-- ─────────────────────────────────────────────────────────────
-- Role enum
-- ─────────────────────────────────────────────────────────────
create type user_role_enum as enum ('admin', 'engineer', 'technician', 'client');

-- ─────────────────────────────────────────────────────────────
-- Profiles table
-- ─────────────────────────────────────────────────────────────
-- One row per auth user. customer_id is only meaningful for the 'client' role.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role_enum not null default 'technician',  -- least-privilege default
  customer_id uuid references customers(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create index idx_profiles_customer_id on profiles(customer_id);
create index idx_profiles_role        on profiles(role);

-- ─────────────────────────────────────────────────────────────
-- Auto-create profile when a new auth user signs up
-- ─────────────────────────────────────────────────────────────
-- Default role is 'technician' (least privilege). Promote via bootstrap SQL below.
create or replace function create_profile_for_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'technician'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_create_profile_on_signup
  after insert on auth.users
  for each row execute function create_profile_for_new_user();

-- ─────────────────────────────────────────────────────────────
-- Role lookup helper (SECURITY DEFINER avoids RLS recursion)
-- ─────────────────────────────────────────────────────────────
-- WHY SECURITY DEFINER: RLS policies on other tables call this function.
-- If this ran under the caller's role it would itself be subject to the
-- profiles RLS policy, which would cause infinite recursion. SECURITY DEFINER
-- runs with the function owner's privileges (postgres), bypassing RLS on profiles.
-- Marked STABLE so Postgres can cache the result within a single statement.
create or replace function get_my_role()
returns user_role_enum
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- Customer FK helper for client-scoped queries
create or replace function get_my_customer_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select customer_id from profiles where id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS on profiles
-- ─────────────────────────────────────────────────────────────
-- Policies here deliberately do NOT call get_my_role() to avoid recursion.
-- Admin profile management uses the service-role client (bypasses RLS entirely).
alter table profiles enable row level security;

-- All authenticated users can read their own profile (needed for role-based UI).
create policy "profiles_own_select" on profiles
  for select to authenticated
  using (id = auth.uid());

-- No writes from the anon client — the signup trigger (SECURITY DEFINER) handles
-- initial INSERT, and role/customer changes go through the admin service-role client.

-- ─────────────────────────────────────────────────────────────
-- BOOTSTRAP SQL — run once after your first sign-up
-- ─────────────────────────────────────────────────────────────
-- Execute this in the Supabase SQL editor (runs as service role, bypasses RLS):
--
--   update profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
--
-- Verify:
--   select id, full_name, role from profiles;
