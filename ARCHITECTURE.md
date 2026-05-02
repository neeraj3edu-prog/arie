# Aria — End-to-End Architecture

A complete map of the system: what every piece does, where every key lives, and how data moves.

---

## 1. System Map (Bird's Eye View)

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (React Native / Expo)                                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Screens │  │  Hooks   │  │  Stores  │  │  Local DB      │ │
│  │ tasks/   │→ │useTasks  │→ │authStore │  │  SQLite native │ │
│  │ expenses/│  │useExpenses  │syncStore │  │  localStorage  │ │
│  └──────────┘  └──────────┘  └──────────┘  │  web           │ │
│       ↓              ↓                      └────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Sync Queue  →  syncEngine  →  Supabase REST API         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │ Auth     │ Edge Functions     │ Realtime
              ↓          ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (Backend)                                             │
│                                                                 │
│  ┌──────────┐  ┌─────────────────────────────────────────┐     │
│  │  Auth    │  │  Edge Functions (Deno)                   │     │
│  │  Google  │  │  voice-transcribe → Deepgram API         │     │
│  │  Apple   │  │  ai-parse         → Anthropic API        │     │
│  └──────────┘  │  document-scan    → Google Document AI   │     │
│                │  notifications-*  → Expo Push API         │     │
│  ┌──────────┐  └─────────────────────────────────────────┘     │
│  │PostgreSQL│  ┌─────────────────────────────────────────┐     │
│  │ profiles │  │  Realtime (native only)                  │     │
│  │ tasks    │  │  postgres_changes → invalidate cache     │     │
│  │ expenses │  └─────────────────────────────────────────┘     │
│  │ sync logs│                                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
              │                    │
              ↓                    ↓
┌────────────────────┐  ┌──────────────────────────┐
│  VERCEL            │  │  THIRD-PARTY APIs        │
│  Static web export │  │  Deepgram  (voice STT)   │
│  SPA rewrites      │  │  Anthropic (AI parsing)  │
│  arie-pi.vercel.app│  │  Google DocAI (receipts) │
└────────────────────┘  │  Google OAuth (sign-in)  │
                        │  Expo Push (notifs)      │
                        └──────────────────────────┘
```

---

## 2. Every Key / Secret — What It Is and Where It Lives

### Keys in `aria/.env` (client-side, safe to be public)

| Variable | Value | Why it's safe |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://krumjfjmwdkndzvrbgiv.supabase.co` | Public endpoint, not a secret |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_VFdIo...` | Anon key — read-only access, all rows protected by RLS |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | placeholder | Links to Expo push notification project |

> **Rule**: No secret key ever goes in `.env`. The anon key is safe because Supabase RLS (Row Level Security) ensures every user can only see their own rows, even with the public key.

---

### Secrets in Supabase Edge Functions (server-side only, never in the app)

| Secret | Service | Used by | How to set |
|---|---|---|---|
| `DEEPGRAM_API_KEY` | Deepgram | `voice-transcribe` function | `supabase secrets set DEEPGRAM_API_KEY=...` |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | `ai-parse` function | `supabase secrets set ANTHROPIC_API_KEY=...` |
| `GOOGLE_CLIENT_EMAIL` | Google Cloud | `document-scan` function | Set via Supabase Management API |
| `GOOGLE_PRIVATE_KEY_B64` | Google Cloud | `document-scan` function | Set via Supabase Management API (base64, no headers) |
| `GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID` | Google DocAI | `document-scan` function | `38fd9a215392c8e9` |
| `EXPO_ACCESS_TOKEN` | Expo | `notifications-send` function | From expo.dev account settings |
| `SUPABASE_URL` | Supabase | All functions | Auto-injected by Supabase runtime |
| `SUPABASE_ANON_KEY` | Supabase | All functions | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | All functions | Auto-injected — full DB access, server only |

> **Rule**: API keys for AI services never leave the server. The mobile app never calls Deepgram or Anthropic directly — it always goes through a Supabase Edge Function that holds the key.

---

### Google Cloud Setup (for receipt scanning)

| Item | Value |
|---|---|
| GCP Project | `arienotieapp` (project number: `472866365827`) |
| Service Account | `aria-docai@arienotieapp.iam.gserviceaccount.com` |
| Service Account Role | Document AI API User |
| Document AI Processor | `ArieNotieExpenseParser` (ID: `38fd9a215392c8e9`) |
| Processor Endpoint | `https://us-documentai.googleapis.com/v1/projects/472866365827/locations/us/processors/38fd9a215392c8e9:process` |

