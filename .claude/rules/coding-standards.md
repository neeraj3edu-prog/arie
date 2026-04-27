# Coding Standards

## TypeScript

- Strict mode enabled (`"strict": true` in tsconfig). Never disable it.
- No `any` — use `unknown` + type guards or define a proper type.
- No non-null assertions (`!`) without an inline comment explaining the guarantee.
- Prefer `type` over `interface` for unions/intersections; use `interface` only for extensible object shapes.
- All async functions must have explicit return types: `async function foo(): Promise<Bar>`.
- Use `satisfies` operator instead of `as` for type narrowing where possible.

## File & Module Conventions

- One component / one concern per file.
- Named exports only — no default exports (improves refactoring, avoids name collisions).
- Barrel files (`index.ts`) only at feature boundaries, not inside features.
- Import order (enforced by eslint-plugin-import):
  1. Node built-ins
  2. External packages
  3. Internal absolute paths (`@/`)
  4. Relative paths

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `NoteCard.tsx` |
| Hooks | camelCase, `use` prefix | `useNoteSync.ts` |
| Stores | camelCase, `Store` suffix | `noteStore.ts` |
| Types | PascalCase | `NoteWithMeta` |
| Constants | SCREAMING_SNAKE | `MAX_RECORDING_MS` |
| Event handlers | `handle` prefix | `handleSubmit` |

## React & React Native

- Functional components only — no class components.
- `React.memo` only when profiling proves it helps; not preemptively.
- Avoid inline arrow functions in JSX render — extract to named handler.
- No direct `StyleSheet.create` for layout — use NativeWind classes.
- `StyleSheet.create` only for styles that can't be expressed as Tailwind classes (e.g., transforms, shadows on Android).
- Always include `accessible` and `accessibilityLabel` on interactive elements.

## Error Handling

- All `async/await` in event handlers must be wrapped in `try/catch`.
- Surface errors to the user via a toast/snackbar — never swallow silently.
- Log errors with context: `logger.error('noteSync.push', { noteId, error })`.
- Use a typed `Result<T, E>` pattern for operations that can fail predictably.

## Testing

- Unit tests for pure functions in `__tests__/` next to the source file.
- Integration tests for Supabase queries use a local Supabase instance (never prod).
- E2E tests with Maestro for critical flows: create note, voice capture, sync.
- Minimum coverage targets: utils 80%, stores 70%, components 50%.

## Git

- Commits follow Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Branch naming: `feat/voice-waveform`, `fix/sync-conflict-resolution`.
- PRs must pass typecheck + lint + unit tests before merge.
- No `.env` files committed — use `.env.example` with placeholder values.
