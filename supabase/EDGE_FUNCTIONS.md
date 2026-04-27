# Supabase Edge Functions

All functions live in `supabase/functions/`. Each function:
- Validates the user's JWT before processing
- Enforces per-user rate limits
- Never holds API keys in client code

## Functions

| Function | Trigger | Purpose |
|---|---|---|
| `voice-transcribe` | App (POST) | Audio → text via Deepgram Nova-2 |
| `ai-parse` | App (POST) | Text/items → structured JSON via Claude Haiku |
| `document-scan` | App (POST) | Receipt image → line items via Google Document AI |
| `notifications-schedule` | App (POST) | Queue a push notification for a task reminder |
| `notifications-send` | pg_cron (every min) | Drain notification queue → Expo Push API |
| `notifications-morning` | pg_cron (daily 6am UTC) | Send morning briefing to opted-in users |

## Deploy

```bash
# Link to your Supabase project first
supabase login
supabase link --project-ref krumjfjmwdkndzvrbgiv

# Set all secrets (one-time)
supabase secrets set DEEPGRAM_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set GOOGLE_PROJECT_ID=...
supabase secrets set GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID=...
supabase secrets set GOOGLE_ACCESS_TOKEN=...
supabase secrets set EXPO_ACCESS_TOKEN=...

# Deploy all functions
supabase functions deploy voice-transcribe
supabase functions deploy ai-parse
supabase functions deploy document-scan
supabase functions deploy notifications-schedule
supabase functions deploy notifications-send
supabase functions deploy notifications-morning
```

## Rate Limits (per user per hour)

| Function | Limit | Reason |
|---|---|---|
| `voice-transcribe` | 50 | Deepgram cost control |
| `document-scan` | 20 | Google Document AI cost control |
| `ai-parse` | 200 | Claude cost control |

## CORS

All functions use `corsHeaders()` from `_shared/auth.ts`.
For production, update `corsHeaders()` to restrict to your domain:

```typescript
// supabase/functions/_shared/auth.ts
export function corsHeaders(origin = 'https://yourdomain.com') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
```

## Local Testing

```bash
supabase start            # starts local Supabase
supabase functions serve  # serves all functions locally at http://localhost:54321/functions/v1/
```

Update `aria/.env` for local testing:
```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
```
