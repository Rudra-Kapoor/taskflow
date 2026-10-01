# TaskFlow visual design — "Studio" redesign (branch `ui-redesign`)

Goal: the product must look crafted by a design team, not generated. Editorial, calm, confident.
Think Linear's restraint + a print/editorial sensibility (paper, ink, one vermilion accent).

## Principles
1. **Typography carries the hierarchy**, not boxes, gradients or icon tiles.
2. **Flat surfaces, hairline borders.** Shadows only for floating layers (menus, modals, toasts).
3. **One accent, used sparingly** (vermilion): focus, active nav marker, links, progress, current
   selection, the logo mark. Primary buttons are **ink** (near-black; off-white in dark mode).
4. **Tighter radii** (6-10 px), real alignment grids, generous but deliberate whitespace.
5. **Numbers and keys in mono** (tabular figures). Meta text small, muted, never tiny (>= 11 px).
6. **No AI tells:** no purple/indigo gradients, no gradient text, no glow/blur blobs, no glassmorphism,
   no sparkles/magic icons, no emoji, no tinted icon squares on every card, no "rounded-2xl everything",
   no generic hero illustrations. Copy is short, human, sentence case, no exclamation marks.

## Type
Google Fonts: **Geist** (400/500/600/700) for UI, **Geist Mono** (400/500) for keys, counts and
numbers, **Instrument Serif** (400 + italic) for display headlines.

| Role | Classes |
| --- | --- |
| Page title (h1) | `font-display text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.01em] text-fg` |
| Eyebrow above titles | `font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted` |
| Section title | `text-[15px] font-semibold tracking-[-0.005em] text-fg` |
| Body | `text-sm text-fg` (14 px) |
| Meta | `text-xs text-fg-muted` |
| Keys / numbers | `font-mono tabular-nums` |
| Big stat numbers | `font-display text-[44px] leading-none` or `font-mono text-3xl` |

Tailwind: `fontFamily.sans = Geist`, `fontFamily.mono = Geist Mono`, `fontFamily.display = Instrument Serif`.

## Colour tokens (CSS variables — names unchanged, values replaced)
| Token | Light | Dark |
| --- | --- | --- |
| `canvas` | `#F5F3EE` (warm paper) | `#0F0F0E` |
| `surface` | `#FFFFFF` | `#171715` |
| `surface-muted` | `#EEEBE4` | `#1E1D1B` |
| `surface-hover` | `#E9E6DE` | `#252421` |
| `line` | `#E2DED4` | `#2B2A26` |
| `line-strong` | `#CFCABE` | `#3A3833` |
| `fg` | `#191814` (ink) | `#EEECE6` |
| `fg-muted` | `#5F5B52` | `#A7A399` |
| `fg-subtle` | `#6E6A60` | `#8E8A80` |

`brand` (vermilion) scale: 50 `#FEF2EE`, 100 `#FDE0D6`, 200 `#FBC0AD`, 300 `#F7987C`, 400 `#F4704B`,
500 `#F2542D`, 600 `#D9441F`, 700 `#B5381A`, 800 `#8F2F18`, 900 `#742916`, 950 `#3F1308`.

Status: To Do `#8A857A` (stone), In Progress `#2F6FEB` (blue), Completed `#2F8F5B` (green).
Priority: Urgent `#E5484D`, High `#E8803A`, Medium `#C9A227`, Low `#8A857A`. Use them as small dots,
glyphs or 2 px left bars — not big tinted pills. Labels are **outlined tags** (1px border, muted text).

## Shape & depth
- Tailwind radius scale is redefined: `sm 4px`, `DEFAULT/md 6px`, `lg 8px`, `xl 10px`, `2xl 12px`
  (so existing `rounded-xl` etc. tighten automatically). Avatars stay round.
- Shadows redefined: `shadow-sm` = none/hairline; popovers `0 1px 2px rgb(0 0 0/.06), 0 8px 24px rgb(0 0 0/.08)`;
  modals slightly stronger. No coloured shadows.
- Focus: `2px` vermilion ring with 2 px offset in the surface colour.
- Optional paper grain on `canvas` (SVG noise data-URI at ~3% opacity) — subtle, light mode only.

## Components (direction)
- **Buttons:** primary = ink solid (`bg-fg text-canvas`), secondary = surface + `line-strong` border,
  ghost = text only with hover surface; accent (vermilion) only for the single most important CTA on
  marketing-like screens (auth). 32-36 px tall, `rounded-md`, medium weight.
- **Inputs:** surface, `line-strong` border, 36 px, `rounded-md`, focus border ink + vermilion ring.
- **Cards:** surface, 1 px `line`, `rounded-xl` (10px), no shadow; headers separated by a hairline.
- **Badges/tags:** outlined, 20-22 px, `rounded` (4-6px), mono or small caps for counts.
- **Sidebar:** same paper colour as canvas (not a white slab), hairline right border, nav items text
  with a 2 px vermilion indicator for the active item, section labels as mono eyebrows.
- **Topbar:** thin, no blur, breadcrumbs/context on the left, actions right.
- **Board:** lanes on `surface-muted` with mono counts; cards white with hairline, key in mono,
  priority glyph, outlined labels, compact footer. Drag state: ink outline + lifted shadow.
- **Stats:** large numerals (display serif or mono) separated by vertical hairlines, not boxed tiles.
- **Empty states:** a short serif headline + one line of copy + one action; tiny line icon at most.
- **Auth:** editorial: big Instrument Serif headline ("Plan the work. Ship it together."), paper
  background, a crafted product preview built from real UI pieces in neutral tones with one vermilion
  highlight. No gradient panel.
- **Logo:** wordmark "taskflow" in Geist semibold lowercase with a small vermilion mark (e.g. a square
  with a notch / a check-slash glyph). Update favicon to match.

## Rules for the redesign agents
- Visual/UI only. Do not change behaviour, data flow, hooks, API calls, props contracts or tests.
- Keep accessibility: contrast >= 4.5:1 for text, visible focus, labels, touch targets >= 36 px.
- Keep dark mode working with the tokens above.
- Verify with screenshots (1440 light + dark, 390 mobile) and fix what looks off.
