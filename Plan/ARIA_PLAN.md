# Aria — Product & Engineering Plan
**Voice-First Personal Productivity App**  
*iOS + Android | Expo + React Native + Supabase + Deepgram + Claude*

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [App Name & Brand](#2-app-name--brand)
3. [Tech Stack Decision Matrix](#3-tech-stack-decision-matrix)
4. [Full System Architecture](#4-full-system-architecture)
5. [Folder Structure](#5-folder-structure)
6. [Database Schema](#6-database-schema)
7. [API Layer — Supabase Edge Functions](#7-api-layer--supabase-edge-functions)
8. [Voice Pipeline — Deepgram](#8-voice-pipeline--deepgram)
9. [Document Scan Pipeline — Google Document AI](#9-document-scan-pipeline--google-document-ai)
10. [Intelligence Layer — Anthropic Claude](#10-intelligence-layer--anthropic-claude)
11. [State Management](#11-state-management)
12. [Offline Support & Sync](#12-offline-support--sync)
13. [Security Layer](#13-security-layer)
14. [Notifications & Reminders](#14-notifications--reminders)
15. [Authentication](#15-authentication)
16. [Key Libraries & Versions](#16-key-libraries--versions)
17. [Environment Variables](#17-environment-variables)
18. [Implementation Phases](#18-implementation-phases)
19. [Cost Breakdown](#19-cost-breakdown)
20. [App Store & Play Store Submission](#20-app-store--play-store-submission)
21. [Analytics & Monitoring](#21-analytics--monitoring)
22. [What NOT to Do](#22-what-not-to-do)
23. [Open Questions & Decisions](#23-open-questions--decisions)

---

## 1. Product Overview

### What is Aria?

Aria is a voice-first personal productivity app that lets users speak or photograph their daily tasks and expenses. It intelligently structures unstructured input (voice, text, photos) into organized, searchable data — synced across all their devices.

### Core Features

| Feature | Input | Output |
|---|---|---|
| Voice Tasks | Speak naturally | Parsed, actionable task list |
| Voice Expenses | Speak naturally | Categorized expense entries |
| Receipt Scan | Photo of receipt | Itemized expense list with date + store |
| Task Reminders | Set reminder on any task | Push notification at specified time |
| Morning Briefing | Automatic daily | "You have 5 tasks today" notification |
| Calendar View | — | Tasks + expenses by day/month |
| Offline Mode | — | Full read/write, syncs when back online |
| Cross-device Sync | — | iPhone ↔ Android ↔ any device |

### What Aria is NOT

- Not a to-do app with complex projects, subtasks, or collaboration
- Not an accounting app with invoices or tax features
- Not a note-taking app with rich text
- Not social — all data is private to the user

### Target Users

- Busy individuals who want to capture things quickly without typing
- People tracking personal spending without complex budgeting tools
- Anyone who forgets tasks unless they capture them instantly by voice

---

## 2. App Name & Brand

### Name: **Aria**

| Attribute | Detail |
|---|---|
| Origin | An elaborate vocal composition; also "air" in Italian |
| Meaning | Voice turned into something beautiful and structured |
| Feel | Premium, AI-forward, calm, personal |
| App Store URL | `aria-app` |
| Bundle ID (iOS) | `com.aria.app` |
| Package (Android) | `com.aria.app` |

### Color System (inherits from Notie)

```
Backgrounds:
  --bg:             #0a0a0f   Page background
  --surface:        #13131a   Cards, sheets
  --surface-raised: #1c1c27   Modals, overlays

Text:
  --text-primary:   #f0f0f5
  --text-secondary: #8a8aa0
  --text-muted:     #4a4a60

Accents:
  --tasks:          #4f6ef7   Blue-violet (tasks)
  --expenses:       #f7a24f   Amber (expenses)
  --success:        #34c759   Green
  --error:          #ff453a   Red

Borders:
  --border:         rgba(255,255,255,0.07)
  --border-strong:  rgba(255,255,255,0.14)
```

---

## 3. Tech Stack Decision Matrix

### Chosen Stack

| Layer | Technology | Why |
|---|---|---|
| Mobile framework | Expo (React Native) | Cross-platform, file-based routing, managed builds |
| Navigation | Expo Router v4 | Same mental model as Next.js App Router |
| Styling | NativeWind v4 | Tailwind CSS for React Native — familiar syntax |
| Animation | React Native Reanimated v3 | Hardware-accelerated, gesture support |
| UI state | Zustand v5 | Minimal boilerplate, fast, no providers |
| Server state | TanStack Query v5 | Caching, background sync, offline awareness |
| Local storage | expo-sqlite (SQLite) | Persistent local cache for offline mode |
| Auth | Supabase Auth | Google + Apple Sign-In, JWT, built-in |
| Database | Supabase (PostgreSQL) | RLS, Realtime, Edge Functions in one place |
| Sync | Supabase Realtime + custom queue | Real-time updates + offline queue drain |
| Backend API | Supabase Edge Functions | Co-located with DB, JWT validation built-in |
| Voice STT | Deepgram Nova-2 | Best accuracy-to-cost ratio, no timeout |
| Audio recording | expo-av | Stable, works on iOS + Android |
| Document scan | Google Document AI | Purpose-built Expense Parser, free tier |
| Intelligence | Anthropic Claude Haiku | Parsing, structuring, category mapping |
| Push notifications | Expo Notifications + Expo Push API | Cross-platform, managed service |
| Crash reporting | Sentry | Industry standard, Expo SDK |
| CI/CD | EAS (Expo Application Services) | Build + submit to App Store / Play Store |

### Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| React Native CLI (no Expo) | More setup, no managed builds, no EAS |
| Firebase instead of Supabase | Vendor lock-in, NoSQL harder to query |
| Redux / MobX | Boilerplate; Zustand + TanStack Query is sufficient |
| Capacitor (web wrapper) | Not truly native; worse performance + feel |
| OpenAI Whisper for STT | No real-time display; Deepgram does both |
| AWS Textract | More complex AWS setup vs Google Document AI |
| Web Speech API | Browser-only, 60s timeout, no accuracy control |

---

## 4. Full System Architecture

```
╔═══════════════════════════════════════════════════════════════════╗
║                    ARIA MOBILE APP                               ║
║              (Expo + React Native — iOS + Android)               ║
║                                                                   ║
║  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ ║
║  │  Expo Router │  │    Zustand   │  │    TanStack Query        │ ║
║  │  (Screens)   │  │  (UI State)  │  │  (Server State + Cache)  │ ║
║  └─────────────┘  └──────────────┘  └──────────────────────────┘ ║
║                                                                   ║
║  ┌──────────────────────────────────────────────────────────────┐ ║
║  │                    expo-sqlite (Local DB)                    │ ║
║  │   tasks_local | expenses_local | sync_queue | settings       │ ║
║  └──────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  What the app does directly:                                      ║
║  • Records audio with expo-av                                     ║
║  • Captures images with expo-camera / expo-image-picker          ║
║  • Reads/writes local SQLite                                      ║
║  • Sends JWT-authenticated requests to Edge Functions            ║
║  • Registers + handles push notifications                        ║
║  • NEVER holds third-party API keys                              ║
╚═══════════════════════════════╤═══════════════════════════════════╝
                                │ HTTPS + Bearer JWT (Supabase token)
                                ▼
╔═══════════════════════════════════════════════════════════════════╗
║                SECURE API LAYER                                  ║
║          (Supabase Edge Functions — Deno runtime)                ║
║                                                                   ║
║  ┌────────────────────┐  ┌─────────────────┐  ┌───────────────┐ ║
║  │ /voice/transcribe  │  │ /document/scan  │  │  /ai/parse    │ ║
║  │                    │  │                 │  │               │ ║
║  │ 1. Validate JWT    │  │ 1. Validate JWT │  │ 1. Validate   │ ║
║  │ 2. Rate limit user │  │ 2. Rate limit   │  │ 2. Rate limit │ ║
║  │ 3. Call Deepgram   │  │ 3. Call Doc AI  │  │ 3. Call Claude│ ║
║  │ 4. Log usage event │  │ 4. Log usage    │  │ 4. Log usage  │ ║
║  │ 5. Return text     │  │ 5. Return items │  │ 5. Return JSON│ ║
║  └────────────────────┘  └─────────────────┘  └───────────────┘ ║
║                                                                   ║
║  ┌──────────────────────────────┐  ┌────────────────────────────┐║
║  │ /notifications/schedule      │  │ /sync/push                 │║
║  │ 1. Validate JWT              │  │ 1. Validate service role   │║
║  │ 2. Store push_token + time   │  │ 2. Send Expo push batch    │║
║  │ 3. pg_cron picks it up       │  │ 3. Log delivery            │║
║  └──────────────────────────────┘  └────────────────────────────┘║
║                                                                   ║
║  Rules enforced on every function:                               ║
║  • JWT validated before any processing                           ║
║  • Per-user rate limits (50 voice / 20 scan / 200 parse per day) ║
║  • Request size limits (audio ≤ 10MB, image ≤ 8MB)             ║
║  • Audio deleted from storage immediately after transcription    ║
╚══════════╤════════════════╤═════════════════╤═════════════════════╝
           │                │                 │
           ▼                ▼                 ▼
  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐
  │ Deepgram API   │ │ Google         │ │ Anthropic Claude │
  │ Nova-2 model   │ │ Document AI    │ │ Haiku model      │
  │                │ │ Expense Parser │ │                  │
  │ ~$0.0043/min   │ │ ~$0.01/page    │ │ ~$0.0008/1K tok  │
  │ 12K min free   │ │ 1K pages free  │ │ pay-as-you-go    │
  └────────────────┘ └────────────────┘ └──────────────────┘
           │                │                 │
           └────────────────┴─────────────────┘
                            │ structured JSON returned to Edge Function
                            │ Edge Function returns to mobile app
                            │
╔═══════════════════════════▼═══════════════════════════════════════╗
║                        SUPABASE                                  ║
║                                                                   ║
║  ┌─────────────────┐  ┌────────────────────┐  ┌───────────────┐  ║
║  │   Auth          │  │   PostgreSQL + RLS  │  │   Realtime    │  ║
║  │                 │  │                    │  │               │  ║
║  │ Google Sign-In  │  │ profiles           │  │ tasks channel │  ║
║  │ Apple Sign-In   │  │ tasks              │  │ expenses chan  │  ║
║  │ JWT (1hr TTL)   │  │ expenses           │  │ (multi-device │  ║
║  │ Auto-refresh    │  │ usage_events       │  │  sync)        │  ║
║  │                 │  │ notification_queue │  │               │  ║
║  └─────────────────┘  └────────────────────┘  └───────────────┘  ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │  Storage (temporary)                                       │  ║
║  │  audio-uploads/ → deleted within 60 seconds of upload     │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │  pg_cron jobs                                              │  ║
║  │  • Every minute: drain notification_queue → Expo Push API  │  ║
║  │  • Daily 6am UTC: generate morning briefing per user tz    │  ║
║  └────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Data Flow Summary

```
VOICE INPUT:
  User speaks → expo-av records → POST /voice/transcribe (audio)
  → Deepgram → transcript → POST /ai/parse (transcript + mode)
  → Claude → { tasks: [...] } | { expenses: [...] }
  → Write to SQLite → Queue sync → Supabase (when online)

SCAN INPUT:
  User photographs receipt → expo-image-picker → POST /document/scan (image)
  → Google Document AI → { items, storeName, date }
  → POST /ai/parse (items) → Claude → { expenses: [...] }
  → Write to SQLite → Queue sync → Supabase (when online)

SYNC:
  Online: TanStack Query fetches from Supabase, updates SQLite
  Offline: Writes go to SQLite + sync_queue
  Reconnect: syncEngine drains queue → upsert to Supabase
  Multi-device: Supabase Realtime broadcasts changes → all devices update
```

---

## 5. Folder Structure

```
aria/
│
├── app/                                  ← Expo Router (file-based routing)
│   ├── _layout.tsx                       ← Root layout: fonts, providers, auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx                   ← Google + Apple Sign-In screen
│   │   └── onboarding.tsx                ← First-time setup (timezone, currency)
│   │
│   └── (tabs)/                           ← Main tab navigation
│       ├── _layout.tsx                   ← Tab bar definition
│       ├── tasks/
│       │   ├── index.tsx                 ← Task calendar + today view
│       │   └── [date].tsx                ← Day detail (deep-linkable)
│       └── expenses/
│           ├── index.tsx                 ← Expense calendar + month view
│           └── [month].tsx               ← Month detail (deep-linkable)
│
├── components/
│   ├── ui/                               ← Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Sheet.tsx                     ← Bottom sheet wrapper
│   │   ├── Spinner.tsx
│   │   └── Badge.tsx
│   ├── calendar/
│   │   ├── MonthCalendar.tsx
│   │   ├── CalendarDay.tsx
│   │   └── CalendarHeader.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx                  ← Swipe-to-delete, checkbox
│   │   └── TaskMonthlySummary.tsx
│   ├── expenses/
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseItem.tsx
│   │   └── ExpenseSummary.tsx
│   ├── voice/
│   │   ├── VoiceButton.tsx               ← FAB mic button
│   │   ├── VoiceSheet.tsx                ← Recording bottom sheet
│   │   └── Waveform.tsx                  ← Animated bars
│   ├── scan/
│   │   └── ScanSheet.tsx                 ← Camera + gallery + preview
│   ├── input/
│   │   └── AddItemSheet.tsx              ← Manual text input fallback
│   └── layout/
│       ├── TabBar.tsx                    ← Custom bottom tab bar
│       ├── PageHeader.tsx
│       └── SafeAreaWrapper.tsx
│
├── store/                                ← Zustand stores
│   ├── authStore.ts                      ← user, session, signIn, signOut
│   ├── voiceStore.ts                     ← phase, transcript, waveformData
│   └── syncStore.ts                      ← isOnline, pendingCount, lastSyncAt
│
├── lib/
│   ├── db/                               ← expo-sqlite local database
│   │   ├── schema.ts                     ← table definitions + migrations
│   │   ├── client.ts                     ← singleton SQLite connection
│   │   ├── tasks.ts                      ← getTasksForDate, createTask, toggleTask
│   │   └── expenses.ts                   ← getExpensesForMonth, createExpense
│   │
│   ├── sync/                             ← offline queue + Supabase sync
│   │   ├── queue.ts                      ← add/drain sync_queue table in SQLite
│   │   └── syncEngine.ts                 ← upsert pending records to Supabase
│   │
│   ├── api/                              ← typed fetch wrappers for Edge Functions
│   │   ├── client.ts                     ← base fetch with JWT injection
│   │   ├── transcribe.ts                 ← POST /voice/transcribe
│   │   ├── scan.ts                       ← POST /document/scan
│   │   └── parse.ts                      ← POST /ai/parse
│   │
│   ├── hooks/
│   │   ├── useTasks.ts                   ← TanStack Query: tasks CRUD
│   │   ├── useExpenses.ts                ← TanStack Query: expenses CRUD
│   │   ├── useVoiceRecorder.ts           ← expo-av recording state machine
│   │   ├── useNetworkStatus.ts           ← expo-network, triggers sync on reconnect
│   │   ├── useCalendar.ts                ← month nav, selected date
│   │   └── useNotifications.ts           ← register token, schedule reminder
│   │
│   ├── supabase/
│   │   └── client.ts                     ← createClient singleton
│   │
│   ├── utils/
│   │   ├── date.ts                       ← localDateISO, localMonthISO (device tz)
│   │   ├── currency.ts                   ← format cents to "$3.50"
│   │   └── category.ts                   ← category icons + colors
│   │
│   └── types/
│       └── index.ts                      ← Task, Expense, VoiceMode, SyncItem, etc.
│
├── supabase/
│   ├── functions/                        ← Edge Functions (deployed via Supabase CLI)
│   │   ├── voice-transcribe/
│   │   │   └── index.ts
│   │   ├── document-scan/
│   │   │   └── index.ts
│   │   ├── ai-parse/
│   │   │   └── index.ts
│   │   └── notifications-schedule/
│   │       └── index.ts
│   ├── migrations/                       ← SQL migrations (version controlled)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_notification_queue.sql
│   └── seed.sql                          ← dev/test seed data
│
├── assets/
│   ├── icon.png                          ← 1024×1024 app icon
│   ├── splash.png                        ← splash screen
│   └── adaptive-icon.png                 ← Android adaptive icon
│
├── app.json                              ← Expo config
├── eas.json                              ← EAS Build + Submit config
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 6. Database Schema

### Complete SQL (run via Supabase migrations)

```sql
-- ════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- ════════════════════════════════════════════════════════════

-- ── User profiles ─────────────────────────────────────────
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  avatar_url      text,
  timezone        text not null default 'UTC',
  currency        text not null default 'USD',
  push_token      text,                    -- Expo push token (updated on login)
  notif_morning   boolean default true,    -- daily briefing notification
  notif_reminders boolean default true,    -- task reminder notifications
  onboarded       boolean default false,   -- completed onboarding flow
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Tasks ──────────────────────────────────────────────────
create table tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  text           text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'complete')),
  scheduled_date date not null,
  reminder_at    timestamptz,              -- null = no reminder
  client_id      uuid unique,             -- local SQLite UUID; prevents duplicates on sync
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index tasks_user_date on tasks (user_id, scheduled_date);
create index tasks_reminder  on tasks (reminder_at) where reminder_at is not null;

-- ── Expenses ───────────────────────────────────────────────
create table expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  item           text not null,
  amount         integer not null check (amount >= 0),  -- cents
  currency       text not null default 'USD',
  category       text not null default 'other'
                   check (category in (
                     'groceries','dining','transport','shopping',
                     'health','entertainment','utilities','other')),
  store          text,
  date           date not null,
  receipt_scan   boolean default false,    -- was this from a scan?
  client_id      uuid unique,
  created_at     timestamptz default now()
);

create index expenses_user_date on expenses (user_id, date);
create index expenses_user_month on expenses (user_id, date_trunc('month', date));

-- ── Notification queue ─────────────────────────────────────
create table notification_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  push_token  text not null,
  title       text not null,
  body        text not null,
  data        jsonb,                       -- { task_id, type: 'reminder'|'briefing' }
  send_at     timestamptz not null,
  sent        boolean default false,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);

create index notif_unsent on notification_queue (send_at) where sent = false;

-- ── Usage analytics ────────────────────────────────────────
create table usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users,  -- nullable (pre-auth events)
  event       text not null,
  -- Events: voice_transcribe | document_scan | ai_parse | task_create |
  --         expense_create | reminder_set | morning_briefing_sent
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index usage_user_event on usage_events (user_id, event, created_at);

-- ════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- ════════════════════════════════════════════════════════════

alter table profiles           enable row level security;
alter table tasks               enable row level security;
alter table expenses            enable row level security;
alter table notification_queue  enable row level security;
alter table usage_events        enable row level security;

-- Profiles: user can read/update only their own
create policy "profiles: own row" on profiles
  using (id = auth.uid());
create policy "profiles: own insert" on profiles
  for insert with check (id = auth.uid());

-- Tasks: user can CRUD only their own
create policy "tasks: own rows" on tasks
  using (user_id = auth.uid());
create policy "tasks: own insert" on tasks
  for insert with check (user_id = auth.uid());

-- Expenses: user can CRUD only their own
create policy "expenses: own rows" on expenses
  using (user_id = auth.uid());
create policy "expenses: own insert" on expenses
  for insert with check (user_id = auth.uid());

-- Notification queue: users can insert; only service_role can read/update
create policy "notif: user insert" on notification_queue
  for insert with check (user_id = auth.uid());
-- No select policy for users — pg_cron uses service_role key

-- Usage events: users can insert only
create policy "usage: user insert" on usage_events
  for insert with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- 003_pg_cron_jobs.sql  (run as superuser in Supabase SQL editor)
-- ════════════════════════════════════════════════════════════

-- Send pending notifications every minute
select cron.schedule(
  'drain-notification-queue',
  '* * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notifications-send',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Morning briefing: every day at 06:00 UTC (function handles per-user timezones)
select cron.schedule(
  'morning-briefing',
  '0 6 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notifications-morning',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Local SQLite Schema (expo-sqlite)

```typescript
// lib/db/schema.ts

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  -- Local tasks (mirrors Supabase, used offline)
  CREATE TABLE IF NOT EXISTS tasks_local (
    id             TEXT PRIMARY KEY,       -- client_id (UUID)
    server_id      TEXT,                   -- Supabase UUID after sync
    text           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    scheduled_date TEXT NOT NULL,          -- 'YYYY-MM-DD'
    reminder_at    TEXT,                   -- ISO timestamp
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    synced         INTEGER DEFAULT 0       -- 0 = pending, 1 = synced
  );

  -- Local expenses
  CREATE TABLE IF NOT EXISTS expenses_local (
    id             TEXT PRIMARY KEY,
    server_id      TEXT,
    item           TEXT NOT NULL,
    amount         INTEGER NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'USD',
    category       TEXT NOT NULL DEFAULT 'other',
    store          TEXT,
    date           TEXT NOT NULL,
    receipt_scan   INTEGER DEFAULT 0,
    created_at     TEXT NOT NULL,
    synced         INTEGER DEFAULT 0
  );

  -- Pending sync operations
  CREATE TABLE IF NOT EXISTS sync_queue (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name     TEXT NOT NULL,          -- 'tasks' | 'expenses'
    record_id      TEXT NOT NULL,          -- client_id of the record
    action         TEXT NOT NULL,          -- 'insert' | 'update' | 'delete'
    payload        TEXT NOT NULL,          -- JSON string
    created_at     TEXT NOT NULL,
    retry_count    INTEGER DEFAULT 0
  );

  -- App settings (local only, not synced)
  CREATE TABLE IF NOT EXISTS settings (
    key            TEXT PRIMARY KEY,
    value          TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_date     ON tasks_local(scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses_local(date);
  CREATE INDEX IF NOT EXISTS idx_sync_pending   ON sync_queue(created_at)
    WHERE retry_count < 5;
`;
```

---

## 7. API Layer — Supabase Edge Functions

### Base pattern (every function follows this)

```typescript
// supabase/functions/_shared/auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function validateRequest(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Missing token");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  return { user, supabase };
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  event: string,
  maxPerHour: number
): Promise<boolean> {
  const { count } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event", event)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());

  return (count ?? 0) < maxPerHour;
}
```

### `/voice/transcribe`

```typescript
// supabase/functions/voice-transcribe/index.ts
import { validateRequest, checkRateLimit } from "../_shared/auth.ts";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
const RATE_LIMIT = 50; // per hour per user

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, "voice_transcribe", RATE_LIMIT))) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    if (!audio) return Response.json({ error: "No audio provided" }, { status: 400 });
    if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "Audio too large" }, { status: 413 });

    // Call Deepgram Nova-2
    const dgResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("DEEPGRAM_API_KEY")}`,
          "Content-Type": audio.type || "audio/m4a",
        },
        body: await audio.arrayBuffer(),
      }
    );

    if (!dgResponse.ok) {
      console.error("Deepgram error:", await dgResponse.text());
      return Response.json({ error: "Transcription failed" }, { status: 502 });
    }

    const dgData = await dgResponse.json();
    const transcript = dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    const duration_ms = Math.round((dgData.metadata?.duration ?? 0) * 1000);

    // Log usage (fire-and-forget)
    supabase.from("usage_events").insert({
      user_id: user.id,
      event: "voice_transcribe",
      metadata: { duration_ms, bytes: audio.size },
    }).then(() => {});

    return Response.json({ transcript, duration_ms });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Missing token") {
      return Response.json({ error: msg }, { status: 401 });
    }
    console.error(err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
});
```

### `/document/scan`

```typescript
// supabase/functions/document-scan/index.ts
import { validateRequest, checkRateLimit } from "../_shared/auth.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const RATE_LIMIT = 20; // per hour

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, "document_scan", RATE_LIMIT))) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    if (!image) return Response.json({ error: "No image provided" }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Image too large" }, { status: 413 });

    const imageBytes = await image.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

    // Google Document AI — Expense Parser
    const projectId = Deno.env.get("GOOGLE_PROJECT_ID");
    const processorId = Deno.env.get("GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID");
    const accessToken = Deno.env.get("GOOGLE_ACCESS_TOKEN"); // service account token

    const docAiResponse = await fetch(
      `https://us-documentai.googleapis.com/v1/projects/${projectId}/locations/us/processors/${processorId}:process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawDocument: { content: base64Image, mimeType: image.type || "image/jpeg" },
        }),
      }
    );

    if (!docAiResponse.ok) {
      return Response.json({ error: "Document scan failed" }, { status: 502 });
    }

    const docAiData = await docAiResponse.json();
    const entities = docAiData.document?.entities ?? [];

    // Extract structured fields from Document AI response
    const storeName = entities.find((e: { type: string }) => e.type === "supplier_name")
      ?.mentionText ?? undefined;

    const receiptDate = entities.find((e: { type: string }) => e.type === "invoice_date")
      ?.normalizedValue?.dateValue;

    const lineItems = entities
      .filter((e: { type: string }) => e.type === "line_item")
      .map((item: { properties: { type: string; mentionText: string }[] }) => {
        const desc = item.properties?.find((p) => p.type === "line_item/description")?.mentionText;
        const amount = item.properties?.find((p) => p.type === "line_item/amount")?.mentionText;
        const amountCents = amount
          ? Math.round(parseFloat(amount.replace(/[^0-9.]/g, "")) * 100)
          : 0;
        return { description: desc, amountCents };
      })
      .filter((i: { description?: string }) => i.description);

    const formattedDate = receiptDate
      ? `${receiptDate.year}-${String(receiptDate.month).padStart(2, "0")}-${String(receiptDate.day).padStart(2, "0")}`
      : undefined;

    supabase.from("usage_events").insert({
      user_id: user.id,
      event: "document_scan",
      metadata: { item_count: lineItems.length },
    }).then(() => {});

    return Response.json({ storeName, receiptDate: formattedDate, lineItems });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Missing token") {
      return Response.json({ error: msg }, { status: 401 });
    }
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
});
```

### `/ai/parse`

```typescript
// supabase/functions/ai-parse/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { validateRequest, checkRateLimit } from "../_shared/auth.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const RATE_LIMIT = 200;

const TASK_SYSTEM = `You extract individual tasks from a voice transcript.
Return ONLY valid JSON with no markdown.

A task is a single discrete action. Rules for splitting:
- SPLIT on clearly different activities (different verb + different goal)
- DO NOT SPLIT items in the same activity ("buy milk, bread, eggs" = 1 task)
- Remove filler words: um, uh, like, basically, so, you know
- Capitalize first letter; keep wording natural
- Do not invent tasks not mentioned

Output: { "tasks": ["task one", "task two"] }`;

const EXPENSE_SYSTEM = `You extract expenses from a voice transcript.
Return ONLY valid JSON with no markdown.

Rules:
- Extract every item with its price
- Amount = integer cents ($3.50 = 350)
- If no amount: use 0
- Category: groceries | dining | transport | shopping | health | entertainment | utilities | other
- Store: extract if mentioned ("at Walmart" → "Walmart")

Output: { "expenses": [{ "item": "Milk", "amount": 350, "store": "Walmart", "category": "groceries" }] }`;

const SCAN_SYSTEM = `You receive line items from a receipt scan. 
Assign the correct category to each item and normalize the description.
Return ONLY valid JSON with no markdown.

Category options: groceries | dining | transport | shopping | health | entertainment | utilities | other

Output: { "expenses": [{ "item": "Whole Milk 1gal", "amount": 349, "category": "groceries" }] }`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, "ai_parse", RATE_LIMIT))) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { mode, transcript, lineItems } = body;

    if (!["tasks", "expenses", "scan"].includes(mode)) {
      return Response.json({ error: "Invalid mode" }, { status: 400 });
    }

    let systemPrompt: string;
    let userContent: string;

    if (mode === "tasks") {
      systemPrompt = TASK_SYSTEM;
      userContent = `Extract tasks from: "${(transcript ?? "").slice(0, 3000)}"`;
    } else if (mode === "expenses") {
      systemPrompt = EXPENSE_SYSTEM;
      userContent = `Extract expenses from: "${(transcript ?? "").slice(0, 3000)}"`;
    } else {
      // scan mode: lineItems from Document AI
      systemPrompt = SCAN_SYSTEM;
      userContent = `Categorize these receipt items: ${JSON.stringify(lineItems ?? [])}`;
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    supabase.from("usage_events").insert({
      user_id: user.id,
      event: "ai_parse",
      metadata: { mode, input_tokens: message.usage.input_tokens },
    }).then(() => {});

    return Response.json(parsed);

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Missing token") {
      return Response.json({ error: msg }, { status: 401 });
    }
    return Response.json({ error: "Parse failed" }, { status: 500 });
  }
});
```

### Client-side API wrappers (what the app calls)

```typescript
// lib/api/client.ts
import { supabase } from "../supabase/client";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1";

async function apiPost(path: string, body: object | FormData): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const isFormData = body instanceof FormData;
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? "API error");
  }
  return res;
}

// lib/api/transcribe.ts
export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append("audio", { uri: audioUri, name: "recording.m4a", type: "audio/m4a" } as unknown as Blob);
  const res = await apiPost("voice-transcribe", formData);
  const { transcript } = await res.json();
  return transcript;
}

// lib/api/scan.ts
export async function scanDocument(imageUri: string): Promise<{
  storeName?: string;
  receiptDate?: string;
  lineItems: { description: string; amountCents: number }[];
}> {
  const formData = new FormData();
  formData.append("image", { uri: imageUri, name: "receipt.jpg", type: "image/jpeg" } as unknown as Blob);
  const res = await apiPost("document-scan", formData);
  return res.json();
}

// lib/api/parse.ts
export async function parseTasks(transcript: string): Promise<string[]> {
  const res = await apiPost("ai-parse", { mode: "tasks", transcript });
  const { tasks } = await res.json();
  return tasks ?? [];
}

export async function parseExpenses(transcript: string) {
  const res = await apiPost("ai-parse", { mode: "expenses", transcript });
  const { expenses } = await res.json();
  return expenses ?? [];
}

export async function parseScannedItems(lineItems: { description: string; amountCents: number }[]) {
  const res = await apiPost("ai-parse", { mode: "scan", lineItems });
  const { expenses } = await res.json();
  return expenses ?? [];
}
```

---

## 8. Voice Pipeline — Deepgram

### Recording state machine

```
idle
  │ user taps mic
  ▼
requesting_permission
  │ granted
  ▼
recording ──── user taps stop ──► processing
  │                                   │
  │ (auto-restart on timeout)          │ transcript → POST /ai/parse
  │                               ▼
  └──────────────────────────── success → save → close
                                     │
                                  error → show retry
```

### useVoiceRecorder hook

```typescript
// lib/hooks/useVoiceRecorder.ts
import { Audio } from "expo-av";
import { useRef, useState } from "react";
import { transcribeAudio } from "../api/transcribe";

type Phase = "idle" | "requesting" | "recording" | "processing" | "success" | "error";

export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const recordingRef = useRef<Audio.Recording | null>(null);

  async function start() {
    setPhase("requesting");
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      setError("Microphone permission denied");
      setPhase("error");
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setPhase("recording");
  }

  async function stop() {
    if (!recordingRef.current) return;
    setPhase("processing");

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI()!;
      recordingRef.current = null;

      const transcript = await transcribeAudio(uri);
      onTranscript(transcript);
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
      setPhase("error");
    }
  }

  function reset() {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    setPhase("idle");
    setError(undefined);
  }

  return { phase, error, start, stop, reset };
}
```

---

## 9. Document Scan Pipeline — Google Document AI

### Setup steps

1. Create Google Cloud project
2. Enable Document AI API
3. Create an "Expense Parser" processor (us region)
4. Create a Service Account → download JSON key
5. Generate access token from service account (or use Workload Identity)
6. Store `GOOGLE_PROJECT_ID`, `GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID`, `GOOGLE_ACCESS_TOKEN` in Supabase secrets

### What Google Document AI Expense Parser returns

```json
{
  "document": {
    "entities": [
      { "type": "supplier_name",  "mentionText": "Walmart" },
      { "type": "invoice_date",   "normalizedValue": { "dateValue": { "year": 2026, "month": 4, "day": 21 } } },
      { "type": "total_amount",   "mentionText": "$47.23" },
      {
        "type": "line_item",
        "properties": [
          { "type": "line_item/description", "mentionText": "Whole Milk 1gal" },
          { "type": "line_item/amount",      "mentionText": "$3.49" }
        ]
      }
    ]
  }
}
```

### Full scan flow in the app

```typescript
// In ScanSheet.tsx
async function handleImageSelected(imageUri: string) {
  setPhase("scanning");
  try {
    // Step 1: Document AI extracts raw items
    const { storeName, receiptDate, lineItems } = await scanDocument(imageUri);

    // Step 2: Claude categorizes + normalizes
    const expenses = await parseScannedItems(lineItems);

    // Step 3: Apply store name + receipt date
    const date = receiptDate ?? localDateISO();
    const withMeta = expenses.map(e => ({ ...e, store: e.store ?? storeName, date }));

    // Step 4: Save
    await saveExpenses(withMeta);
    setPhase("success");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Scan failed");
    setPhase("error");
  }
}
```

---

## 10. Intelligence Layer — Anthropic Claude

Claude's role is **pure structuring** — it receives text (transcripts or raw document data) and returns clean, typed JSON. It never stores anything, never calls other services.

### Why Claude Haiku

- Cheapest capable model (~$0.0008 per 1K input tokens)
- Fast enough for real-time feel (< 2s for short inputs)
- Sufficient intelligence for task/expense parsing
- Upgrade path to Sonnet if edge cases arise

### Prompt design principles

1. **System prompt** = explicit rules + examples + output format
2. **User prompt** = just the raw input, no instructions
3. **Temperature** = default (not set) — deterministic enough for structured output
4. **Max tokens** = 1024 — enough for 20 tasks/expenses, prevents runaway responses
5. **Fallback** = if Claude returns invalid JSON, use regex parser as fallback

---

## 11. State Management

### Zustand stores

```typescript
// store/authStore.ts
interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;    // call on app launch
}

// store/voiceStore.ts
interface VoiceStore {
  phase: "idle" | "requesting" | "recording" | "processing" | "success" | "error";
  error?: string;
  setPhase: (phase: VoiceStore["phase"]) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

// store/syncStore.ts
interface SyncStore {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  setOnline: (online: boolean) => void;
  setPendingCount: (n: number) => void;
  setLastSyncAt: (d: Date) => void;
}
```

### TanStack Query — data fetching

```typescript
// lib/hooks/useTasks.ts
export function useTasks(date: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      // 1. Always read from SQLite (instant, works offline)
      const local = await db.getTasksForDate(date);
      return local;
    },
    staleTime: 60_000,       // background refetch after 1 min
    gcTime: 24 * 3_600_000,  // keep in memory for 24 hours
  });

  // Background sync from Supabase (when online)
  useEffect(() => {
    const { data: { subscription } } = supabase
      .channel(`tasks:${date}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks",
          filter: `scheduled_date=eq.${date}` },
        async () => {
          // Refresh from Supabase → update SQLite → invalidate query
          const remote = await supabase.from("tasks").select("*")
            .eq("scheduled_date", date).order("created_at");
          await db.upsertTasksBatch(remote.data ?? []);
          queryClient.invalidateQueries({ queryKey: ["tasks", date] });
        })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [date]);

  const addTasks = useMutation({
    mutationFn: async (texts: string[]) => {
      const now = new Date().toISOString();
      const newTasks = texts.map(text => ({
        id: crypto.randomUUID(),
        text, status: "pending", scheduled_date: date,
        created_at: now, updated_at: now,
      }));

      // Optimistic: write to SQLite immediately
      await db.insertTasksBatch(newTasks);

      // Queue sync to Supabase
      await syncQueue.add("tasks", newTasks.map(t =>
        ({ record_id: t.id, action: "insert", payload: t })
      ));

      return newTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", date] });
      syncEngine.triggerSync();   // attempt immediate sync if online
    },
  });

  return { tasks: query.data ?? [], loading: query.isLoading, addTasks };
}
```

---

## 12. Offline Support & Sync

### Strategy: SQLite-first, Supabase-second

```
All reads: SQLite → instant, always works
All writes: SQLite first → sync_queue → Supabase when online

No write ever waits for the network.
```

### Sync engine

```typescript
// lib/sync/syncEngine.ts
export async function syncPendingQueue() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const pending = await db.getSyncQueue({ limit: 50 }); // process in batches
  if (pending.length === 0) return;

  const results = await Promise.allSettled(
    pending.map(async (item) => {
      const payload = JSON.parse(item.payload);

      if (item.action === "insert" || item.action === "update") {
        const { error } = await supabase
          .from(item.table_name)
          .upsert({ ...payload, user_id: session.user.id }, {
            onConflict: "client_id",
          });
        if (error) throw error;
      } else if (item.action === "delete") {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq("client_id", payload.id);
        if (error) throw error;
      }

      await db.removeSyncQueueItem(item.id);
    })
  );

  // Increment retry_count for failed items (max 5 retries, then drop)
  const failed = pending.filter((_, i) => results[i].status === "rejected");
  for (const item of failed) {
    await db.incrementSyncRetry(item.id);
  }
}

// Triggered by:
// 1. Network status change (offline → online)
// 2. App foreground
// 3. After every write (fire-and-forget)
```

### Conflict resolution

**Strategy: last-write-wins on `updated_at`**

This is correct for personal productivity data. A user editing the same task on two devices simultaneously is an extremely rare edge case. If it occurs, the more recent change wins.

```sql
-- The upsert in the sync engine uses:
ON CONFLICT (client_id) DO UPDATE SET
  text = EXCLUDED.text,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at
WHERE EXCLUDED.updated_at > tasks.updated_at  -- only overwrite if newer
```

### Network status detection

```typescript
// lib/hooks/useNetworkStatus.ts
import NetInfo from "@react-native-community/netinfo";
import { useSyncStore } from "../store/syncStore";
import { syncPendingQueue } from "../sync/syncEngine";

export function useNetworkStatus() {
  const setOnline = useSyncStore(s => s.setOnline);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setOnline(!!online);
      if (online) syncPendingQueue();  // drain queue when back online
    });
  }, []);
}
```

---

## 13. Security Layer

### Threat model and mitigations

| Threat | Impact | Mitigation |
|---|---|---|
| API key exposure in app bundle | Critical | All keys in Edge Function env vars only |
| Unauthorized API calls | High | JWT validation on every Edge Function |
| User A accessing User B's data | Critical | Row Level Security on all Supabase tables |
| Token theft | High | JWTs are short-lived (1 hour), auto-refresh |
| Replay attacks | Medium | Supabase JWT nonces, short TTL |
| Rate abuse / cost explosion | High | Per-user rate limits in every Edge Function |
| Audio data retention | Medium | Audio deleted from Supabase Storage after transcription |
| Image data retention | Medium | Images processed in-memory, never stored |
| Oversized request abuse | Medium | Size limits: audio ≤ 10MB, image ≤ 8MB |
| Man-in-the-middle | Medium | HTTPS everywhere, Expo's certificate pinning |
| SQL injection | Low | Supabase client uses parameterized queries |

### JWT flow

```
User signs in (Google/Apple)
    ↓
Supabase issues JWT (1 hour TTL) + Refresh Token (long-lived, stored in SecureStore)
    ↓
App attaches JWT to every API call: Authorization: Bearer <jwt>
    ↓
Edge Function validates JWT via supabase.auth.getUser(token)
    ↓
If JWT expired: Supabase JS client auto-refreshes using refresh token
    ↓
New JWT issued, request retried transparently
```

### Secure storage

```typescript
// Supabase JS client configured to use Expo SecureStore for token storage
import * as SecureStore from "expo-secure-store";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // required for React Native
  },
});
```

---

## 14. Notifications & Reminders

### Types

```
1. Task reminders    — user-triggered, specific task + time
2. Morning briefing  — automatic daily, configurable in settings
```

### Task reminder flow

```
User sets reminder on a task
    ↓
App calls POST /functions/v1/notifications-schedule
  { task_id, title, body, send_at, push_token }
    ↓
Edge Function inserts into notification_queue table
    ↓
pg_cron job runs every minute:
  SELECT * FROM notification_queue WHERE send_at <= now() AND sent = false
    ↓
For each row: POST to Expo Push API
  { to: push_token, title, body, data: { task_id } }
    ↓
Mark as sent = true, sent_at = now()
```

### Morning briefing flow

```
pg_cron fires daily at 06:00 UTC
    ↓
notifications-morning Edge Function:
  1. SELECT * FROM profiles WHERE notif_morning = true AND push_token IS NOT NULL
  2. For each user: get their timezone from profiles
  3. Check if current UTC time is 07:00–09:00 in their local timezone
  4. If yes: SELECT count(*) FROM tasks WHERE user_id = ? AND scheduled_date = today AND status = 'pending'
  5. If count > 0: push "Good morning! You have {n} tasks today."
```

### Push token registration

```typescript
// lib/hooks/useNotifications.ts
export async function registerPushToken() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  })).data;

  // Save to Supabase profiles (so Edge Functions can send to this device)
  await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
}

// Handle notification tap (deep link to task)
Notifications.addNotificationResponseReceivedListener(response => {
  const { task_id } = response.notification.request.content.data;
  if (task_id) router.push(`/tasks/${task_id}`);
});
```

---

## 15. Authentication

### Providers

| Provider | Required? | Notes |
|---|---|---|
| Apple Sign-In | Required for App Store | Apple mandates it for apps with social login |
| Google Sign-In | Recommended | Familiar for most users |
| Email magic link | Optional fallback | Zero-password, good for privacy-conscious users |

### Supabase Auth setup

```typescript
// Sign in with Google (OAuth)
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: "aria://auth/callback",   // deep link back into the app
  },
});

