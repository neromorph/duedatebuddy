-- DueDateBuddy Reminder Redesign — Layer 1
-- priority column, parent_reminder_id, notification_preferences table

alter table public.reminders
  add column priority text not null default 'normal',
  add constraint valid_priority check (priority in ('critical', 'high', 'normal', 'low'));

alter table public.reminders
  add column parent_reminder_id uuid references public.reminders(id) on delete set null;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  notification_time time not null default '08:00',
  reminder_schedule int[] not null default array[30, 14, 7, 3, 1],
  grouping_enabled boolean not null default true,
  weekend_reminders boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  overdue_frequency text not null default 'daily',
  auto_archive_days int default 90,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_overdue_frequency check (overdue_frequency in ('daily', 'every_other_day', 'weekly', 'none'))
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own prefs"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own prefs"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prefs"
  on public.notification_preferences for update
  using (auth.uid() = user_id);

create policy "Users can delete own prefs"
  on public.notification_preferences for delete
  using (auth.uid() = user_id);

-- Extend handle_new_user trigger to create notification_preferences row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$;