The Edge Function generates a short-lived Google OAuth2 token at runtime using the service account private key (stored as `GOOGLE_PRIVATE_KEY_B64`). No static access token needed.

---

## 3. Authentication Flow

```
User taps "Sign in with Google"
        │
        ↓
authStore.signInWithGoogle()
        │
        ├── native: opens browser via expo-auth-session
        │           redirect URI: aria://auth/callback
        │
        └── web:    supabase.auth.signInWithOAuth()
                    redirect URI: https://arie-pi.vercel.app
        │
        ↓
Google OAuth → Supabase Auth (handles the callback)
        │
        ↓
Supabase issues JWT (expires in 1 hour, auto-refreshed)
        │
        ↓
authStore listener fires (onAuthStateChange)
        │
        ├── native: session stored in expo-secure-store (encrypted)
        └── web:    session stored in localStorage
        │
        ↓
useProtectedRoute in _layout.tsx redirects to /(tabs)/tasks
```

**Session storage by platform:**
- iOS / Android: `expo-secure-store` (hardware-encrypted keychain)
- Web: `localStorage` (browser storage)

---

## 4. Write Flow (Task / Expense Creation)

This is the core offline-first pattern. Every write goes local first, server second.

```
User speaks / types a task
        │
        ↓
useTasks.addTasks.mutate(texts)
        │
        ├── Step 1: insertTasksBatch(newTasks)
        │           ├── native: INSERT INTO tasks_local (SQLite)
        │           └── web:    localStorage['aria:tasks'] = [..., newTask]
        │           (Returns immediately — UI updates instantly)
        │
        ├── Step 2: addToSyncQueue(entries)
        │           ├── native: INSERT INTO sync_queue (SQLite)
        │           └── web:    localStorage['aria:sync_queue'] = [..., entry]
        │
        └── Step 3: triggerSync()
                    │
                    └── syncPendingQueue() [async, non-blocking]
                               │
                               ├── Read up to 50 items from queue
                               ├── GET /auth/v1/session → Bearer token
                               ├── POST /rest/v1/tasks → upsert with client_id
                               │   (Supabase RLS verifies user_id matches token)
                               └── On success: remove from queue
                                   On failure: increment retryCount (max 5)
```

**Why `client_id`?**
The app generates a UUID locally before the server knows about the record. When the same record is synced again (retry, multi-device), Supabase uses `ON CONFLICT (client_id)` to update rather than insert a duplicate.

---

## 5. Read Flow (Loading Data)

```
Screen mounts → useTasks(selectedDate) hook
        │
        ↓
TanStack Query checks cache
        │
        ├── Cache HIT (< 60 seconds old): return cached data immediately
        │
        └── Cache MISS:
                │
                ├── native: getTasksForDate(date) → SQLite query
                │           tasks_local WHERE scheduled_date = ?
                │
                └── web:    getTasksForDate(date) [tasks.web.ts]
                            ├── Read localStorage['aria:tasks']
                            └── If empty: fetch from Supabase (bootstrap)
                                         then write to localStorage
```

**Realtime updates (native only):**
```
Supabase postgres_changes event fires (another device wrote a task)
        │
        ↓
Channel listener in useTasks hook
        │
        ↓
Fetch latest from Supabase → upsertTasksBatch() → SQLite updated
        │
        ↓
queryClient.invalidateQueries(['tasks', date]) → UI re-renders
```

> Web doesn't use realtime — it polls by invalidating on app foreground (`AppState` change).

---

## 6. Voice Input Flow

```
User taps mic FAB
        │
        ↓
VoiceSheet opens → useVoiceRecorder hook
        │
        ↓ (user speaks)
expo-av records audio
        ├── native: saves to file → URI like file:///tmp/recording.m4a
        └── web:    saves to blob URL → blob:https://arie-pi.vercel.app/...
        │
        ↓
useVoiceRecorder.stop() → handleTranscript(uri)
        │
        ↓
transcribeAudio(audioUri) [lib/api/transcribe.ts]
        │
        ├── web: fetch(blobUri) → get real Blob → FormData.append(blob)
        └── native: FormData.append({ uri, name, type })
        │
        ↓
POST /functions/v1/voice-transcribe
[Supabase Edge Function]
        │
        ├── Validates Bearer token (auth)
        ├── Reads FormData audio file
        └── POST api.deepgram.com/v1/listen
                    DEEPGRAM_API_KEY (server secret)
        │
        ↓
Returns: { transcript: "buy milk at Walmart..." }
        │
        ↓
parseTasks(transcript) OR parseExpenses(transcript) [lib/api/parse.ts]
        │
        ↓
POST /functions/v1/ai-parse
[Supabase Edge Function]
        │
        ├── Validates Bearer token
        └── POST api.anthropic.com/v1/messages
                    ANTHROPIC_API_KEY (server secret)
                    model: claude-haiku-4-5
        │
        ↓
Returns: [{ text: "Buy milk" }, { text: "..." }]
        │
        ↓
onAddTasks(parsed) → addTasks.mutate(texts) → Write Flow (see §4)
```

