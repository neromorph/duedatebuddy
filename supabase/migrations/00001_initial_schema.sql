-- DueDateBuddy Initial Schema
-- Tables, RLS policies, triggers, and seed data

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- 2. ASSET TEMPLATES TABLE (system-managed)
create table if not exists public.asset_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  icon_name text not null,
  default_fields jsonb not null default '[]'::jsonb,
  is_system boolean default true,
  created_at timestamptz default now()
);

-- 3. ASSETS TABLE
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.asset_templates(id) on delete set null,
  name text not null,
  category text not null,
  icon_name text not null,
  description text,
  custom_fields jsonb default '{}'::jsonb,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. REMINDERS TABLE
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  title text not null,
  category text not null,
  due_date date not null,
  recurrence text not null default 'none',
  amount numeric,
  notes text,
  remind_before_days int[] default array[7, 3, 1, 0],
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_status check (status in ('pending', 'paid', 'overdue'))
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.asset_templates enable row level security;
alter table public.assets enable row level security;
alter table public.reminders enable row level security;

-- PROFILES RLS
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ASSET TEMPLATES RLS (public read)
create policy "Anyone can view asset templates"
  on public.asset_templates for select
  using (true);

-- ASSETS RLS
create policy "Users can view own assets"
  on public.assets for select
  using (auth.uid() = user_id);

create policy "Users can insert own assets"
  on public.assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own assets"
  on public.assets for update
  using (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);

-- REMINDERS RLS
create policy "Users can view own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- TRIGGER: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- TRIGGER: Auto-update updated_at on assets
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_assets
  before update on public.assets
  for each row
  execute function public.update_updated_at_column();

create trigger set_updated_at_reminders
  before update on public.reminders
  for each row
  execute function public.update_updated_at_column();

-- SEED DATA: Asset Templates (8 system templates)
insert into public.asset_templates (name, category, icon_name, default_fields, is_system) values
  ('Rumah', 'property', 'home', '[]'::jsonb, true),
  ('Kendaraan Roda 4', 'vehicle', 'car', '[]'::jsonb, true),
  ('Kendaraan Roda 2', 'vehicle', 'motorcycle', '[]'::jsonb, true),
  ('Internet / ISP', 'subscription', 'wifi', '[]'::jsonb, true),
  ('Listrik (PLN)', 'utility', 'flash', '[]'::jsonb, true),
  ('Asuransi Kendaraan', 'insurance', 'shield', '[]'::jsonb, true),
  ('KPR / Cicilan', 'loan', 'credit-card', '[]'::jsonb, true),
  ('Custom', 'custom', 'file-text', '[]'::jsonb, true);
