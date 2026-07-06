# DueDateBuddy — Mobile App Design Spec

**Date:** 2026-07-06  
**Stack:** Expo · React Native · TypeScript · Expo Router · Supabase  
**Language:** Bahasa Indonesia  
**Theme:** Light mode only  
**Status:** Design Approved

---

## 1. Data Model

### Tables

#### profiles
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now()
);
-- Trigger: auto-create profile on auth.users insert
```

#### asset_templates (seeded, system-managed)
```sql
create table asset_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  icon_name text not null,
  default_fields jsonb not null default '[]',
  is_system boolean default true,
  created_at timestamptz default now()
);
```

#### assets
```sql
create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references asset_templates on delete set null,
  name text not null,
  category text not null,
  icon_name text not null,
  description text,
  custom_fields jsonb default '{}',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### reminders
```sql
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  asset_id uuid references assets on delete set null,
  title text not null,
  category text not null,
  due_date date not null,
  recurrence text not null default 'none',
  amount numeric,
  notes text,
  remind_before_days int[] default array[7,3,1,0],
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_status check (status in ('pending', 'paid', 'overdue'))
);
```

### RLS Policies

All user-owned tables (profiles, assets, reminders): `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE.
`asset_templates`: public SELECT only.

### Pre-built Templates (seeded)

| No | Name | Category | Icon |
|----|------|----------|------|
| 1 | Rumah | property | home |
| 2 | Kendaraan Roda 4 | vehicle | car |
| 3 | Kendaraan Roda 2 | vehicle | motorcycle |
| 4 | Internet / ISP | subscription | wifi |
| 5 | Listrik (PLN) | utility | flash |
| 6 | Asuransi Kendaraan | insurance | shield |
| 7 | KPR / Cicilan | loan | credit-card |
| 8 | Custom | custom | file-text |

---

## 2. Navigation & Screen Map

### Route Structure (Expo Router)

```
app/
  _layout.tsx                      ← Root layout (auth guard + tab navigator)
  (auth)/
    _layout.tsx                    ← Auth stack
    login.tsx                      ← Masuk
    register.tsx                   ← Daftar
  (tabs)/
    _layout.tsx                    ← Bottom tab navigator (4 tabs)
    index.tsx                      ← Beranda / Dashboard
    (reminders)/
      _layout.tsx                  ← Reminder stack
      index.tsx                    ← Daftar Pengingat
      tambah.tsx                   ← Tambah Pengingat
      [id].tsx                     ← Detail Pengingat
      [id]/edit.tsx                ← Edit Pengingat
    (assets)/
      _layout.tsx                  ← Asset stack
      index.tsx                    ← Daftar Aset
      tambah.tsx                   ← Tambah Aset (pilih template)
      [id].tsx                     ← Detail Aset
      [id]/edit.tsx                ← Edit Aset
    pengaturan.tsx                 ← Pengaturan