---

## 7. Receipt Scan Flow

```
User taps scan icon → ScanSheet opens
        │
        ↓
expo-image-picker (base64: true option)
        ├── Take photo (camera)
        └── Choose from library
        │
        ↓ asset.base64 (already in memory, avoids blob URL issues)
processImage("data:image/jpeg;base64,...")
        │
        ↓
scanDocument(imageUri) [lib/api/scan.ts]
        │
        ├── web: parse data:URL → convert to Blob
        └── native: append { uri, name, type } to FormData
        │
        ↓
POST /functions/v1/document-scan
[Supabase Edge Function]
        │
        ├── Validates Bearer token
        ├── Reads image from FormData
        ├── Chunked base64 encoding (8192 bytes at a time — avoids call stack overflow)
        ├── getGoogleToken(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY_B64)
        │   └── Build JWT → sign with RSA-SHA256 → exchange for OAuth2 token
        └── POST us-documentai.googleapis.com/.../processors/38fd9a215392c8e9:process
        │
        ↓
Returns entities: supplier_name, receipt_date, line_items[]
        │
        ↓
parseScannedItems(lineItems) → ai-parse edge function
        │
        ↓
onAddExpenses(expenses) → addExpenses.mutate() → Write Flow (see §4)
```

---

## 8. Local Storage Schema

### Native (SQLite via expo-sqlite)

```sql
tasks_local (
  id TEXT PRIMARY KEY,          -- client UUID (same as client_id in Supabase)
  server_id TEXT,               -- Supabase row ID after first sync
  text TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_date TEXT,          -- YYYY-MM-DD
  reminder_at TEXT,             -- ISO timestamp
  created_at TEXT,
  updated_at TEXT,
  synced INTEGER DEFAULT 0      -- 0 = pending sync, 1 = synced
)

expenses_local ( ... same pattern ... )

sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT,              -- 'tasks' | 'expenses'
  record_id TEXT,               -- client UUID
  action TEXT,                  -- 'insert' | 'update' | 'delete'
  payload TEXT,                 -- JSON of Supabase column values
  retry_count INTEGER DEFAULT 0,
  created_at TEXT
)
```

### Web (localStorage)

```
localStorage['aria:tasks']       → JSON array of Task objects
localStorage['aria:expenses']    → JSON array of Expense objects
localStorage['aria:sync_queue']  → JSON array of SyncQueueItem objects
```

---

## 9. Supabase Database Schema (PostgreSQL)

```sql
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  push_token TEXT,              -- Expo push notification token
  notifications_enabled BOOLEAN DEFAULT true
)

tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID UNIQUE,        -- matches local app UUID for sync
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'complete')),
  scheduled_date DATE,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID UNIQUE,
  user_id UUID REFERENCES auth.users NOT NULL,
  item TEXT NOT NULL,
  amount INTEGER NOT NULL,      -- cents (e.g. $12.50 = 1250)
  currency TEXT DEFAULT 'USD',
  category TEXT,                -- groceries, dining, transport, etc.
  store TEXT,
  date DATE,
  receipt_scan BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

usage_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  event TEXT,                   -- 'voice_transcribe', 'document_scan', 'ai_parse'
  metadata JSONB,
  created_at TIMESTAMPTZ        -- used for rate limiting (last hour count)
)
```

**RLS rules** (every table): `user_id = auth.uid()` — users can only see/modify their own rows. The service role key (server only) bypasses this for admin operations.

---

## 10. Edge Functions Summary

| Function | Trigger | External API | Secret used | Rate limit |
|---|---|---|---|---|
| `voice-transcribe` | POST with audio FormData | Deepgram Nova-2 | `DEEPGRAM_API_KEY` | 50/hour per user |
| `ai-parse` | POST with transcript/items | Anthropic Claude Haiku | `ANTHROPIC_API_KEY` | 200/hour per user |
| `document-scan` | POST with image FormData | Google Document AI | `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY_B64`, `GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID` | 20/hour per user |
| `notifications-schedule` | POST from app | Expo Push API | `EXPO_ACCESS_TOKEN` | — |
| `notifications-morning` | pg_cron daily | Expo Push API | `EXPO_ACCESS_TOKEN` | — |

