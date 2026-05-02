# Visual Polish Rules

## Core Aesthetic
This app is **premium dark mobile UI** — every element should feel intentional, tight, and alive. Avoid generic AI-slop patterns: no default Tailwind grays, no heavy glassmorphism, no excessive shadows, no "everything is a card" monotony.

## Motion Principles
- Use Framer Motion for all transitions — never CSS transitions on layout-changing properties
- Page content: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`, duration 0.16s
- List items: stagger with `delay: i * 0.05`, spring: `stiffness: 300, damping: 30`
- Section headers: `initial={{ opacity: 0, y: 4 }}`, duration 0.14s
- Use `AnimatePresence mode="wait"` when swapping between views (day/month toggle, date changes)
- Tap feedback: `whileTap={{ scale: 0.88 }}` on all interactive cells and buttons
- Calendar month change: `initial={{ opacity: 0, x: 20 }}` slide in, `exit={{ opacity: 0, x: -20 }}`
- Never animate layout/size properties — only `opacity`, `transform` (y, x, scale)

## Calendar Design
- Compact mode (used on both Tasks and Expenses pages): `h-11` (44px) cells, `w-7 h-7` number circle, `text-sm`
- Full-size mode: `aspect-square` cells, `w-7 h-7` circle, `text-sm`
- Today = filled circle with accent color, white text, `fontWeight: 700`
- Selected = semi-transparent accent background (`accentColor + "28"`), accent text
- Dim dates (outside current month): color `#4a4a60`
- Task/expense dot: single `w-1 h-1` dot at `bottom-1`, accent or `#34c759` if all complete
- Wrap the compact calendar in a dark surface card: `bg #13131a`, `border rgba(255,255,255,0.07)`, `rounded-2xl`

## Section Headers (Day/Month toggle pattern)
Used on both Tasks and Expenses pages — maintain exact same structure:
```
[Animated date label]          [Day | Month pill toggle]
[subtitle: count · total]
```
- Toggle pill: `bg rgba(255,255,255,0.06)`, `rounded-xl`, `p-0.5`
- Active tab: accent color tint + accent text; inactive: transparent + `#8a8aa0`

## Empty States
- "TRY SAYING..." hint card: shown only when `!hasMonthData && !loading && dayData.length === 0`
  - Tasks: blue tint `rgba(79,110,247,0.07)`, border `rgba(79,110,247,0.14)`
  - Expenses: amber tint `rgba(247,162,79,0.07)`, border `rgba(247,162,79,0.14)`
- Once data exists, show contextual `emptyMessage` string instead (e.g. "No tasks on Monday. Tap + to add.")

## List Items
- Task items: `rounded-2xl`, surface background, checkbox with animated SVG checkmark
- Expense items: `rounded-2xl`, amount right-aligned in accent amber, category icon left
- Completed tasks: strikethrough text, dimmed to `#8a8aa0`
- Swipe-to-delete: always available; show red delete zone on swipe left

## Voice Button (FAB)
- Fixed position, center-bottom, above BottomNav
- Tasks: `#4f6ef7` (blue), Expenses: `#f7a24f` (amber)
- Pulse animation at rest; tap opens VoiceModal

## Typography Rules
- Headings: `font-semibold`, `text-[#f0f0f5]`
- Subtitles / metadata: `text-xs`, `text-[#8a8aa0]`
- Accent values (totals, amounts): accent color
- Labels / section headers: `uppercase tracking-wide text-xs font-medium`
- Never use default Tailwind text colors (gray-400, etc.) — use the token hex values
