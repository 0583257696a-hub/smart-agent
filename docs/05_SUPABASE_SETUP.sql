-- מרכז תפעול לסוכן - Supabase Auth + approval setup
-- Run this once in Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  agency text,
  note text,
  role text not null default 'agent'
    check (role in ('super_admin', 'agency_admin', 'agent')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  permissions jsonb not null default '["operational_emails","email_templates","clients","management_fees","insurance_discounts","service_centers","institution_codes","bank_numbers"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists permissions jsonb not null default '["operational_emails","email_templates","clients","management_fees","insurance_discounts","service_centers","institution_codes","bank_numbers"]'::jsonb;

alter table public.profiles enable row level security;

create or replace function public.is_super_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'super_admin'
      and status = 'approved'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    agency,
    note,
    role,
    status,
    permissions
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'agency', ''),
    coalesce(new.raw_user_meta_data ->> 'note', ''),
    'agent',
    'pending',
    '["operational_emails","email_templates","clients","management_fees","insurance_discounts","service_centers","institution_codes","bank_numbers"]'::jsonb
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    agency = excluded.agency,
    note = excluded.note,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_super_admin(auth.uid())
);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

create policy "profiles_delete_admin"
on public.profiles
for delete
to authenticated
using (public.is_super_admin(auth.uid()));

-- After you register your own admin user from the site, run this line once
-- with your real admin email:
--
-- update public.profiles
-- set role = 'super_admin', status = 'approved', updated_at = now()
-- where email = 'YOUR_ADMIN_EMAIL_HERE';
