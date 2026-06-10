# Handoff: SalesUp CEO Dashboard

> For Claude Code. Read this top-to-bottom once, then build. The HTML in this
> bundle is a **working design reference** — your job is to re-implement it in a
> real, production codebase, not to ship the prototype as-is.

---

## 1. Get-shit-done summary (read this first)

**What it is:** A single-page CEO dashboard for SalesUp Norway AS — a digital
agency (SEO/ADS retainers, hosting, a SaaS called *Mynk*, and dev projects). The
whole point: a CEO opens it and in ~30 seconds sees *"are we growing, earning,
keeping customers, and where do I need to act?"* — without scrolling.

**Three tabs, all live today:** `Oversikt` (overview), `Kunder` (customer
success), `Kapasitet` (capacity/scaling simulator).

**Build order (fastest path to value):**
1. Scaffold the shell: top bar (logo, pill nav, search, avatar), contextual
   header (title + period + export), footer. Wire tab switching.
2. Port the **design tokens** (section 4) into your styling layer 1:1.
3. Build **Oversikt** first — it's the money screen. Four cards in a 2×2 grid,
   must fit one viewport with no scroll on a ~1440px+ display.
4. Build shared primitives (`GoalRing`, `SimpleCard`, charts, inline `NumEdit`).
5. Build `Kunder` and `Kapasitet`.
6. Replace mock data (`data.js` + the per-component seeds) with real feeds —
   the data is modelled to mimic **Tripletex** (finance) + **Copper CRM**
   (sales/customers). See section 8.

**Non-negotiables:**
- Brand green palette + **Schibsted Grotesk** typeface. Big numbers, lots of
  whitespace, minimal chrome.
- Many numbers are **inline-editable** and persist (today via `localStorage`;
  in production these become user settings / targets — persist server-side).
- Status colors are **green / yellow / red** but the Oversikt cards intentionally
  only show a *green* accent stripe + badge — yellow/red states render as a clean,
  neutral card (the CEO asked us to remove alarming red/yellow from those cards).

---

## 2. About the design files & fidelity

- **Fidelity: HIGH.** Final colors, type, spacing, charts and interactions are all
  here. Recreate pixel-close, but using your codebase's real component/styling
  patterns.
- The prototype is **React 18 loaded from CDN with in-browser Babel** and several
  `*.jsx` files that share scope by assigning to `window`. **Do not copy that
  architecture into production.** Use a normal bundler/framework (Next.js, Vite +
  React, etc.). The JSX is readable and maps cleanly to real components.
- All money is **NOK**, all copy is **Norwegian** — keep it. Numbers use Norwegian
  formatting (`312k`, `4,2 mill`, comma decimals).

---

## 3. As-built tech (what you're translating from)

| Concern | In the prototype | In production |
|---|---|---|
| Framework | React 18 UMD + Babel standalone (CDN) | Your framework (Vite/Next + React suggested) |
| Files | `CEO Dashboard.html` loads `app/*.jsx` in order | Real modules/components |
| Shared code | components exported onto `window` | normal imports |
| Styling | one `app/styles.css` with CSS custom properties | your token system / CSS-in-JS / Tailwind |
| State | `useState` + `localStorage` per widget | server-persisted settings + data fetching |
| Data | `window.SU_DATA` (mock) in `app/data.js` | Tripletex + Copper APIs |
| Font | Google Fonts "Schibsted Grotesk" | self-host or keep Google Fonts |
| Icons | hand-rolled inline SVG set (`Icon` in `components.jsx`) | reuse, or swap for your icon lib |

Load order matters in the prototype: `data.js` → `components.jsx` → `ui.jsx` →
`liquidity.jsx` → `tabs1.jsx` → `tabs2.jsx` → `customers.jsx` → `capacity.jsx`
→ `app.jsx`.

> Note: `tabs2.jsx` (Skalering, Likviditet, Varsler) and parts of `tabs1.jsx`
> (`TabInntekt`) and `liquidity.jsx` are **older screens not currently mounted**
> in `app.jsx`. Only `TabOversikt`, `TabKunder`, `TabKapasitet` are live. Treat
> the rest as reference/backlog, not scope, unless asked.

---

## 4. Design tokens (copy exactly — from `app/styles.css`)