// Sign in with Apple (native)
import * as AppleAuthentication from "expo-apple-authentication";

const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

await supabase.auth.signInWithIdToken({
  provider: "apple",
  token: credential.identityToken!,
});
```

### Auth guard in Expo Router

```typescript
// app/_layout.tsx
export default function RootLayout() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  if (loading) return <SplashScreen />;
  if (!user) return <Redirect href="/(auth)/sign-in" />;

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
```

---

## 16. Key Libraries & Versions

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react-native": "0.76.x",
    "react": "18.3.x",

    "expo-av": "~15.0.0",
    "expo-camera": "~16.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "expo-sqlite": "~15.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-network": "~6.0.0",
    "expo-apple-authentication": "~7.0.0",

    "@supabase/supabase-js": "^2.47.0",

    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-query-persist-client": "^5.62.0",

    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",

    "@react-native-community/netinfo": "^11.0.0",

    "@sentry/react-native": "~6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "~18.3.0",
    "supabase": "^2.0.0"
  }
}
```

---

## 17. Environment Variables

### Mobile app (`aria/.env` — never commit)

```bash
# Supabase (public — safe to expose in mobile app)
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Expo Push Notifications
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id

# Sentry (public — safe to expose)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Supabase Edge Functions secrets (set via Supabase CLI — never in code)

```bash
supabase secrets set DEEPGRAM_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set GOOGLE_PROJECT_ID=...
supabase secrets set GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID=...
supabase secrets set GOOGLE_ACCESS_TOKEN=...     # service account token
supabase secrets set EXPO_ACCESS_TOKEN=...       # for sending push notifications
```

### What NEVER goes in the mobile app

```
✗ DEEPGRAM_API_KEY
✗ ANTHROPIC_API_KEY
✗ GOOGLE_ACCESS_TOKEN / GOOGLE_PROJECT_ID
✗ SUPABASE_SERVICE_ROLE_KEY
✗ Any secret that would grant unrestricted API access
```

---

## 18. Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)

**Goal:** App launches, auth works, data persists locally

```
[ ] Expo project init: npx create-expo-app@latest aria --template tabs
[ ] Install all dependencies (package.json above)
[ ] Configure NativeWind v4 + design tokens
[ ] Supabase project setup
    [ ] Create project on supabase.com
    [ ] Run migration 001_initial_schema.sql
    [ ] Run migration 002_rls_policies.sql
    [ ] Enable Google OAuth provider
    [ ] Enable Apple OAuth provider
