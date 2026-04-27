# Aria — Production Deployment Checklist

## Overview

| Layer | Service | Status |
|---|---|---|
| **Web app** | Vercel / Netlify (static export) | ✅ Fastest path — deploy today |
| Mobile app | EAS Build → App Store + Play Store | Needs Apple/Google accounts |
| Backend API | Supabase Edge Functions | Deploy before launch |
| Database | Supabase (already provisioned) | ✅ |
| Auth | Supabase Auth + Google OAuth | ✅ configured |
| Push notifications | Expo Push API + pg_cron | After EAS project |

---

## Step 0 — Web Deployment (Fastest Path)

The app already runs on web. Export it as a static site and deploy for free.

### Option A — Vercel (recommended)

1. **Export the web build**

   ```bash
   cd aria
   export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"
   ./node_modules/.bin/expo export --platform web
   # Output lands in aria/dist/
   ```

2. **Deploy with Vercel CLI**

   ```bash
   npm i -g vercel
   cd aria/dist
   vercel --prod
   ```

   Or connect your GitHub repo at [vercel.com](https://vercel.com) → New Project → select `ArieNotesTakingApp` → set **Root Directory** to `aria` → set **Build Command** to `expo export --platform web` → set **Output Directory** to `dist`.

3. **Environment variables** — add in Vercel Dashboard → Settings → Environment Variables:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://krumjfjmwdkndzvrbgiv.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VFdIoSFG39ElVJ0j9KaLIQ_ztd5OABW
   ```

4. **Update Supabase auth redirect URL** — Supabase Dashboard → Authentication → URL Configuration:

   | Field | Value |
   |---|---|
   | Site URL | `https://your-project.vercel.app` |
   | Redirect URLs | `https://your-project.vercel.app/**` |

5. **Update Google OAuth** — Google Cloud Console → OAuth Client → add `https://your-project.vercel.app` to **Authorized JavaScript origins**.

### Option B — Netlify

```bash
cd aria
./node_modules/.bin/expo export --platform web
npx netlify-cli deploy --dir dist --prod
```

Or drag the `aria/dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop) for an instant deploy.

### Web Deployment Notes

- The web app uses **localStorage** for offline-first storage — data persists across sessions in the same browser.
- Voice (Deepgram) and AI parse (Anthropic) features require the Supabase edge functions to be deployed (Step 1 below).
- Receipt scanning (Google Document AI) also requires the edge functions.
- Without edge functions, the app works for manual task/expense entry only.

---

## Step 1 — Supabase Edge Functions

Deploy all five edge functions. Requires [Supabase CLI](https://supabase.com/docs/guides/cli).

### Install Supabase CLI

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref krumjfjmwdkndzvrbgiv
```

### Set Secrets

```bash
supabase secrets set DEEPGRAM_API_KEY=your_deepgram_key
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
supabase secrets set GOOGLE_PROJECT_ID=your_gcp_project_id
supabase secrets set GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID=your_processor_id
supabase secrets set GOOGLE_ACCESS_TOKEN=your_service_account_token
supabase secrets set EXPO_ACCESS_TOKEN=your_expo_token
```

Where to get each key:

| Secret | Source |
|---|---|
| `DEEPGRAM_API_KEY` | [deepgram.com](https://deepgram.com) → Console → API Keys |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `GOOGLE_PROJECT_ID` | Google Cloud Console → project ID |
| `GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID` | Cloud Console → Document AI → Processors → Expense Parser |
| `GOOGLE_ACCESS_TOKEN` | Service account JSON key → generate access token |
| `EXPO_ACCESS_TOKEN` | [expo.dev](https://expo.dev) → Account Settings → Access Tokens |

### Deploy Functions

```bash
cd ArieNotesTakingApp

supabase functions deploy voice-transcribe
supabase functions deploy ai-parse
supabase functions deploy document-scan
supabase functions deploy notifications-schedule
supabase functions deploy notifications-send
supabase functions deploy notifications-morning
```

### Enable pg_cron (for push notifications)

In Supabase Dashboard → Database → Extensions → enable **pg_cron**.

Then run `supabase/migrations/003_pg_cron_jobs.sql` in the SQL Editor.

---

## Step 2 — EAS Build Setup

### Create EAS Project

```bash
cd aria
npx eas-cli init   # creates project on expo.dev, updates app.json
```

Copy the project ID from the output into `aria/.env`:
```bash
EXPO_PUBLIC_EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Configure `eas.json`

Create `aria/eas.json`:

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
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

### Set EAS Secrets (replaces .env in CI/CD builds)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://krumjfjmwdkndzvrbgiv.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..."
eas secret:create --scope project --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-eas-project-id"
```

---

## Step 3 — Production Supabase Config

### Update URL Configuration

In Supabase Dashboard → Authentication → URL Configuration:

| Field | Value |
|---|---|
| Site URL | `https://yourdomain.com` (or App Store URL) |
| Redirect URLs | `https://yourdomain.com/**`, `aria://**` |

### Update Google OAuth

In Google Cloud Console → OAuth Client:
- Add production domain to **Authorized JavaScript origins**
- Add `https://krumjfjmwdkndzvrbgiv.supabase.co/auth/v1/callback` to **Authorized redirect URIs** (already done)

### Supabase Rate Limits

Review and adjust the per-user rate limits in edge functions:

| Function | Default limit | Adjust in |
|---|---|---|
| `voice-transcribe` | 50/hour | `supabase/functions/voice-transcribe/index.ts` |
| `document-scan` | 20/hour | `supabase/functions/document-scan/index.ts` |
| `ai-parse` | 200/hour | `supabase/functions/ai-parse/index.ts` |

---

## Step 4 — Build & Submit

### iOS (App Store)

```bash
# Build
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --profile production
```

Requirements:
- Apple Developer Account ($99/year)
- App icon at `aria/assets/images/icon.png` (1024×1024, no transparency)
- Screenshots: iPhone 6.7" (1290×2796) and 5.5" (1242×2208)
- Privacy Policy URL (required)
- Declare: Microphone, Camera, Photos usage

### Android (Play Store)

```bash
# Build (.aab)
eas build --platform android --profile production

# Submit
eas submit --platform android --profile production
```

Requirements:
- Google Play Developer Account ($25 one-time)
- Adaptive icon at `aria/assets/images/adaptive-icon.png`
- Feature graphic (1024×500)
- Privacy Policy URL

### Both Platforms

```bash
eas build --platform all --profile production
```

---

## Step 5 — Post-Launch

### Monitoring

- **Crash reporting**: Sentry — add DSN to `aria/.env`:
  ```bash
  EXPO_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  ```
  Then init in `aria/app/_layout.tsx` (commented placeholder already there)

- **Usage analytics**: Query `usage_events` table in Supabase Studio

### OTA Updates (JS-only changes)

```bash
eas update --branch production --message "Fix: sign-in flow"
```

Only use for JS changes. Native changes (new packages with native code, config changes) require a new build.

---

## Environment Variables Reference

### `aria/.env` (local dev, never commit)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://krumjfjmwdkndzvrbgiv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VFdIoSFG39ElVJ0j9KaLIQ_ztd5OABW
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
EXPO_PUBLIC_SENTRY_DSN=          # optional, for crash reporting
```

### Supabase Edge Function Secrets (never in code)

```bash
DEEPGRAM_API_KEY
ANTHROPIC_API_KEY
GOOGLE_PROJECT_ID
GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID
GOOGLE_ACCESS_TOKEN
EXPO_ACCESS_TOKEN
SUPABASE_SERVICE_ROLE_KEY       # auto-injected by Supabase runtime
```

### What NEVER goes in the mobile app bundle

```
✗ DEEPGRAM_API_KEY        ← in Edge Function only
✗ ANTHROPIC_API_KEY       ← in Edge Function only
✗ GOOGLE_ACCESS_TOKEN     ← in Edge Function only
✗ SUPABASE_SERVICE_ROLE_KEY  ← server-side only
```

---

## Cost Estimate at Launch (0–1,000 users)

| Service | Plan | Monthly |
|---|---|---|
| Supabase | Free | $0 |
| Deepgram | Free (12K min/mo) | $0 |
| Google Document AI | Free (1K pages/mo) | $0 |
| Anthropic Claude Haiku | Pay-as-you-go | ~$5–10 |
| Expo EAS | Free tier | $0 |
| **Total** | | **~$5–10/mo** |