```
/* Surfaces & neutrals (warm) */
--bg:         #F4F2EB;   /* page background */
--surface:    #FFFFFF;   /* cards */
--cream:      #EDE9DF;
--green-bg:   #E8F5D0;   /* brand light green (avatar, accents) */
--hairline:   #ECE8DC;
--hairline-2: #F2EFE6;

/* Ink (text) */
--ink:   #1B1C16;        /* primary text */
--ink-2: #5C5D52;        /* secondary */
--ink-3: #9A9B8E;        /* muted / labels */

/* Status */
--green:  #4E8A39;  --green-dot:  #6BA84F;  --green-soft:  #EAF3DC;
--yellow: #9C7411;  --yellow-dot: #E2A92F;  --yellow-soft: #F8EFD6;
--red:    #B23A2E;  --red-dot:    #D24B3B;  --red-soft:    #F8E2DD;

/* Chart greens (sequential) */
--c-light: #D8EDB6;  --c-mid: #A9D77D;  --c-deep: #6BA84F;

/* Radius */
--r: 26px;  --r-md: 20px;  --r-sm: 14px;

/* Shadows */
--shadow:    0 1px 2px rgba(27,28,22,.03), 0 10px 30px rgba(27,28,22,.04);
--shadow-sm: 0 1px 2px rgba(27,28,22,.04);
--shadow-lg: 0 18px 50px rgba(27,28,22,.14);

/* Type */
--font: "Schibsted Grotesk", system-ui, -apple-system, sans-serif;
```

**Typography:** Schibsted Grotesk, weights 400/500/600/700/800. Big stat numbers
are 800 weight, `letter-spacing: -0.04em`, tight line-height (~0.85). Section/card
labels are uppercase, ~13–15px, weight 700, `letter-spacing: 0.05em`, color
`--ink-3`. Page title (`h1`) is 30px/700/-0.03em. A `.num` class is used on
numeric text (tabular feel) — keep numbers visually aligned.

**Status color mapping helpers** (`components.jsx`):
`COLOR` → dot colors, `COLOR_TX` → text colors, `COLOR_SOFT` → soft backgrounds,
keyed by `green|yellow|red`.

---

## 5. Global layout / shell (`app/app.jsx` + `.shell`, `.topbar`, `.nav` in CSS)

- **Container:** `.shell` max-width **1640px**, centered, padding `22px 38px 36px`.
- **Top bar** (row 1): SalesUp logo (24px tall, `assets/salesup-logo.png`) ·
  centered pill **nav** (Oversikt / Kunder / Kapasitet; active = ink pill, white
  text) · right: circular search button (44px) + circular "SU" avatar (44px,
  `--green-bg` fill).
- **Contextual header** (row 2, `margin-bottom: 16px`, items bottom-aligned):
  left = `h1` tab title + optional subtitle (`--ink-2`); right = two pill buttons:
  a ghost **"Periode · Siste 3 måneder"** picker and a dark **"Eksporter"** button
  (download icon). These are visual today — wire real period filtering + export.
- **Footer:** hairline top border; left "SalesUp Norway AS · CEO Dashboard · data
  per {asOf}", right a green dot + "Live · Tripletex + Copper CRM".
- **Responsive:** below `860px`, all `.grid-resp` collapse to a single column and
  the top bar wraps. Cards use the `.card` class (white, `--r` radius,
  `--shadow`); `.card.bordered` adds a hairline + smaller shadow.

---

## 6. Screens

### 6.1 Oversikt — "Det viktigste i dag"  (THE primary screen)

Goal: everything visible in **one viewport, no scrolling** (≥1440×900). Layout is
a vertical flex (`gap: 14`) of **two rows**, each a 2-column `grid-resp`:

```
Row 1 (grid 1.25fr / 1fr):   [ 2026-mål ]   [ Omsetning & MRR ]
Row 2 (grid 1fr / 1.2fr):    [ Salg ]       [ Møter & Wins ]
```

All four use the `SimpleCard` shell (white card, padding `22px 30px`, uppercase
label header). **Important status rule:** `SimpleCard` only renders its top accent
stripe + status badge **when status === "green"**. Yellow/red cards show no stripe
and no badge (clean). Keep this behavior.

**Card A — 2026-mål** (`GoalBoard`, `app/tabs1.jsx`)
- 3 columns, each: a `GoalRing` (donut, size 86) showing percent, a short label,
  and a `current / target` line.
- **Both `current` and `target` are inline-editable** (`NumEdit`). Editing updates
  the ring + the card's overall status and persists.