[ ] Auth flow
    [ ] sign-in.tsx screen with Google + Apple buttons
    [ ] Auth callback deep link (aria://auth/callback)
    [ ] Auth store (Zustand) with initialize() on app launch
    [ ] Auth guard in _layout.tsx
    [ ] Onboarding screen (timezone, currency)
[ ] SQLite local DB
    [ ] lib/db/schema.ts (CREATE_TABLES)
    [ ] lib/db/client.ts (singleton SQLite connection)
    [ ] lib/db/tasks.ts (getTasksForDate, insertTask, toggleTask, deleteTask)
    [ ] lib/db/expenses.ts (getExpensesForMonth, insertExpense, deleteExpense)
[ ] Sync queue (empty, just schema)
[ ] Basic navigation (tab bar: Tasks | Expenses)
[ ] Deliverable: App runs on iPhone simulator, user can sign in, tabs navigate
```

### Phase 2 — Core Task & Expense Features (Weeks 3–4)

**Goal:** Tasks and expenses work completely offline

```
[ ] Task screens
    [ ] Calendar component (month grid, compact + full)
    [ ] Task list + task item (checkbox, swipe-to-delete)
    [ ] Monthly summary view
    [ ] Add task sheet (manual text input)
[ ] Expense screens
    [ ] Expense calendar
    [ ] Expense list + expense item (amount, category icon)
    [ ] Monthly summary with category breakdown
    [ ] Add expense sheet (manual text input)
[ ] Data layer
    [ ] useTasks hook (TanStack Query + SQLite)
    [ ] useExpenses hook (TanStack Query + SQLite)
    [ ] Local CRUD fully working offline
[ ] Deliverable: Full task + expense management, all offline, no voice yet
```

### Phase 3 — Supabase Sync (Week 5)

**Goal:** Data syncs to cloud, multi-device works

```
[ ] Supabase client setup with SecureStore adapter
[ ] Deploy Supabase Edge Functions (even if empty initially)
[ ] Sync engine
    [ ] syncQueue.ts (add/drain sync_queue SQLite table)
    [ ] syncEngine.ts (upsert pending records to Supabase)
    [ ] useNetworkStatus hook (triggers sync on reconnect)
    [ ] App foreground listener (triggers sync)
[ ] Supabase Realtime subscription in useTasks + useExpenses
[ ] Test: create task on iPhone, appears on Android (and vice versa)
[ ] Deliverable: Full sync working, offline queue drains correctly
```

### Phase 4 — Voice Input (Week 6)

**Goal:** Speak tasks and expenses

```
[ ] expo-av audio recording permission + setup
[ ] useVoiceRecorder hook (state machine)
[ ] VoiceSheet component (waveform, recording UI)
[ ] VoiceButton FAB
[ ] Deploy voice-transcribe Edge Function
    [ ] Deepgram API integration
    [ ] JWT validation + rate limiting
[ ] Deploy ai-parse Edge Function
    [ ] Claude Haiku integration
    [ ] Task + expense prompts
[ ] Wire up: record → transcribe → parse → save
[ ] Waveform animation (react-native-reanimated bars)
[ ] Test: speak "buy milk and eggs, call dentist" → 2 tasks created
[ ] Test: speak "coffee $5 at Starbucks" → 1 expense created
[ ] Deliverable: Full voice-to-data pipeline working on device
```

### Phase 5 — Document Scanning (Week 7)

**Goal:** Photograph a receipt, expenses are created

```
[ ] expo-image-picker (camera + gallery access)
[ ] expo-camera permission handling
[ ] ScanSheet component (camera trigger, image preview, scanning state)
[ ] Deploy document-scan Edge Function
    [ ] Google Cloud project + Document AI setup
    [ ] Expense Parser processor created
    [ ] Service account credentials configured
[ ] Full scan pipeline: image → Document AI → Claude → expenses
[ ] Test: photograph a supermarket receipt → itemized expenses created with correct date
[ ] Deliverable: Receipt scanning working end-to-end
```

### Phase 6 — Notifications (Week 8)

**Goal:** Task reminders and morning briefing work

```
[ ] expo-notifications permissions + token registration
[ ] Save push token to Supabase profiles on login
[ ] Deploy notifications-schedule Edge Function
[ ] Deploy notifications-send Edge Function (invoked by pg_cron)
[ ] Deploy notifications-morning Edge Function (daily briefing)
[ ] Run migration 003_pg_cron_jobs.sql
[ ] Task reminder UI: date/time picker on task detail screen
[ ] Settings screen: toggle morning briefing on/off
[ ] Test on real device (simulator doesn't support push)
[ ] Deliverable: Notifications land on physical iPhone + Android
```

### Phase 7 — Polish + App Store Prep (Weeks 9–10)

**Goal:** App is ready for review submission

```
[ ] Sentry integration (crash reporting)
[ ] Empty states (no tasks yet, no expenses yet)
[ ] Error states (offline banner, API failure toasts)
[ ] Loading skeletons
[ ] Haptic feedback (expo-haptics) on task complete, swipe delete
[ ] App icon (1024×1024 for iOS, adaptive for Android)
[ ] Splash screen
[ ] Privacy Policy page (required by App Store)
[ ] EAS Build setup (eas build --platform all)
[ ] TestFlight internal testing (5 real users)
[ ] Fix bugs from beta testing
[ ] App Store Connect metadata: description, screenshots (6.7", 5.5", iPad)
[ ] Play Store metadata: description, feature graphic, screenshots
[ ] Submit to App Store Review
[ ] Submit to Play Store (internal → production)
[ ] Deliverable: Apps live in both stores
```

---

## 19. Cost Breakdown

### At launch (0–1,000 users)

| Service | Plan | Monthly Cost |
|---|---|---|
| Supabase | Free tier | $0 |
| Vercel (if used) | Free tier | $0 |
| Deepgram | Free (12K min/month) | $0 |
| Google Document AI | Free (1K pages/month) | $0 |
| Anthropic Claude | Pay-as-you-go | ~$5–10 |
| Expo EAS | Free tier | $0 |
| **Total** | | **~$5–10/month** |

### At 10,000 users (1,000 active/day)

| Service | Usage estimate | Monthly Cost |
|---|---|---|
| Supabase Pro | DB + Auth + Realtime | $25 |
| Deepgram | 200 voice sessions/day × 30s = 3,000 min | $13 |
| Google Document AI | 50 scans/day × 30 days = 1,500 pages | $5 |
| Anthropic Claude Haiku | 1,000 parse calls/day × 500 tokens avg | $12 |
| Sentry | Team plan | $26 |
| EAS Production | Build + submit | $99/year = $8/mo |
| **Total** | | **~$89/month** |

### At 100,000 users (10,000 active/day)

| Service | Monthly Cost |
|---|---|
| Supabase Pro + compute upgrades | $200 |
| Deepgram | $130 |
| Google Document AI | $50 |
| Anthropic Claude | $120 |
| Sentry Business | $80 |
| EAS | $8 |
| **Total** | **~$590/month** |

> At 100K users, if monetizing at $3/month per paying user (10% conversion):
> Revenue: $30,000/month. Cost: $590/month. **Margin: 98%.**

---

## 20. App Store & Play Store Submission

### iOS (App Store)

**Requirements checklist:**

```
[ ] Apple Developer Account ($99/year)
[ ] App icon: 1024×1024 PNG, no transparency, no rounded corners (Apple adds them)
[ ] Privacy Policy URL (required — host on GitHub Pages or Notion)
[ ] App Privacy disclosure in App Store Connect
    [ ] Declare: microphone usage, camera usage, push notifications
    [ ] Declare data types collected: usage data, diagnostics
[ ] Info.plist permissions strings (EAS handles via app.json)
    NSMicrophoneUsageDescription: "Aria uses your microphone to record voice tasks and expenses"
    NSCameraUsageDescription: "Aria uses your camera to scan receipts"
    NSPhotoLibraryUsageDescription: "Aria accesses your photos to scan receipts"
[ ] Apple Sign-In implemented (required when any social login is offered)
[ ] Screenshots: iPhone 6.7" (1290×2796), iPhone 5.5" (1242×2208)
[ ] App description (max 4000 chars) + keywords (100 chars)
[ ] Build submitted via EAS: eas submit --platform ios
```

### Android (Play Store)

```
[ ] Google Play Developer Account ($25 one-time)
[ ] Adaptive icon: 108×108 dp foreground + background layers
[ ] Privacy Policy URL (same as iOS)
[ ] Declare permissions in Play Console
[ ] Screenshots: phone (16:9 or 9:16), tablet optional
[ ] Feature graphic: 1024×500 JPG/PNG
[ ] Build: eas build --platform android (generates .aab)
[ ] Submit: eas submit --platform android
[ ] Start with Internal Testing → Closed Testing → Production
```

### EAS Build config (`eas.json`)

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

---

## 21. Analytics & Monitoring

### Usage analytics (built-in via usage_events)

Query in Supabase Studio SQL editor:

```sql
-- Daily active users (last 30 days)
SELECT date_trunc('day', created_at) as day, count(distinct user_id) as dau
FROM usage_events
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- Most used features
SELECT event, count(*) as uses
FROM usage_events
WHERE created_at > now() - interval '7 days'
GROUP BY event ORDER BY uses DESC;

-- Average voice sessions per active user
SELECT avg(sessions) as avg_voice_sessions_per_user FROM (
  SELECT user_id, count(*) as sessions
  FROM usage_events
  WHERE event = 'voice_transcribe'
    AND created_at > now() - interval '30 days'
  GROUP BY user_id
) sub;

-- User retention (D7: users who used the app 7 days after signup)
SELECT count(*) as retained_d7 FROM (
  SELECT p.id FROM profiles p
  JOIN usage_events e ON e.user_id = p.id
  WHERE p.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
    AND e.created_at >= p.created_at + interval '7 days'
  GROUP BY p.id
) sub;
```

### Crash reporting — Sentry

```typescript
// app/_layout.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  attachScreenshot: true,
  tracesSampleRate: 0.2,    // 20% of transactions for performance monitoring
});
```

---

## 22. What NOT to Do

### Never call third-party APIs from the mobile app

```typescript
// ✗ WRONG — exposes API key in app bundle
const res = await fetch("https://api.deepgram.com/v1/listen", {
  headers: { Authorization: `Token ${DEEPGRAM_KEY}` },   // key is in the app!
  body: audio,
});

