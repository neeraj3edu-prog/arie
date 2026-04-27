# Aria — Technical Learnings & Gotchas

Hard-won lessons from building Aria. Read this before touching cross-platform code.

---

## 1. NativeWind Custom Classes Fail on Web

**Problem**: Custom Tailwind color tokens (`text-text-primary`, `bg-bg`, `bg-surface`, etc.) defined in `tailwind.config.js` do not reliably generate CSS on the web bundle, so elements that use them appear invisible (transparent text, wrong backgrounds).

**Fix**: Use inline `style` props with the raw hex value for anything that needs to be visible on web. NativeWind classes are fine for layout (`flex-1`, `flex-row`, `items-center`) but not for custom colour tokens.

```tsx
// ❌ Breaks on web — colour never applied
<Text className="text-text-primary text-lg font-bold">Hello</Text>

// ✅ Works everywhere
<Text style={{ color: '#f0f0f5', fontSize: 18, fontWeight: '700' }}>Hello</Text>
```

**Rule**: Any component that must render on web should use inline styles for colours and font weights. NativeWind layout classes are fine.

---

## 2. `pointerEvents` Must Be a Prop, Not a Style

**Problem**: Putting `pointerEvents: 'box-none'` inside a `style` object does not work on web — react-native-web translates it to `pointer-events: none` on the element *and* all its children, making every button inside unclickable.

```tsx
// ❌ Silently breaks all clicks on web
<View style={{ pointerEvents: 'box-none', position: 'absolute', ... }}>

// ✅ Works as expected on native; still unreliable on web
<View pointerEvents="box-none" style={{ position: 'absolute', ... }}>
```

**Deeper fix**: Avoid absolute-positioned wrappers that need touch pass-through on web entirely. Put the interactive element in normal document flow instead.

---

## 3. Custom Tab Bar Navigation — Use `router.navigate`

**Problem**: Expo Router wraps React Navigation. When building a custom `tabBar` component, using the `navigation` prop methods does not reliably change routes on web:

| Method | Result on web |
|---|---|
| `navigation.navigate(name)` | May silently no-op |
| `navigation.dispatch(TabActions.jumpTo(name))` | Works on native, may not update URL on web |
| `router.navigate('/(tabs)/expenses')` | ✅ Works everywhere, updates URL |

**Fix**: Import `router` from `expo-router` and use it directly for navigation inside custom tab bars.

```tsx
import { router } from 'expo-router';

<Pressable onPress={() => router.navigate('/(tabs)/expenses')}>
```

---

## 4. `insets` from `BottomTabBarProps` Is Undefined on Web

**Problem**: The `insets` prop injected into custom `tabBar` components comes from `react-native-safe-area-context`. On web this context is often not set up, so `insets` is `undefined` and `insets.bottom` crashes the component — silently hiding the entire tab bar.

```tsx
// ❌ Crashes on web if insets is undefined
function PillTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const pad = insets.bottom; // TypeError: Cannot read properties of undefined
}

// ✅ Safe
const bottomPad = insets?.bottom ?? 0;
// Or just hardcode for web:
paddingBottom: Platform.OS === 'ios' ? 28 : 14,
```

---

## 5. Platform-Specific File Resolution (`.web.ts`)

Metro bundler automatically picks `foo.web.ts` over `foo.ts` when bundling for web. Use this to swap entire modules:

```
lib/db/client.ts        ← native (expo-sqlite)
lib/db/client.web.ts    ← web (throws error or localStorage)

lib/db/tasks.ts         ← native (SQLite queries)
lib/db/tasks.web.ts     ← web (localStorage)

lib/sync/queue.ts       ← native (SQLite queue)
lib/sync/queue.web.ts   ← web (localStorage queue)
```

This means **hooks and screens never need `Platform.OS` checks for data access** — the correct implementation is resolved by the bundler. Keep `Platform.OS` checks only for UI differences (haptics, safe area, keyboard behaviour).

---

## 6. SQLite Is Native-Only — Web Needs localStorage

**Problem**: `expo-sqlite` is not available on web. Any import of `getDb()` on web throws:
```
SQLite is not available on web. Use Expo Go or a native build.
```

This applies to:
- Direct DB calls from screen files (`insertExpensesBatch` in `expenses/index.tsx`)
- Any hook without a `Platform.OS === 'web'` guard