- Seed goals: SEO/ADS-retainere 7/15 · Prosjekter 2026 23/60 · Mynk-kunder 0/100.
- Ring: 13px stroke, rounded cap, track `--hairline-2`, fill from `GOAL_COLORS`
  (`#4E8A39`, `#6BA84F`, `#A9D77D`), center shows `NN%` (800 weight) with a small
  `%`. Animated `stroke-dashoffset` 0.8s.

**Card B — Omsetning & MRR** (`app/tabs1.jsx`)
- 2 columns, each a `GoalRing` (size 104) + label + "{cur} av {mål} mål 2026".
- Omsetning/mnd 312k → mål 500k · MRR 290k → mål 400k. Status derived from
  progress (≥100% green, ≥85% yellow, else red) — but per the rule above only
  green shows the accent.

**Card C — Salg** (`app/tabs1.jsx`, uses `SalesFunnel`)
- Left: a vertical **funnel** SVG (trapezoids), 3 stages — Møter avholdt 48 /
  Tilbud sendt 22 / Closed 8 — colors `#6BA84F`, `#4E8A39`, `#2E5E22`; value in
  white 800 inside each; legend with color chips below.
- Right: two bold stat tiles — **Pipeline 4,2 mill** (ink/black tile) and
  **Win rate 28 %** (green `#4E8A39` tile), rounded 18px, white numerals 42px/800.

**Card D — Møter & Wins** (`MeetingsWins` + `TwoLineChart`, `app/tabs1.jsx`) — *the
most recently added card.*
- Left column: two stat tiles — **Møter** (total, e.g. 249, "avholdt i perioden",
  green chip) and **Wins** (total, e.g. 46, "{rate}% av møtene", ink chip).
- Right: **dual-line monthly chart** (`TwoLineChart`). Two series across 6 months
  (Jan–Jun): *Møter* (green `#6BA84F`, with soft area gradient + value labels above
  points) and *Wins* (ink `#1B1C16`, value labels below points). Each line uses its
  **own y-scale** so both read clearly despite different magnitudes (meetings ~30–48,
  wins ~5–11). Light horizontal gridlines, month labels on the x-axis (last month
  emphasized), dots with white stroke at each point.
- Data today is static (`MW_MONTHS`, `MW_MEET`, `MW_WIN`). In production feed from
  Copper CRM (meetings booked/held, deals won per month). Consider making these
  editable/targets like the goal numbers if the CEO wants manual override.

### 6.2 Kunder — "Customer Success"  (`app/customers.jsx`)

- Subtitle: "Hvem trives, hvem er i faresonen, hvor kan vi vokse".
- A **health scoring model**: each customer has four 1–100 sub-scores —
  **Resultat · Relasjon (trust) · Følelse (engagement) · Kommersiell** — combined
  into a 0–100 score that maps to **Rød / Gul / Grønn** health.
- Top: KPI tiles — total customers, average tenure, "Må gjøres noe" (yellow count),
  "Ikke bra" (red count). **At-risk customers surface first.**
- Filters: `Alle kunder / Ikke bra / Må gjøres noe / Good`.
- Customer rows/cards show name, type (SEO/Ads, Hosting, Utvikling, Mynk, Annet —
  each with its own chip color), market, MRR, margin, owner, tenure, last contact,
  goal, next step, note, and the score breakdown.
- **Interactions:** add a customer, delete a customer, edit fields inline; type is
  a styled `<select>`; everything persists (`localStorage` key `su_customers_v2`).
- Seed data: `SU_DATA.customers` (17 customers) + `SU_DATA.riskCustomers`.

### 6.3 Kapasitet — "Kapasitet"  (`app/capacity.jsx`)

- Subtitle: "Hvor fort kan vi vokse før noe sprekker?".
- A **capacity / scaling simulator**. Per product line, three inputs:
  `salg` = hours to **win** one customer, `drift` = hours/mnd to **run** one
  customer, `rev` = kr/mnd per active customer (in k). Plus an **efficiency**
  slider and **headcount** stepper (1–12).
- It computes available hours vs. demand and shows, per product, hours free / hours
  over capacity, with green/red verdicts (e.g. "X t ledig" / "X t for mye").
- All inputs editable via sliders/steppers; persists (`su_cap_simple_v1`).

---

## 7. Reusable components inventory

From `app/components.jsx`:
- **`Icon`** — inline SVG set (1.7 stroke, currentColor). Names used: arrow-up/down,
  trend-down, alert, pipeline, invoice, ebitda, clock, target, phone, search,
  download, calendar, mail, send, check, trash, plus, chevron-r, spark, user,
  dot-grid, refresh, x, bell. Recreate or map to your icon library.