// ✓ CORRECT — key lives only in Edge Function
const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-transcribe`, {
  headers: { Authorization: `Bearer ${session.access_token}` },   // user JWT only
  body: formData,
});
```

### Never chain responsibilities in one Edge Function

```typescript
// ✗ WRONG — one function that does everything (hard to debug, test, maintain)
Deno.serve(async (req) => {
  const audio = await getAudio(req);
  const transcript = await callDeeepgram(audio);          // step 1
  const parsed = await callClaude(transcript);            // step 2
  await saveToSupabase(parsed);                           // step 3
  await sendNotification(userId);                         // step 4
  return Response.json({ success: true });
});

// ✓ CORRECT — one function, one responsibility
// voice-transcribe: audio → transcript (that's it)
// ai-parse: transcript → structured JSON (that's it)
// Client orchestrates the sequence
```

### Never skip RLS

```sql
-- ✗ WRONG — any authenticated user can read all tasks
create table tasks (id uuid, user_id uuid, text text);
-- (no RLS)

-- ✓ CORRECT — users can only see their own rows
alter table tasks enable row level security;
create policy "own rows" on tasks using (user_id = auth.uid());
```

### Never store audio permanently

```typescript
// ✗ WRONG — audio stays in storage forever (privacy risk + cost)
await supabase.storage.from("audio").upload(filename, audio);
// ... later processes it but never deletes

// ✓ CORRECT — delete immediately after transcription
const { data } = await supabase.storage.from("audio-temp").upload(filename, audio);
const transcript = await callDeeepgram(data.path);
await supabase.storage.from("audio-temp").remove([filename]);  // gone
```

---

## 23. Open Questions & Decisions

| Question | Options | Recommendation |
|---|---|---|
| Monetization model | Free / Freemium ($X/mo) / One-time purchase | Freemium: free for 100 tasks/mo, paid unlimited |
| Google Document AI vs AWS Textract | Both capable for receipts | Start with Google Doc AI; simpler setup |
| SQLite vs MMKV for local storage | SQLite = relational, MMKV = key-value | SQLite (expo-sqlite) for structured data |
| App name final confirmation | Aria / Voca / Ora / Lyra | Aria — check App Store availability first |
| Initial markets | US only / Global | US + UK + India (English, same codebase) |
| Supabase region | US East / EU West | Match your primary user base |
| Language support for Deepgram | English only / multi-language | English first; Deepgram auto-detect as V2 |
| Apple Sign-In on Android | Required on iOS, skip on Android | Skip on Android — use Google only |
| Dashboard for admin analytics | Supabase Studio / Metabase / custom | Supabase Studio SQL queries initially |
| Backend: Supabase Edge vs Vercel | Both work | Supabase Edge (co-located with DB, simpler) |

---

*Document version: 1.0 — April 2026*  
*Author: Architecture planning session*  
*App: Aria — Voice-First Personal Productivity*
