# Accessibility Rules

## Target Standard
WCAG 2.2 AA — all interactive elements must be keyboard navigable and screen-reader friendly.

## Touch Targets
- Minimum 44×44px for all tap targets on mobile (matches Apple HIG)
- Calendar day cells in compact mode: `h-11` (44px) satisfies this
- FAB voice button: at least 56×56px
- Bottom nav items: full-width tap zones, not just the icon

## ARIA & Semantics
- Calendar day buttons: `aria-label={date}` (ISO format), `aria-pressed={isSelected}`
- VoiceModal: `role="dialog"`, `aria-modal="true"`, `aria-label="Voice input"`
- Bottom nav: `<nav>` with `aria-label="Main navigation"`; active tab gets `aria-current="page"`
- PageHeader back button: `aria-label="Go back"`
- Add buttons: `aria-label="Add task"` / `aria-label="Add expense"` (not just "+")
- Loading skeletons: `aria-busy="true"` on the container

## Color Contrast
- Text primary `#f0f0f5` on `#0a0a0f` bg: passes AA (14.5:1)
- Text secondary `#8a8aa0` on `#0a0a0f`: passes AA (4.6:1)
- Accent `#4f6ef7` on `#0a0a0f`: passes AA for large text; use only for decorative or large elements for body text
- Never use `#4a4a60` (dim color) for text that conveys meaning — decorative only

## Focus Management
- VoiceModal: trap focus inside when open; return focus to trigger button on close
- AddItemSheet: auto-focus the text input when sheet opens
- Custom focus ring: `outline: 2px solid accentColor`, `outline-offset: 2px` — never remove focus outlines without replacement

## Motion & Reduced Motion
- Wrap Framer Motion variants in `useReducedMotion()` check
- If `prefersReducedMotion` is true, set all animation durations to 0 and disable whileTap scale
- Waveform bars in VoiceModal: stop animating if reduced motion is preferred

## Voice Input Accessibility
- Always provide text input fallback (AddItemSheet) — voice is enhancement, not requirement
- Show transcript live during recording for users who can't hear feedback
- VoiceModal close button must be reachable without voice

## Screen Reader Notes
- Task completion state: use `aria-checked` on the checkbox-like toggle button
- Expense amounts: ensure screen readers read "$3.50" not "3 50"
- Calendar dots: don't rely on dots alone — `aria-label` on day button includes task count when summary exists