All functions:
1. Validate the `Authorization: Bearer <jwt>` header against Supabase Auth
2. Check the `usage_events` table for rate limiting
3. Call the external API with the server-held secret
4. Return the result to the app

---

## 11. Deployment Architecture

```
GitHub (neeraj3edu-prog/arie)
        │
        │ git push main
        ↓
Vercel (auto-deploy)
        ├── Build: cd aria && npm install && npm run build
        │          (expo export --platform web)
        ├── Output: aria/dist/
        │           index.html (SPA entry)
        │           _expo/static/js/ (bundle)
        │           _expo/static/css/ (styles)
        │           assets/ (fonts, images)
        │           manifest.json (PWA config)
        └── Rewrites: /* → /index.html (SPA routing)
        │
        ↓
https://arie-pi.vercel.app

Supabase (separate — not auto-deployed)
        ├── Edge Functions: deployed manually via CLI or Management API
        ├── Database migrations: run manually via Supabase Dashboard
        └── Secrets: set via CLI or Management API
```

**Environment variables on Vercel:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 12. Platform Differences Summary

| Feature | iOS/Android (Native) | Web (Safari/PWA) |
|---|---|---|
| Local storage | SQLite (expo-sqlite) | localStorage (JSON) |
| Auth session | expo-secure-store | localStorage |
| Sync queue | SQLite | localStorage |
| Realtime push | Supabase channels | Disabled (polls on foreground) |
| Audio recording | expo-av → .m4a file | expo-av → blob: URL |
| Image picker | URI (file path) | base64 string |
| Gesture swipe | GestureDetector (RNGH) | Plain View (disabled) |
| List rendering | FlashList (virtualised) | .map() (DOM) |
| Safe area | SafeAreaView (native APIs) | env(safe-area-inset-*) CSS |
| Push notifications | Expo Push + APNs/FCM | Not supported |
| Apple Sign In | expo-apple-authentication | Button hidden |

---

## 13. Request Journey — Full Example

**"Coffee $5 at Starbucks" spoken on iPhone → saved to server**

```
1. User taps mic → VoiceSheet opens
2. expo-av records → saves to /tmp/recording.m4a
3. User taps stop → useVoiceRecorder calls handleTranscript(uri)
4. transcribeAudio(uri):
     → GET supabase session → Bearer token
     → POST krumjfjmwdkndzvrbgiv.supabase.co/functions/v1/voice-transcribe
       Headers: Authorization: Bearer <jwt>
       Body:    FormData { audio: File(.m4a) }
5. Edge function:
     → Validates JWT with Supabase Auth
     → POST api.deepgram.com { audio } + DEEPGRAM_API_KEY
     → Returns { transcript: "Coffee $5 at Starbucks" }
6. parseExpenses("Coffee $5 at Starbucks"):
     → POST .../functions/v1/ai-parse
       Body: { mode: "expenses", text: "Coffee $5 at Starbucks" }
7. ai-parse Edge function:
     → Validates JWT
     → POST api.anthropic.com Claude Haiku + ANTHROPIC_API_KEY
     → Returns [{ item: "Coffee", amount: 500, category: "dining", store: "Starbucks" }]
8. onAddExpenses([expense]) → addExpenses.mutate([expense])
9. insertExpensesBatch([{ id: "uuid-abc", ...}])
     → INSERT INTO expenses_local (SQLite) — INSTANT, UI updates
10. addToSyncQueue([{ tableName: "expenses", recordId: "uuid-abc", action: "insert", payload: {...} }])
     → INSERT INTO sync_queue
11. triggerSync() [background]
     → Read sync_queue
     → POST .../rest/v1/expenses?on_conflict=client_id
       Headers: Authorization: Bearer <jwt>
       Body: { client_id: "uuid-abc", item: "Coffee", amount: 500, ... user_id: "50ea9f..." }
     → Supabase RLS: auth.uid() = user_id ✓
     → Row inserted into Postgres
     → DELETE FROM sync_queue WHERE id = ?
12. queryClient.invalidateQueries(['expenses']) → UI shows expense from SQLite cache
```

Total time for user: **steps 1–9 feel instant** (local write). Steps 10–12 happen silently in the background.
