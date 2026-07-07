# DueDateBuddy

DueDateBuddy is an Expo mobile app for tracking due dates, reminders, and assets.

## Tech stack

- Expo 57 + React Native 0.86
- React 19 + TypeScript 6
- Expo Router for file-based navigation
- Supabase for backend data/auth client
- Zustand for local state
- React Hook Form + Zod for forms and validation
- date-fns for date handling
- Expo Notifications, Secure Store, Fonts, Splash Screen, Status Bar

## Prerequisites

- Node.js
- npm
- Expo CLI via `npx expo`
- Android Studio or Xcode if running native simulators
- Supabase project credentials

## Environment

Copy the example file and fill in your Supabase values:

```bash
cp .env.example .env
```

Required variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Keep `.env` local. It is git-ignored.

## Install

```bash
npm install
```

## Run the app

Start Expo:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## Checks

Type-check the project:

```bash
npm run typecheck
```

## Supabase schema

Initial database schema lives in:

```text
supabase/migrations/00001_initial_schema.sql
```

Apply it through your Supabase workflow before using real backend data.

## Project layout

```text
app/          Expo Router routes
components/   shared UI components
features/     feature modules
lib/          app clients and utilities
supabase/     database migrations
types/        shared TypeScript types
assets/       app icons, splash, images
```

## Graphify / Obsidian notes

This repo also contains project knowledge graph output under `Graphify/` and the nested Obsidian vault under `duedatebuddy/`. Runtime LLM/API keys for Graphify are kept in `Graphify/.env`.
