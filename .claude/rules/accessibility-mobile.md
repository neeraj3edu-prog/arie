# Mobile Accessibility Guidelines

## Core Principle

Every feature must be fully usable with screen readers (VoiceOver on iOS, TalkBack on Android) and one-handed interaction. Accessibility is a first-class requirement, not a post-launch checkbox.

## Touch Targets

- Minimum touch target: **44×44pt** (iOS HIG) / **48×48dp** (Material).
- If a visual element is smaller, expand the hit area with `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`.
- Never place interactive elements closer than 8pt apart.

## Screen Reader Labels

Every interactive element needs:

```tsx
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Delete note titled Meeting Notes"
  accessibilityHint="Removes this note permanently"
  onPress={handleDelete}
>
```

- `accessibilityLabel`: what it IS — concise noun phrase.
- `accessibilityHint`: what it DOES — starts with a verb.
- `accessibilityRole`: always set on interactive elements (`button`, `link`, `checkbox`, `tab`, `header`, `image`, `text`).
- `accessibilityState`: for toggles/checkboxes — `{ checked, selected, disabled, expanded }`.

## Focus Management

- After a modal opens, move focus to the first interactive element inside it.
- After a modal closes, return focus to the element that triggered it.
- Use `accessibilityViewIsModal={true}` on modal containers so screen readers don't read behind it.
- In long scrollable lists, use `accessibilityLiveRegion="polite"` on dynamic count indicators.

## Color & Contrast

- Text contrast ratio: **4.5:1** minimum (AA), target **7:1** (AAA) for body text.
- Never convey meaning with color alone — pair with icon, label, or pattern.
- Support system Dark Mode via `useColorScheme()` + NativeWind dark: classes.
- Don't disable the user's font size preferences — use `allowFontScaling={true}` (default) and test at 200% font scale.

## Voice Notes (Deepgram)

- Provide a visual transcript alongside audio playback.
- Show recording status with both a visual indicator AND `accessibilityLiveRegion="assertive"` announcement.
- Allow text-only fallback for the entire voice capture flow.

## Forms

- Every input has an associated label — use `accessibilityLabel` on the `TextInput`.
- Error messages must be announced: set `accessibilityLiveRegion="assertive"` on the error container.
- Required fields: include "required" in the `accessibilityLabel`, e.g., "Note title, required".

## Animations & Motion

- Respect `reduceMotion` preference:

```tsx
import { useReduceMotion } from 'react-native-reanimated';
const shouldReduceMotion = useReduceMotion();
```

- Never auto-play animations longer than 5 seconds.
- Provide a static fallback for all animated illustrations.

## Testing Checklist

Before marking any screen as done:
- [ ] VoiceOver navigation — every element reachable and labeled
- [ ] TalkBack navigation — same
- [ ] 200% font scale — no truncation or overflow
- [ ] High contrast mode — all content visible
- [ ] One-handed use (thumb zone audit on 6.5" screen)
- [ ] No motion-only affordances
