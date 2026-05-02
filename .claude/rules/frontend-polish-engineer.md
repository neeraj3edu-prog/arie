# Frontend Polish Engineer

Rules for delivering polished, production-quality frontend code in this React Native / Expo web project. Apply these before marking any UI task done.

---

## Cross-Platform Rules (the hardest-won lessons)

### Styles
- **Never use NativeWind class names for colours** (`text-text-primary`, `bg-bg`, etc.) — they fail silently on web. Use inline `style={{ color: '#f0f0f5' }}` for all colour/font tokens.
- NativeWind layout classes (`flex-1`, `flex-row`, `items-center`) are safe to use on both platforms.
- `pointerEvents` must be a **View prop** not inside a `style` object — `style={{ pointerEvents: 'box-none' }}` blocks clicks on web.

### Navigation
- In custom tab bars, use `router.navigate('/(tabs)/routeName')` from `expo-router` — not `navigation.navigate()` or `TabActions.jumpTo()`. Only Expo Router's `router` updates the URL correctly on web.
- Use `usePathname()` to detect the active tab — not `state.routes[state.index]`. The pathname is always accurate; index arithmetic breaks with hidden routes.
- Render the tab bar as a **direct sibling** of `<Tabs>` inside a wrapper View. Do NOT rely on React Navigation's `tabBar` prop — it can be silently dropped on web.

### Scrolling on iOS Safari
- Each screen must have a **single top-level `<ScrollView>`** wrapping all content. Nested scroll containers inside flex layouts fail on iOS Safari.
- Never use `FlashList` on web for lists that scroll — it renders with `height: 0` inside a `ScrollView`. Use a plain `.map()` instead. Keep `FlashList` for native only behind `Platform.OS !== 'web'`.
- `GestureDetector` from `react-native-gesture-handler` intercepts ALL touch events on iOS Safari, preventing scroll. Remove `GestureDetector` on web (render a simplified component without gestures).

### Safe Area & Viewport
- Always use `<SafeAreaView edges={['top']}>` — never handle top padding manually.
- Use `height: 100dvh` (dynamic viewport height) not `100vh` for the root — accounts for iOS Safari's retractable address bar.
- For the safe-area notch colour, add `body::before { position: fixed; top: 0; height: env(safe-area-inset-top); background: #0a0a0f }` in `+html.tsx`.

### SQLite / Local DB
- `expo-sqlite` is native only. On web, Metro resolves `*.web.ts` files — always provide a `.web.ts` implementation for every DB module.
- Never call DB functions directly from screen components. All DB access goes through hooks. The hooks call the DB layer; the platform file resolution handles the rest.
- Web DB pattern: **write to localStorage → queue → Supabase async**. The sync engine (`syncEngine.web.ts`) runs after every mutation.

---

## Sheet / Modal Rules

- All Sheets must use `Sheet.tsx` component — no inline `Modal` usage.
- Text inside Sheets must use inline styles (not NativeWind) — Sheets have their own render context where NativeWind may not resolve.
- Sheets must handle the `onClose` callback and reset all internal state.
- `snapHeight` must accommodate the keyboard on iOS — test with keyboard open.

---

## PWA (Progressive Web App)

- `+html.tsx` must include all four meta tags: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `theme-color: #0a0a0f`.
- `public/manifest.json` must exist with `display: "standalone"`, `scope: "/"`, `start_url: "/"`.
- After any manifest or meta tag change, the user must **delete the home screen shortcut and re-add it** — iOS caches the manifest at install time.
- Navigation within the PWA must stay client-side (History API). Any navigation that triggers a full HTTP request will break out of standalone mode and show the browser chrome.

---

## Voice / Media

- `expo-av` on web returns a `blob:` URL. Always `fetch(blobUri)` to get the real `Blob` before appending to `FormData` — never pass the URI string directly.
- Same applies to `expo-image-picker` on web: use `base64: true` in the picker options to get base64 directly, avoiding blob URL revocation on iOS Safari.

---

## Pre-Commit UI Checklist

Before every commit touching UI:

- [ ] No new hex colour values outside the design token set
- [ ] No NativeWind colour classes on components that render on web
- [ ] `GestureDetector` guarded by `Platform.OS !== 'web'`
- [ ] Lists on web use `.map()` not `FlashList`
- [ ] New screens have single top-level `ScrollView`
- [ ] Tab bar still visible after navigation changes
- [ ] Empty, loading, and error states all render correctly
- [ ] No `console.log` without `if (__DEV__)` guard
