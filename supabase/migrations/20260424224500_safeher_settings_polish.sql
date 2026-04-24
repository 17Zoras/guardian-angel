alter table public.user_settings add column if not exists ringtone_enabled boolean not null default true;
alter table public.user_settings add column if not exists vibration_enabled boolean not null default true;
alter table public.user_settings add column if not exists privacy_mode text not null default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_privacy_mode_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_privacy_mode_check
      check (privacy_mode in ('standard', 'enhanced'));
  end if;
end
$$;

create index if not exists idx_user_settings_user_privacy_mode
  on public.user_settings(user_id, privacy_mode);
