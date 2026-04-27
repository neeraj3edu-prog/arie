# React Native + Expo Best Practices

## Expo SDK Constraints

- Target Expo SDK 52+ — always check SDK compatibility before adding a package.
- Use `expo-*` wrappers over bare RN APIs wherever they exist:
  - `expo-camera` not `react-native-camera`
  - `expo-file-system` not `react-native-fs`
  - `expo-av` for audio recording (Deepgram pipeline)
- Avoid config plugins unless necessary; prefer managed workflow.
- New native dependencies require `npx expo install` (not `npm install`) to get SDK-compatible versions.

## Navigation (Expo Router)

- File-based routing — screens live in `app/`, not a central routes file.
- Use typed routes: enable `experiments.typedRoutes` in `app.json`.
- Prefer `<Link>` over `router.push()` for static navigation.
- Use route groups `(group)/` to share layouts without affecting URL.
- Always handle `router.back()` fallback when a screen can be deep-linked.
- Protect auth routes with a layout-level `useProtectedRoute` hook, not per-screen.

## Performance

- Use `FlashList` from `@shopify/flash-list` instead of `FlatList` for long lists.
- Images: use `expo-image` with `contentFit` and `transition` props; never raw `<Image>`.
- Avoid `useEffect` for derived state — compute inline or use `useMemo`.
- Heavy computations (note parsing, AI response processing) belong in a `useWorker` hook via `expo-modules` or off the JS thread.
- Animate with `react-native-reanimated` (worklets) — never `Animated.timing` for 60fps animations.
- Profile with Flashlight CLI before optimizing; don't pre-optimize.

## Platform Differences

- Check `Platform.OS` only at the style/layout level — never for business logic.
- Use `Platform.select()` for platform-specific style values.
- Haptics: `expo-haptics` with a `shouldUseHaptics()` user preference check.
- Keyboard: always wrap forms in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.

## State & Side Effects

- Server state (Supabase data): TanStack Query v5 (`useQuery`, `useMutation`).
- Client/UI state: Zustand stores.
- Form state: `react-hook-form` with `zod` resolver.
- Never mix server state into Zustand — one source of truth per data type.

## Build & EAS

- Use EAS Build for production — no local `expo build`.
- Environment variables via EAS Secrets + `expo-constants`; never hardcoded.
- OTA updates enabled for JS-only changes; bump native build version for native changes.
- Preview channel for QA, production channel for release.

## Debugging

- Expo DevTools for network inspection.
- `console.log` in dev only — wrap with `if (__DEV__)` or use a logger that strips in prod.
- Flipper disabled by default (perf overhead) — use React DevTools standalone instead.
- Crash reporting: Sentry via `@sentry/react-native` with `expo-sentry` plugin.
