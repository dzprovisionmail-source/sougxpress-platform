---
name: Supabase env key naming
description: The Supabase anon/public key is stored under EXPO_PUBLIC_SUPABASE_ANON_KEY, not EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
---

The Replit secret is named `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
The original `supabase.ts` referenced `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which caused a runtime crash.

**Fix applied (supabase.ts):** read `EXPO_PUBLIC_SUPABASE_ANON_KEY` first, fall back to `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for backward compat.

**Why:** Supabase calls this the "anon key" in their dashboard; the project had been using "publishable key" as an alias that was never set in Replit Secrets.

**How to apply:** Always use `EXPO_PUBLIC_SUPABASE_ANON_KEY` as the authoritative secret name for this project.