- **`Sparkline`**, **`Bar`**, **`Delta`**, **`Dot`** — small data viz helpers.

From `app/ui.jsx`:
- **`BigStat`**, **`BarChart`**, **`StackedBarChart`**, **`Donut`** (half-gauge),
  **`GoalRow`**, **`GoalCard`**, **`SecHead`** (section header). Used by the
  legacy/backlog screens; reuse where helpful.

From `app/tabs1.jsx` (Oversikt building blocks):
- **`SimpleCard`** — the standard overview card shell (label header + green-only
  accent rule).
- **`GoalRing`** — donut percentage ring.
- **`NumEdit`** — inline-editable number (click to edit, select-on-focus, commits
  on blur, Norwegian decimal handling). This is the key editing primitive — many
  numbers across the app use it.
- **`SalesFunnel`**, **`TwoLineChart`**, **`MeetingsWins`**, **`Burnup`**.

---

## 8. Data model & integrations

- All mock data lives in **`app/data.js`** as `window.SU_DATA`. Shape (top-level
  keys): `meta`, `questions`, `northStar`, `streams`, `scale`, `liquidity`,
  `sales`, `customers`, `health`, `riskCustomers`, `goals`, `alerts`, `ai`,
  `tocSteps`. Read it for exact field names, units, and realistic values.
- Per-widget editable state is seeded in the component files (not `data.js`) and
  persisted to `localStorage`:
  | Key | Widget |
  |---|---|
  | `su_goals_v5` | 2026-mål rings |
  | `su_omsgoal_v1` | Omsetningsmål (legacy) |
  | `su_econ_v1` | Selskapsøkonomi (legacy) |
  | `su_customers_v2` | Kunder list |
  | `su_cap_simple_v1` | Kapasitet simulator |
  | `su_liq_v2` | Likviditet (legacy) |
- **Integrations to wire (replace mock):** the dashboard is designed around
  **Tripletex** (economy/finance: revenue, EBITDA, cash, invoices/liquidity) and
  **Copper CRM** (sales pipeline, leads, meetings, customers/health). The footer
  and `meta.connections` reflect this. Map: MRR/omsetning/cash/invoices → Tripletex;
  pipeline/win rate/møter/wins/leads/customer health → Copper.
- **Editable targets** (goal numbers, capacity inputs, economy assumptions) are
  CEO-set planning values — persist them as user/org settings server-side, not just
  in the browser.

---

## 9. Interactions & behavior checklist

- Tab switching (3 tabs) with a subtle content rise animation (`.tabview`, 0.45s;
  respect `prefers-reduced-motion`).
- Inline number editing everywhere `NumEdit` appears (goals, capacity, economy):
  click → select → type → blur/Enter commits → persists → dependent visuals
  (rings, statuses, charts) update.
- Kunder: filter chips, add customer, delete customer, edit fields, type select.
- Kapasitet: efficiency slider, headcount stepper, per-product input edits → live
  recompute.
- Hover states: cards with `.lift` raise slightly; nav/buttons have hover
  transitions; row hovers tint with `--hairline-2`.
- Period picker + Eksporter are stubs today — wire to real period filtering and an
  export (PDF/CSV) action.
- Charts animate width/stroke on mount (0.7–0.8s, `cubic-bezier(.2,.7,.3,1)`).

---

## 10. Files in this bundle

```
CEO Dashboard.html      — entry point (loads fonts, styles, and app/*.jsx in order)
app/styles.css          — all design tokens + global/shell/component CSS
app/data.js             — window.SU_DATA mock dataset (Tripletex + Copper shaped)
app/components.jsx       — Icon set, Sparkline, Bar, Delta, Dot, COLOR maps
app/ui.jsx              — BigStat, charts, Donut, GoalRow/Card, SecHead
app/tabs1.jsx           — Oversikt (live) + Inntekt (legacy): SimpleCard, GoalRing,
                          GoalBoard, NumEdit, SalesFunnel, TwoLineChart, MeetingsWins
app/customers.jsx       — Kunder (Customer Success) tab + scoring model
app/capacity.jsx        — Kapasitet (scaling simulator) tab
app/tabs2.jsx           — Skalering / Likviditet / Varsler (legacy, not mounted)
app/liquidity.jsx       — liquidity table/model (legacy, not mounted)
app/app.jsx             — App shell, top bar, nav, mounts the 3 live tabs
assets/salesup-logo.png — brand logo
```

Open `CEO Dashboard.html` in a browser to see the live reference (it runs straight
from the files — no build step).
