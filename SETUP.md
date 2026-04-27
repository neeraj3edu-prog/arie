# Aria — Local Development Setup

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x | `brew install node@20` or download from nodejs.org |
| Expo CLI | bundled | `npm install` inside `aria/` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |

> **macOS note:** If you get `xcrun simctl` errors, accept the Xcode licence:
> `sudo xcodebuild -license accept`

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd ArieNotesTakingApp/aria
npm install
```

---

## 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `aria/.env`:

```bash
# Supabase — from Project Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# EAS — from expo.dev → your project (leave placeholder until you create the project)
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

---

## 3. Supabase Database Setup

Run the three migration files in order in the **Supabase SQL Editor**
(Dashboard → SQL Editor → New Query):

```
supabase/migrations/001_initial_schema.sql   ← tables + indexes
supabase/migrations/002_rls_policies.sql      ← Row Level Security
supabase/migrations/003_pg_cron_jobs.sql      ← notifications (needs pg_cron enabled)
```

For `003_pg_cron_jobs.sql`: first enable the extension at
Dashboard → Database → Extensions → search `pg_cron` → Enable.

---

## 4. Google OAuth Setup

### Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google+ API** or **Google Identity** API
4. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add these **Authorized JavaScript origins**:
   ```
   http://localhost:8082
   https://yourdomain.com          ← add when going to prod
   ```
7. Add these **Authorized redirect URIs**:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**

### Supabase Dashboard

1. Go to **Authentication → Sign In Methods** (or Providers)
2. Find **Google** → Enable
3. Paste Client ID and Client Secret → Save

### Supabase URL Config

Go to **Authentication → URL Configuration**:

| Field | Value |
|---|---|
| Site URL | `http://localhost:8082` (dev) / `https://yourdomain.com` (prod) |
| Redirect URLs | `http://localhost:8082/**` and `https://yourdomain.com/**` |

---

## 5. Apple Sign-In (iOS only)

Apple Sign-In only works on real iOS devices (not web/Android).
Required for App Store submission if you offer any social login.

1. Enable at **Authentication → Providers → Apple**
2. Requires Apple Developer Account ($99/year) for production

---

## 6. Start the Dev Server

```bash
cd aria

# First time (clears Metro cache):
export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"   # if system Node < 20
./node_modules/.bin/expo start --clear

# Subsequent runs:
./node_modules/.bin/expo start

# Specify port (useful to avoid conflicts):
./node_modules/.bin/expo start --port 8082
```

- **Web**: open `http://localhost:8081` (or `--port` value) in browser
- **iOS**: press `i` (needs Xcode + iOS Simulator), or scan QR with Expo Go
- **Android**: press `a` (needs Android Studio + AVD), or scan QR with Expo Go

---

## 7. Supabase Edge Functions (for voice, scan, AI, notifications)

These are deployed separately — see [supabase/EDGE_FUNCTIONS.md](supabase/EDGE_FUNCTIONS.md).

For local dev without edge functions, the app still works fully offline:
- Tasks and expenses save to SQLite
- Voice and scan buttons will show an error (no API key)
- Sync queues locally until edge functions are deployed

---

## Node Version Note

The project requires Node 20+. If your system has an older version:

```bash
# Temporary (per session):
export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"

# Permanent (recommended):
sudo xcodebuild -license accept
brew install node@20
brew link node@20 --force
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `xcrun simctl` error | `sudo xcodebuild -license accept` |
| `wa-sqlite.wasm` not found | Already handled in `metro.config.js` |
| White/blank screen on web | Run `./node_modules/.bin/expo start --clear` to rebuild CSS cache |
| `autoprefixer` not found | Already removed from `postcss.config.js` |
| Google auth: "provider not enabled" | Enable Google in Supabase → Authentication → Providers |
| `Maximum update depth` error | Already fixed — use latest code from main |
