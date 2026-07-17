# SougXpress Platform

Urban Commerce Operating System (UCOS) for local empowerment — Ain Sefra, Algeria.

## Stack

- **Mobile app**: Expo / React Native (Expo Router), located at `apps/mobile/`
- **Backend**: Supabase (auth, database, storage)
- **Language**: TypeScript, Arabic RTL primary
- **Package manager**: pnpm (do not use npm or yarn; do not create `package-lock.json`)

## How to run

```bash
cd apps/mobile && pnpm expo start --web --port 5000
```

The Replit workflow **Start application** runs this command automatically.

## Required secrets (Replit Secrets)

| Secret | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key (safe for client) |

The Supabase client (`apps/mobile/src/lib/supabase.ts`) accepts either `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` via fallback.

**Never use the `service_role` key in the mobile app.**

## Project structure

- `apps/mobile/` — Expo React Native application
- `supabase/` — Migrations, policies, seed data, edge functions
- `docs/` — Architecture, design system, decisions
- `planning/` — Backlog and epics

## User preferences

- Preserve pnpm as the package manager
- Do not create `package-lock.json`
- Do not use `service_role` key in the mobile app
- Do not reset or run migrations without explicit instruction
- Primary language: Arabic (RTL)
