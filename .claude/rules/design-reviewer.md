# Design Reviewer

Before shipping any UI change, verify every item below. Do not report a task as done until this checklist passes.

---

## Design Token Consistency

- All colours must come from the design token set — never invent new hex values:
  ```
  bg:             #0a0a0f
  surface:        #13131a
  text-primary:   #f0f0f5
  text-secondary: #8a8aa0
  text-muted:     #4a4a60
  tasks accent:   #4f6ef7
  expenses accent:#f7a24f
  success:        #34c759
  error:          #ff453a
  ```
- If a new colour is needed, add it to the token set in `tailwind.config.js` AND `CLAUDE.md`. Do not one-off it inline.
- Font weights: `'400'` (body), `'600'` (label), `'700'` (heading). No other weights.

---

## Spacing & Layout

- Horizontal screen padding is always `16px`. Never pad at `12` or `20` unless inside a component.
- Vertical spacing between sections: `8–12px` gap. Between items in a list: `1px` separator line.
- Touch targets: minimum `44×44pt`. Use `hitSlop` if the visual element is smaller.
- Interactive elements must never be closer than `8pt` apart.

---

## Dark Theme

- Every new component must work on `#0a0a0f` background without any white flash.
- Never set `backgroundColor: '#fff'` or `backgroundColor: 'white'` anywhere. Always use surface token or transparent.
- Status bar: always dark content style on native, `black-translucent` on web PWA.
- Check that loading skeletons / spinners use the accent colour, not system blue.

---

## Empty, Loading & Error States

Every data-driven screen/component must handle all three states visibly:

| State | Requirement |
|---|---|
| Loading | `ActivityIndicator` with accent colour — not just blank space |
| Empty | "TRY SAYING…" card with example prompts (tasks = blue, expenses = orange) |
| Error | Inline error text in `#ff453a`, never an alert unless user action caused the error |

---

## Typography Hierarchy

| Element | Size | Weight | Colour |
|---|---|---|---|
| Screen title | 28 | 700 | text-primary |
| Section header | 18–20 | 700 | text-primary |
| Body / list item | 14–15 | 400 | text-primary |
| Caption / subtitle | 12–13 | 400–600 | text-secondary |
| Muted hint | 12 | 400 | text-muted |

---

## Platform Parity Check

Before any commit touching UI, mentally test:
- [ ] Renders correctly with no data
- [ ] Renders correctly with 1 item
- [ ] Renders correctly with 20+ items (no overflow)
- [ ] Works in Safari (web) — no white flashes, scrolls correctly
- [ ] Works as PWA (standalone mode) — no browser chrome bleed
- [ ] Tab bar always visible and correctly coloured
- [ ] FAB not obscuring list items

---

## Component Review Triggers

Re-run this checklist whenever:
- A new screen is added
- A new sheet/modal is added
- The tab bar is modified
- Calendar rendering is changed
- Colour or spacing values are changed inline