**Fix**: Create `.web.ts` platform files for all DB modules using `localStorage`:

```ts
// lib/db/expenses.web.ts
const KEY = 'aria:expenses';
function loadAll(): Expense[] {
  return JSON.parse(localStorage.getItem(KEY) ?? '[]');
}
export async function insertExpensesBatch(expenses) {
  const all = loadAll();
  // append new items
  localStorage.setItem(KEY, JSON.stringify(all));
}
```

**Also**: Never call DB functions directly in screen components. Always go through hooks — hooks are where the platform branching should live.

---

## 7. Offline-First Architecture for Web

**Pattern**: localStorage → sync queue → Supabase (async).

```
Write path:   UI → insertExpensesBatch (localStorage) → addToSyncQueue (localStorage) → triggerSync (async)
Read path:    getExpensesForDate (localStorage) → if empty, bootstrap from Supabase
Sync engine:  reads queue → upserts to Supabase → removes from queue on success → increments retryCount on failure (max 5)
```

**Bootstrap**: On first load, localStorage is empty. The `getExpensesForDate` / `getTasksForDate` functions check for empty results and fall back to a Supabase fetch, storing the result in localStorage for subsequent loads.

**Sync queue schema** (localStorage):
```ts
type SyncQueueItem = {
  id: number;
  tableName: 'tasks' | 'expenses';
  recordId: string;
  action: 'insert' | 'update' | 'delete';
  payload: string; // JSON
  retryCount: number;
  createdAt: string;
};
```

---

## 8. Web Voice Recording — Blob URL Requires a Fetch

**Problem**: `expo-av` records audio on web and returns a `blob:` URL. Appending that URL string directly to `FormData` sends a string, not audio data — the edge function receives nothing.

```ts
// ❌ Sends a string "blob:http://localhost:8082/..." not audio
formData.append('audio', audioUri);

// ✅ Fetch the blob URL first to get the real Blob
const response = await fetch(audioUri);
const blob = await response.blob();
formData.append('audio', blob, 'recording.webm');
```

---

## 9. Google OAuth on Web — `detectSessionInUrl`

Supabase Auth uses the URL hash to pass OAuth tokens back on web. Without `detectSessionInUrl: true`, the session is silently dropped after the OAuth redirect.

```ts
// lib/supabase/client.ts
createClient(url, key, {
  auth: {
    detectSessionInUrl: Platform.OS === 'web', // ← critical for web OAuth
  }
})
```

---

## 10. React Navigation — Maximum Update Depth with `<Redirect>`

**Problem**: Using `<Redirect href="...">` inside a component that re-renders during navigation causes the "Maximum update depth exceeded" error. React Navigation and Expo Router both update state on redirect, which triggers re-render, which triggers another redirect.

```tsx
// ❌ Causes infinite render loop
if (user && inAuthGroup) return <Redirect href="/(tabs)/tasks" />;

// ✅ Use router.replace inside useEffect
useEffect(() => {
  if (!loading && user && inAuthGroup) {
    router.replace('/(tabs)/tasks');
  }
}, [user, loading]);
```

---

## 11. Metro Bundler — `.wasm` Files Crash the Web Build

`expo-sqlite` imports WebAssembly files. Metro on web doesn't know how to handle them and crashes.

**Fix** in `metro.config.js`:
```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.endsWith('.wasm')) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

---

## 12. Supabase Upsert — Always Send `client_id`

The sync architecture uses `client_id` as the stable identifier across devices. Every `insert` payload sent to Supabase must include `client_id`.

```ts
// ✅ Correct sync payload
{
  client_id: localId,   // the UUID generated on device
  user_id: session.user.id,
  text: task.text,
  ...
}

// RLS + upsert conflict key
supabase.from('tasks').upsert(payload, { onConflict: 'client_id' })
```

If `client_id` is missing, every sync attempt inserts a duplicate row instead of updating the existing one.

---

## 13. `isFocused` Detection in Custom Tab Bar

Derive `isFocused` from the current route **name**, not index arithmetic — index can be off when hidden routes (`href: null`) exist in the state.

```tsx
// ❌ Index arithmetic breaks when hidden routes are present
const isFocused = state.index === i;

// ✅ Compare by route name
const currentRouteName = state.routes[state.index]?.name ?? '';
const isFocused = currentRouteName === tab.name;
```
