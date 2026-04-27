# Aria — CLAUDE.md

## Project Overview

Aria is a voice-first personal productivity app. Users speak or photograph tasks and expenses; Aria structures them into organized, searchable data synced across devices.

## Repository Layout

```
ArieNotesTakingApp/          ← git repo root
├── aria/                    ← Expo React Native app (all dev work here)
├── supabase/
│   ├── functions/           ← Edge Functions (Deno)
│   ├── migrations/          ← SQL migration files
│   └── EDGE_FUNCTIONS.md    ← deploy guide
├── Plan/ARIA_PLAN.md        ← full product + engineering plan
├── SETUP.md                 ← local dev setup guide
├── DEPLOYMENT.md            ← production deployment checklist
└── CLAUDE.md                ← this file
```

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile framework | Expo SDK 54 + React Native 0.81 |
| Navigation | Expo Router v6 (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) |
| UI State | Zustand v5 |
| Server State | TanStack Query v5 |
| Local DB | expo-sqlite (SQLite, offline-first) |
| Auth | Supabase Auth (Google + Apple) |
| Backend DB | Supabase (PostgreSQL + RLS + Realtime) |
| Sync | Supabase Realtime + SQLite sync queue |
| Backend API | Supabase Edge Functions (Deno) |
| Voice STT | Deepgram Nova-2 (via edge function) |
| Document Scan | Google Document AI Expense Parser (via edge function) |
| AI Parse | Anthropic Claude Haiku (via edge function) |
| Push Notifications | Expo Push API + pg_cron |

## Implementation Status

| Phase | Status | What's built |
|---|---|---|
| 1 — Foundation | ✅ Done | Expo init, SQLite schema, Zustand stores, Supabase client, API stubs, auth screens, tab navigation |
| 2 — Core UI | ✅ Done | MonthCalendar, TaskItem (swipe-delete), AddTaskSheet, ExpenseItem, AddExpenseSheet, ExpenseSummary |
| 3 — Sync | ✅ Done | syncEngine → Supabase upsert, Realtime subscriptions, foreground sync trigger |
| 4 — Voice | ✅ Done | useVoiceRecorder, Waveform animation, VoiceSheet, voice-transcribe + ai-parse edge functions |
| 5 — Scan | ✅ Done | ScanSheet, document-scan edge function (Google Document AI) |
| 6 — Notifications | ✅ Done | Push token registration, notifications-schedule/send/morning edge functions, pg_cron |
| 7 — Polish | ✅ Done | All screens wired with voice + scan FABs, web platform guards, flicker fixes |

## Running Locally

```bash
cd aria
export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"   # if system Node < 20
./node_modules/.bin/expo start --clear   # first run
./node_modules/.bin/expo start           # subsequent runs
./node_modules/.bin/expo start --port 8082  # specific port
```

Full setup guide: [SETUP.md](SETUP.md)

## Critical Paths

| Flow | Entry | Key Files |
|---|---|---|
| Auth | `app/_layout.tsx` → `app/(auth)/sign-in.tsx` | `store/authStore.ts`, `lib/supabase/client.ts` |
| Task CRUD | `app/(tabs)/tasks/index.tsx` | `lib/hooks/useTasks.ts`, `lib/db/tasks.ts` |
| Expense CRUD | `app/(tabs)/expenses/index.tsx` | `lib/hooks/useExpenses.ts`, `lib/db/expenses.ts` |
| Voice input | `components/voice/VoiceSheet.tsx` | `lib/hooks/useVoiceRecorder.ts`, `lib/api/transcribe.ts`, `lib/api/parse.ts` |
| Receipt scan | `components/scan/ScanSheet.tsx` | `lib/api/scan.ts`, `lib/api/parse.ts` |
| Offline sync | `lib/sync/syncEngine.ts` | `lib/sync/queue.ts`, `lib/db/client.ts` |

## Known Platform Differences (Web vs Native)

| Feature | Native | Web |
|---|---|---|
| SQLite | Full expo-sqlite | Stubbed (`lib/db/client.web.ts`) |
| Sync queue | Works | Stubbed (`lib/sync/queue.web.ts`) |
| Sync engine | Works | Stubbed (`lib/sync/syncEngine.web.ts`) |
| Apple Sign-In | Works (iOS only) | Button hidden (returns null) |
| Push notifications | Works | Skipped (`Platform.OS !== 'web'` guard) |
| NetInfo | Works | Skipped, defaults to online=true |
| SplashScreen | Works | Skipped (`Platform.OS !== 'web'` guard) |

## Key Rules (Always Active)

1. TypeScript strict mode — no `any`, no type assertions without comment
2. Expo SDK only — no bare RN APIs without expo-modules wrapper
3. All Supabase queries respect RLS — never use service key on client
4. Offline-first — every write goes to SQLite first, queued for sync
5. No secrets in mobile app — API keys only in Supabase Edge Function env vars
6. Web guards — all native-only APIs wrapped with `Platform.OS !== 'web'`

## Design Tokens

```
bg:             #0a0a0f   (page background)
surface:        #13131a   (cards, sheets)
text-primary:   #f0f0f5
text-secondary: #8a8aa0
text-muted:     #4a4a60
tasks:          #4f6ef7   (blue-violet)
expenses:       #f7a24f   (amber)
success:        #34c759
error:          #ff453a
```

## Rules Files

- [.claude/rules/coding-standards.md](.claude/rules/coding-standards.md)
- [.claude/rules/rn-expo-best-practices.md](.claude/rules/rn-expo-best-practices.md)
- [.claude/rules/accessibility-mobile.md](.claude/rules/accessibility-mobile.md)
- [.claude/rules/security-supabase.md](.claude/rules/security-supabase.md)
