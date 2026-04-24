create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint alert_events_event_type_check check (
    event_type in ('created', 'countdown_started', 'tracking_started', 'tracking_updated', 'escalated', 'resolved', 'cancelled', 'check_in_expired', 'check_in_completed')
  )
);

create table if not exists public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  status text not null default 'active',
  title text not null default '',
  duration_minutes integer not null default 15,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  notes text,
  created_alert_id uuid references public.alerts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_checkins_type_check check (type in ('safe_walk', 'manual_check_in')),
  constraint safety_checkins_status_check check (status in ('active', 'completed', 'expired', 'cancelled')),
  constraint safety_checkins_duration_minutes_check check (duration_minutes > 0)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  item_type text not null,
  note text,
  audio_data text,
  mime_type text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_items_type_check check (item_type in ('note', 'audio'))
);

alter table public.alerts add column if not exists escalation_level integer not null default 0;
alter table public.alerts add column if not exists countdown_seconds integer;
alter table public.alerts add column if not exists last_location_at timestamptz;
alter table public.alerts add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'alerts_escalation_level_check'
  ) then
    alter table public.alerts
      add constraint alerts_escalation_level_check check (escalation_level >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'alerts_countdown_seconds_check'
  ) then
    alter table public.alerts
      add constraint alerts_countdown_seconds_check check (countdown_seconds is null or countdown_seconds >= 0);
  end if;
end
$$;

alter table public.alert_events enable row level security;
alter table public.safety_checkins enable row level security;
alter table public.evidence_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alert_events' and policyname = 'Users can view own alert events'
  ) then
    create policy "Users can view own alert events" on public.alert_events for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alert_events' and policyname = 'Users can insert own alert events'
  ) then
    create policy "Users can insert own alert events" on public.alert_events for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'safety_checkins' and policyname = 'Users can view own safety checkins'
  ) then
    create policy "Users can view own safety checkins" on public.safety_checkins for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'safety_checkins' and policyname = 'Users can insert own safety checkins'
  ) then
    create policy "Users can insert own safety checkins" on public.safety_checkins for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'safety_checkins' and policyname = 'Users can update own safety checkins'
  ) then
    create policy "Users can update own safety checkins" on public.safety_checkins for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evidence_items' and policyname = 'Users can view own evidence items'
  ) then
    create policy "Users can view own evidence items" on public.evidence_items for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evidence_items' and policyname = 'Users can insert own evidence items'
  ) then
    create policy "Users can insert own evidence items" on public.evidence_items for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evidence_items' and policyname = 'Users can update own evidence items'
  ) then
    create policy "Users can update own evidence items" on public.evidence_items for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evidence_items' and policyname = 'Users can delete own evidence items'
  ) then
    create policy "Users can delete own evidence items" on public.evidence_items for delete using (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists idx_alert_events_alert_created on public.alert_events(alert_id, created_at desc);
create index if not exists idx_alert_events_user_created on public.alert_events(user_id, created_at desc);
create index if not exists idx_safety_checkins_user_status on public.safety_checkins(user_id, status, created_at desc);
create index if not exists idx_safety_checkins_expires_at on public.safety_checkins(expires_at);
create index if not exists idx_evidence_items_user_created on public.evidence_items(user_id, created_at desc);
create index if not exists idx_evidence_items_user_type on public.evidence_items(user_id, item_type, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_alerts_updated_at'
  ) then
    create trigger update_alerts_updated_at
      before update on public.alerts
      for each row execute function public.update_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_safety_checkins_updated_at'
  ) then
    create trigger update_safety_checkins_updated_at
      before update on public.safety_checkins
      for each row execute function public.update_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'update_evidence_items_updated_at'
  ) then
    create trigger update_evidence_items_updated_at
      before update on public.evidence_items
      for each row execute function public.update_updated_at();
  end if;
end
$$;
