create extension if not exists pgcrypto;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  blood_type text,
  allergies text,
  medical_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'light',
  language text not null default 'en',
  notifications_enabled boolean not null default true,
  shake_to_alert boolean not null default true,
  auto_recording boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_check check (theme in ('light', 'dark'))
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text not null default 'Family',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  location_text text not null default '',
  status text not null default 'active',
  contacts_notified integer not null default 0,
  response_time_min integer,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint alerts_status_check check (status in ('active', 'resolved', 'cancelled')),
  constraint alerts_contacts_notified_check check (contacts_notified >= 0),
  constraint alerts_response_time_min_check check (response_time_min is null or response_time_min >= 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('alert', 'success', 'info'))
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists blood_type text;
alter table public.profiles add column if not exists allergies text;
alter table public.profiles add column if not exists medical_conditions text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.user_settings add column if not exists theme text not null default 'light';
alter table public.user_settings add column if not exists language text not null default 'en';
alter table public.user_settings add column if not exists notifications_enabled boolean not null default true;
alter table public.user_settings add column if not exists shake_to_alert boolean not null default true;
alter table public.user_settings add column if not exists auto_recording boolean not null default false;
alter table public.user_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

alter table public.emergency_contacts add column if not exists relationship text not null default 'Family';
alter table public.emergency_contacts add column if not exists is_primary boolean not null default false;
alter table public.emergency_contacts add column if not exists created_at timestamptz not null default now();
alter table public.emergency_contacts add column if not exists updated_at timestamptz not null default now();

alter table public.alerts add column if not exists latitude double precision;
alter table public.alerts add column if not exists longitude double precision;
alter table public.alerts add column if not exists location_text text not null default '';
alter table public.alerts add column if not exists status text not null default 'active';
alter table public.alerts add column if not exists contacts_notified integer not null default 0;
alter table public.alerts add column if not exists response_time_min integer;
alter table public.alerts add column if not exists created_at timestamptz not null default now();
alter table public.alerts add column if not exists resolved_at timestamptz;

alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add column if not exists read boolean not null default false;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

alter table public.locations add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alerts_status_check'
  ) then
    alter table public.alerts
      add constraint alerts_status_check
      check (status in ('active', 'resolved', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alerts_contacts_notified_check'
  ) then
    alter table public.alerts
      add constraint alerts_contacts_notified_check
      check (contacts_notified >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'alerts_response_time_min_check'
  ) then
    alter table public.alerts
      add constraint alerts_response_time_min_check
      check (response_time_min is null or response_time_min >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('alert', 'success', 'info'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_theme_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_theme_check
      check (theme in ('light', 'dark'));
  end if;
end
$$;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.locations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Users can view own settings'
  ) then
    create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Users can insert own settings'
  ) then
    create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Users can update own settings'
  ) then
    create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'emergency_contacts' and policyname = 'Users can view own contacts'
  ) then
    create policy "Users can view own contacts" on public.emergency_contacts for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'emergency_contacts' and policyname = 'Users can insert own contacts'
  ) then
    create policy "Users can insert own contacts" on public.emergency_contacts for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'emergency_contacts' and policyname = 'Users can update own contacts'
  ) then
    create policy "Users can update own contacts" on public.emergency_contacts for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'emergency_contacts' and policyname = 'Users can delete own contacts'
  ) then
    create policy "Users can delete own contacts" on public.emergency_contacts for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alerts' and policyname = 'Users can view own alerts'
  ) then
    create policy "Users can view own alerts" on public.alerts for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alerts' and policyname = 'Users can insert own alerts'
  ) then
    create policy "Users can insert own alerts" on public.alerts for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alerts' and policyname = 'Users can update own alerts'
  ) then
    create policy "Users can update own alerts" on public.alerts for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can view own notifications'
  ) then
    create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can insert own notifications'
  ) then
    create policy "Users can insert own notifications" on public.notifications for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications'
  ) then
    create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can delete own notifications'
  ) then
    create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'locations' and policyname = 'Users can view own locations'
  ) then
    create policy "Users can view own locations" on public.locations for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'locations' and policyname = 'Users can insert own locations'
  ) then
    create policy "Users can insert own locations" on public.locations for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'locations' and policyname = 'Users can update own locations'
  ) then
    create policy "Users can update own locations" on public.locations for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'locations' and policyname = 'Users can delete own locations'
  ) then
    create policy "Users can delete own locations" on public.locations for delete using (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_user_settings_user_id on public.user_settings(user_id);
create index if not exists idx_emergency_contacts_user_id on public.emergency_contacts(user_id);
create index if not exists idx_emergency_contacts_user_created on public.emergency_contacts(user_id, created_at);
create unique index if not exists idx_emergency_contacts_one_primary_per_user on public.emergency_contacts(user_id) where is_primary;
create index if not exists idx_alerts_user_created on public.alerts(user_id, created_at desc);
create index if not exists idx_alerts_user_status_created on public.alerts(user_id, status, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, read, created_at desc);
create index if not exists idx_locations_alert_created on public.locations(alert_id, created_at desc);
create index if not exists idx_locations_user_created on public.locations(user_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_profiles_updated_at'
  ) then
    create trigger update_profiles_updated_at
      before update on public.profiles
      for each row execute function public.update_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_settings_updated_at'
  ) then
    create trigger update_settings_updated_at
      before update on public.user_settings
      for each row execute function public.update_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_contacts_updated_at'
  ) then
    create trigger update_contacts_updated_at
      before update on public.emergency_contacts
      for each row execute function public.update_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.locations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
