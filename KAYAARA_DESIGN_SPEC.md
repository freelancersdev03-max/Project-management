# Kayaara PMS — Design Spec (for applying to all remaining pages)

Give this file to your coding agent. It defines the exact system used in the redesigned `CompanyLevelDashboard.jsx`, which is the reference implementation. Apply the same rules to every other page. **Never change data-fetching, calculations, or business logic — presentation only.**

## 1. Three colors only

| Role | Token | Value |
|---|---|---|
| Primary / accent | `--k-blue` | `#0086FF` |
| Hover / pressed blue | `--k-blue-dark` | `#0068C9` |
| Secondary data series | `--k-blue-light` | `#66B6FF` |
| Soft blue surface / selected | `--k-blue-tint` | `#E9F4FF` |
| White | `--k-white` | `#FFFFFF` |
| Grey band | `--k-band-grey` | `#F2F3F5` |
| Borders | `--k-grey-200` | `#E4E7EB` |
| Neutral data / disabled | `--k-grey-300` | `#C9CDD3` |
| Secondary text | `--k-grey-500` | `#8A9099` |
| Body text | `--k-grey-700` | `#4B4F55` |
| Headings / darkest | `--k-ink` | `#17181A` |

**Forbidden:** orange `#f97316`, all slate-*, emerald, amber, rose, violet, indigo Tailwind colors, dark navy `#111827` headers, and any gradient except blue-on-blue. Status colors are expressed inside the blue/grey family: positive = `--k-blue`, warning/secondary = `--k-blue-light`, negative = `--k-ink`, neutral/inactive = `--k-grey-300`.

## 2. Font

Poppins everywhere (per brand identity). Weights: 600–700 headings, 500–600 labels/buttons, 400 body. Remove Sora/Manrope imports.

## 3. The band pattern (core layout rule)

Every page body is divided into full-width horizontal sections that alternate background:

```
BAND 1  WHITE  → page header (back button, title, actions)
BAND 2  GREY   → primary content (KPI cards, filters…)
BAND 3  WHITE  → next section (charts, forms…)
BAND 4  GREY   → next section (tables, lists…)
…continue alternating…
LAST    WHITE  → footer strip
```

- Cards on a GREY band are WHITE (`.k-card`).
- Cards on a WHITE band are GREY (`.k-card-grey`).
- Bands use `.k-band-pad` for padding. No boxed page containers, no shadowed headers — the alternation itself separates sections.
- Wrapping sections in `.k-bands` alternates automatically via nth-child; or set `.k-band-white` / `.k-band-grey` explicitly (explicit is safer when sections are conditional).

## 4. Reusable components (already built)

- `components/kayaara/AnimatedNumber.jsx` — eased count-up for every KPI/statistic.
- `components/kayaara/KpiCard.jsx` — standard metric card (label, icon chip in blue tint, animated number; `accent` prop makes the number blue).
- `components/kayaara/Band.jsx` — exports `Bands`, `Band`, `PageHeader` for quick page assembly.

## 5. Animation rules (Framer Motion is installed)

- Page header: fade + slide down, 0.5s, ease `[0.22,1,0.36,1]`.
- Bands: fade-up on scroll into view (`whileInView`, `once: true`).
- Card grids: stagger children by 0.05–0.07s (`index * 0.07` delay).
- All numbers: `AnimatedNumber` count-up (~1.1s ease-out cubic).
- Recharts: `animationDuration={1200}`, `animationEasing="ease-out"`, `animationBegin={200}`.
- Table rows: stagger fade-up by 0.05s per row; score cells get an animated blue progress bar growing from 0 width.
- Hover: cards lift `-3px` with blue border + soft blue glow (built into `.k-card`); buttons lift 1px and darken.
- Loading: `.k-skeleton` shimmer blocks matching final layout.
- Everything respects `prefers-reduced-motion` (handled in kayaara.css and AnimatedNumber).

## 6. Component recipes

- **Primary button:** `.k-btn-primary` (blue). One per view section.
- **Secondary button:** `.k-btn-ghost` (white/grey, blue on hover).
- **Section title:** `.k-section-title` (auto blue underline that draws in) with optional `.k-eyebrow` above.
- **Active/selected states:** `--k-blue-tint` background + `--k-blue` text (see client filter and top-performer row in reference file).
- **Badges/pills:** blue tint bg + blue text, or solid blue + white for emphasis.
- **Tables:** grey header row on white card, hairline `--k-grey-100` row borders, first-place row highlighted with `--k-blue-tint`.
- **Modals:** white, 1px grey border, rounded-3xl, ink/45% blurred backdrop, scale+fade entrance.
- **Scrollbars:** `.k-scroll`.

## 7. Page-by-page order of application

1. `pages/Dashboard/EmployeeDashboard.jsx` (largest; do band-by-band)
2. `pages/Dashboard/RepeatableTaskPage.jsx`
3. `components/Sidebar.jsx` — white bg, grey hairline right border, active item = blue-tint bg + blue text + 3px blue left indicator that slides between items (Framer `layoutId`), Kayaara logo at top
4. `components/Navbar.jsx` + landing (`Home`, `Hero`, `Features`, `SocialProof`, `Footer`) — remove black/blue gradient pill and dark gradients; white navbar, blue CTA, alternating bands down the landing page
5. All profile pages, DDTME/DDFMS, VisitAgenda, RC7, MCTC, Achievement, WeeklyScore, Client/Staff management
6. `LoginPage.jsx` — split layout: white form panel / grey brand panel with floating (k-float) logo mark

## 8. Definition of done per page

- No forbidden colors remain (grep for `f97316`, `slate-`, `emerald`, `amber-`, `rose-`, `violet`, `#111827`).
- Page reads as alternating white/grey bands top to bottom.
- Every statistic counts up; every list/table staggers in; hover states are blue.
- Logic, props, API calls, and routes byte-identical to before.
