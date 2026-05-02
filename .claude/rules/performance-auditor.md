# Performance Auditor

Performance rules for Aria. Apply proactively — do not wait to be asked.

---

## Re-render Prevention

- Never create objects or arrays inline in JSX — they create new references on every render:
  ```tsx
  // ❌ New Set on every render
  datesWithTasks={new Set(tasks.map(t => t.scheduledDate))}

  // ✅ Memoised
  const datesWithTasks = useMemo(() => new Set(tasks.map(t => t.scheduledDate)), [tasks]);
  ```
- Handler functions passed as props must be stable: use `useCallback` or define outside the component.
- Only `React.memo` a component if profiling proves it helps. Do not memo everything preemptively.

---

## Data Fetching

- TanStack Query controls all server/cache state. Never store API results in `useState`.
- `staleTime: 60_000` is the project default. Increase for static data (categories, user profile). Decrease only if data changes very frequently.
- `invalidateQueries` must use the most specific key possible — avoid `queryClient.invalidateQueries()` with no key (blows all caches).
- Parallel queries for independent data: call multiple `useQuery` hooks, not sequential `await`s.
- Always handle `isLoading` and `isError` states in the UI — never leave blank white screens during fetches.

---

## Local DB (SQLite / localStorage)

- Batch inserts always use `insertExpensesBatch` / `insertTasksBatch` — never loop `insertExpense()` individually.
- On web, localStorage reads are synchronous but writes are blocking. Keep payloads small — store only what the UI needs, not full API responses.
- The sync queue flushes on every `onSuccess` — do not trigger redundant syncs.
- `triggerSync()` is debounced at the engine level. Calling it multiple times in one tick is safe but unnecessary — call once per mutation.

---

## Images & Assets

- Receipt scans: always compress to quality `0.6` before upload — typical iPhone photo at 0.8 is 2–3 MB which overflows the Deno call stack (proven issue).
- Chunked base64 encoding for images > 100 KB:
  ```typescript
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const b64 = btoa(binary);
  ```
  Never use `btoa(String.fromCharCode(...new Uint8Array(largeBuffer)))` — it will exceed call stack.
- Use `expo-image` with `contentFit` and `transition` — never bare `<Image>` from React Native.

---

## Edge Functions (Deno)

- No `import { createClient }` from `esm.sh` in edge functions — the esm.sh CDN import causes boot errors on cold starts. Use direct `fetch()` calls to the Supabase REST API instead.
- Secrets that contain JSON with embedded newlines (`\n` in private keys) must be stored as separate flat values, not as a JSON blob — `JSON.parse` of a secret value that has had `\n` converted to real newlines will throw `Bad control character`.
- Cold start budget: < 500ms. Functions that import large packages (supabase-js, anthropic) cold-start slowly. Keep imports minimal.

---

## Bundle Size

- Check bundle size after adding any new dependency: `expo export --platform web` and inspect `dist/_expo/static/js/`.
- Do not import entire icon sets — `@expo/vector-icons` tree-shakes by icon family, not individual icon. Only import the families you use.
- Platform-specific code must be in `.web.ts` / `.native.ts` files — not inside `if (Platform.OS === 'web')` blocks in the main bundle. Bundler eliminates unused platform files; runtime guards do not.

---

## Network

- Voice recording: chunk large audio before sending if > 1 MB. Supabase Edge Functions have a 6 MB request body limit.
- Document scan: compress image to 60% quality. Google Document AI processes up to 8 MB but the Deno `arrayBuffer` spread will crash at ~2 MB without chunked base64.
- Realtime subscriptions: one channel per `(table, filter)` combination. Never open multiple channels for the same filter — they stack up and consume memory.
- On web, realtime subscriptions are disabled (guarded by `Platform.OS === 'web'`). Polling happens via `queryClient.invalidateQueries` on `AppState` change. This is intentional.

---

## Audit Triggers

Run this audit whenever:
- A new `useQuery` or `useMutation` is added
- A new dependency is installed
- A new edge function is written
- An image or file upload flow is added
- A new realtime subscription is opened
