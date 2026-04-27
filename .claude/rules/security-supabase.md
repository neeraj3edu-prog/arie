# Security — Supabase & General

## Golden Rules

1. **Never use the service role key on the client** — it bypasses RLS entirely.
2. **All client queries run as the authenticated user** — RLS is the last line of defense, not an optional feature.
3. **No secrets in source code or Expo constants** — use EAS Secrets for build-time, Edge Function env vars for runtime.
4. **Validate on the server** — client-side validation is UX only; always revalidate in Edge Functions and database constraints.

## Row Level Security (RLS)

Every table must have RLS enabled and explicit policies. Default-deny is the correct posture.

```sql
-- Template: user-scoped table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
```

- Never use `USING (true)` on sensitive tables without explicit justification.
- Review all policies when adding a new role or sharing feature.
- Use `auth.jwt() -> 'role'` for role-based access, not a user-level `role` column (can be spoofed).

## Authentication

- Use `supabase.auth.getUser()` (server-validates token) not `supabase.auth.getSession()` (trusts client JWT) for server-side auth checks.
- Set `jwtExpiry` to 3600s (1 hour) in Supabase dashboard — not longer.
- Enable MFA in the Supabase Auth settings for the admin dashboard.
- Deep link OAuth callbacks must use a custom scheme registered in `app.json` + verified in Supabase allowed redirects.
- Store the Supabase URL and anon key in `app.config.ts` via `process.env` — never hardcoded strings.

## Storage

- All storage buckets are **private by default** — only use public buckets for truly public assets.
- Generate signed URLs server-side (Edge Function) for user-uploaded content; never expose raw storage paths.
- Validate file type and size in the Edge Function before accepting uploads.
- Max upload size: 10MB for images, 50MB for audio recordings.

## Edge Functions

- Every Edge Function validates the `Authorization: Bearer <token>` header via `supabase.auth.getUser(token)`.
- Use `Deno.env.get()` for secrets — never import from client-exposed config.
- CORS: explicitly list allowed origins — never `*` in production.
- Rate-limit sensitive functions (AI structuring, voice upload) via an `upstash/ratelimit` integration.

## Data Handling

- No PII in console logs or Sentry breadcrumbs — redact before logging.
- Note content is user data — never include it in analytics events.
- AI requests to Claude: strip PII from metadata, only send note content the user explicitly submitted.
- Encryption at rest: enabled by default in Supabase; confirm for any self-hosted deployments.

## Dependency Security

- Run `npm audit` in CI — block on high/critical severity.
- Pin Expo SDK and Supabase client versions; review changelogs before bumping.
- No unvetted packages with native access to camera, microphone, or contacts.

## Incident Response

- Rotate compromised keys immediately via Supabase dashboard + EAS Secrets update + new build.
- Revoke all user sessions via `supabase.auth.admin.signOut(userId, 'global')` if account compromise suspected.
- Keep a `SECURITY.md` at repo root with responsible disclosure instructions.