```

### Tab Bar

| Tab | Icon | Screen |
|-----|------|--------|
| Beranda | home | Dashboard |
| Pengingat | bell | Reminder List |
| Aset | folder | Asset List |
| Pengaturan | settings | Settings |

### Screen Descriptions

| Route | Screen | Description |
|-------|--------|-------------|
| (auth)/login | Masuk | Email + password login |
| (auth)/register | Daftar | Email + password register |
| index (Beranda) | Dashboard | Ringkasan: upcoming, overdue, bulan ini, total estimasi. List pengingat terdekat. FAB tambah pengingat |
| (reminders)/index | Daftar Pengingat | Semua pengingat, filter tab (Semua, Aktif, Terbayar, Terlewat) |
| (reminders)/tambah | Tambah Pengingat | Form pengingat baru (RHF + Zod) |
| (reminders)/[id] | Detail Pengingat | Lihat detail + mark paid + edit + delete |
| (reminders)/[id]/edit | Edit Pengingat | Form edit pre-filled |
| (assets)/index | Daftar Aset | Semua aset, group by kategori |
| (assets)/tambah | Tambah Aset | Pilih template → isi form |
| (assets)/[id] | Detail Aset | Detail aset + pengingat terkait |
| (assets)/[id]/edit | Edit Aset | Edit field aset |
| pengaturan | Pengaturan | Profile info, logout, placeholder notif |

---

## 3. UI Design System

### Colors

| Token | Hex | Penggunaan |
|-------|-----|------------|
| primary | #006874 | Tombol, FAB, header, active state |
| on-primary | #FFFFFF | Teks di atas primary |
| primary-container | #97E4F2 | Badge ringan, background selected |
| surface | #F8FAFA | Background utama |
| surface-container | #ECEEEE | Card, list items |
| surface-container-high | #E6E8E9 | Search bar, input background |
| on-surface | #191C1D | Teks utama |
| on-surface-variant | #3F484A | Teks sekunder |
| outline | #BEC8CA | Border input, divider |
| status-critical | #BA1A1A | ≤7 hari / overdue |
| status-warning | #8F4E00 | 8-30 hari |
| status-active | #2E6C00 | >30 hari / paid |
| status-neutral | #535F61 | No data / archived |

### Typography

Plus Jakarta Sans via `@expo-google-fonts/plus-jakarta-sans`.

| Role | Size | Weight | Penggunaan |
|------|------|--------|------------|
| Headline | 24px | Bold | Judul halaman |
| Title | 16px | Semibold | Nama aset, judul card |
| Body | 14px | Regular | Teks konten |
| Label | 12px | Medium | Badge, metadata, tanggal |
| Amount | 16px | Bold | Nominal Rp |

### Component Visual

- **Cards:** bg surface-container, rounded 12px, padding 16px, no shadow
- **Buttons:** Primary filled primary 12px radius, white text
- **FAB:** Rounded 16px, primary bg, white icon, bottom-right
- **Input:** Outlined, 1px outline border, 2px primary on focus
- **Badge:** Pill shape, status color at 20% bg opacity
- **Bottom tab:** Material 3, active icon primary

### Spacing

Base 8px. Screen margin 16px. Card gutter 12px. Card padding 16px.

---

## 4. Implementation Architecture

### State Management

- **Zustand** for auth session only
- Custom hooks per feature (`useReminders`, `useAssets`) with `useState` + `useEffect` for Supabase queries
- **React Hook Form + Zod** for all forms

### Key Libraries

| Library | Purpose |
|---------|---------|
| expo-router | File-based navigation |
| @supabase/supabase-js | Supabase client |
| zustand | Auth session state |
| react-hook-form + zod + @hookform/resolvers | Form + validation |
| date-fns | Date formatting |
| expo-notifications | Local notifications |
| expo-secure-store | Secure session persistence |
| @expo-google-fonts/plus-jakarta-sans | Typography |

### Folder Structure

```
duedatebuddy-app/
  app/                          # Expo Router pages
  components/
    ui/                         # Reusable: Button, Card, Badge, Input, etc.
  features/
    auth/                       # useAuth hook, login/register screen components
    reminders/                  # useReminders hook, reminder form, list, card
    assets/                     # useAssets hook, asset form, list, card
  lib/
    supabase.ts                 # Supabase client init
    notifications.ts            # expo-notifications helper
    date.ts                     # date-fns utility functions
  types/
    index.ts                    # Shared TypeScript types (Database types)
  supabase/
    migrations/                 # SQL migration files
```

### Notifications Flow

1. Create/update reminder → call `scheduleReminderNotification(reminder)`
2. Function computes trigger dates (due_date - remind_before_days) at 08:00 WIB
3. Schedules expo-notification for each trigger date
4. Mark as paid → `cancelReminderNotifications(reminderId)`
5. Recurrence (monthly/yearly): on mark paid → create next instance + schedule

Notifications code structured so push notifications (via Supabase Edge Functions + Expo Push Service) can be added later without rewriting.

### Auth Flow

1. App start → check session in SecureStore → if valid, set Zustand session
2. Root layout checks Zustand session → redirect to (auth) or (tabs)
3. Login/Register calls `supabase.auth.signInWithPassword` / `supabase.auth.signUp`
4. On auth state change → persist/clear session in SecureStore
5. Logout → clear all → redirect to login

---

## 5. MVP Scope Summary

- [x] Auth: email/password register, login, logout, session persistence
- [x] Dashboard: ringkasan (upcoming, overdue, bulan ini, estimasi) + list pengingat terdekat
- [x] Reminder CRUD: create, read, update, delete, mark paid (with recurrence)
- [x] Asset CRUD: create from template, read, update, archive
- [x] Pre-built templates (8 templates)
- [x] Local notifications with expo-notifications
- [x] RLS: user isolation
- [x] Settings: profile info, logout, notification placeholder

### Not in MVP (future)

- Push notifications (server-side via Supabase Edge Functions)
- Dark mode
- Calendar view
- Biometric lock
- File attachments (Supabase Storage)
- Charts / statistics
- Export data
- Family group / multi-user sharing

---

## 6. Reusable UI Components

Located in `components/ui/`:

- `Button` — Primary, secondary (outline), text variants
- `Card` — Container with surface-container bg, rounded corners
- `Badge` — Status pill (critical, warning, active, neutral)
- `Input` — Outlined text field with label + error
- `Select` — Picker/dropdown for categories, recurrence, etc.
- `DatePicker` — Date input (date-fns based)
- `AmountInput` — Currency input with Rp formatting
- `FAB` — Floating action button
- `ScreenHeader` — Title + optional back button
- `LoadingState` — Activity indicator placeholder
- `EmptyState` — Empty list with icon + message + CTA
- `ErrorState` — Error display with retry button
