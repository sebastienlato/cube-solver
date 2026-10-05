# Design

## The idea

A product photograph of one object. The cube is lit, colorful and three-dimensional; everything around it is a quiet studio backdrop with precise, small type. If a screen has a cube on it, the cube gets the most room and nothing competes with it.

## Colors

Six named tokens, defined once in `src/index.css` with a light and a dark value each. Components use the names, never raw values, and never `dark:` variants.

| Token    | Light     | Dark      | Used for                                                               |
| -------- | --------- | --------- | ---------------------------------------------------------------------- |
| Backdrop | `#eceef1` | `#111317` | The page: a cool studio gray, not paper or cream                       |
| Surface  | `#f8f9fa` | `#1a1d22` | The few things that sit above the page: move chips, the selected speed |
| Ink      | `#15171b` | `#f2f3f5` | Text, icons and the one primary button per screen                      |
| Graphite | `#59606a` | `#a3aab4` | Secondary text. 5.5:1 on Backdrop in light, 7.7:1 in dark              |
| Hairline | `#d3d7dd` | `#2c3139` | Rules and outlines                                                     |
| Iris     | `#6537cf` | `#b79cff` | The single accent: "you are here" and "look here"                      |

**Why Iris.** The six sticker hues sit at roughly 0° (red), 30° (orange), 55° (yellow), 140° (green) and 220° (blue), plus white. The only wide gap on the hue circle is between blue and red, so a violet near 265° is the one accent that cannot be mistaken for a sticker. It marks the current move, the current step, keyboard focus, and stickers that need a second look. It is never a button fill for a primary action and never decoration.

**Sticker colors** (`src/cube/scheme.ts`) are functional. They appear on the 3D cube, the net and the color picker, and nowhere else. Errors therefore cannot be red and success cannot be green: validation uses an icon, plain words and Ink.

The camera screen uses the dark values in both themes, because the live preview is the content.

## Type

| Face                                    | Role                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Instrument Sans** (variable, 400–700) | Everything people read as language: headings at 600 with tight tracking, body at 400, controls at 500                          |
| **Martian Mono** (variable)             | Everything that is notation or a count: moves (`R`, `U′`, `F2`), "Move 7 of 20", step numbers, speeds, face letters on the net |

Both are self-hosted from `@fontsource-variable` packages, Latin subset only.

Move notation is the most-read text in the app, so it gets the largest size on the Solution screen (56 px on a phone, 96 px on desktop) and a true prime mark (′), kerned in against the letter, instead of an apostrophe.

Scale: 12 / 14 / 15–16 (body) / 20 / 24–27 (screen titles on phones) / 36–62 (desktop titles and the Home headline) / 56–96 (current move).

## Shape and space

- Controls have a 12 px radius. Stickers on the net and swatches in the picker have a radius of 22% of their side, the proportion of a real sticker, so UI corners echo the object.
- No cards and no drop shadows around content. Sections are separated by space and hairlines. The only shadows are the cube's contact shadow and the loupe's (which floats over a photo).
- One primary action per screen, filled with Ink, at the bottom on phones where a thumb reaches it. Secondary actions are outlined; tertiary actions are underlined text.
- Buttons say what they do: "Take photo", "Looks right", "Retake", "Solve".

## Layouts

```
Home (phone)            Home (desktop)                  Solution (phone, no scroll)   Solution (desktop)
┌──────────────┐        ┌───────────────┬───────────┐   ┌──────────────┐              ┌──────────────┬─────────┐
│ Cube Solver  │        │ Solve your    │           │   │ ‹ Back  Sol. │              │              │ R′      │
│              │        │ cube from two │   cube    │   │ white on top │              │              │ Move 7… │
│    cube      │        │ photos        │           │   │              │              │    cube      │ Turn …  │
│              │        │ [Scan my cube]│           │   │    cube      │              │              │ chips   │
│ Solve your…  │        ├───────────────┴───────────┤   │              │              │              │ ⟲ ◂ ▶ ▸ │
│ [Scan my cube]│       │ 1 …      2 …      3 …     │   │ R′  Move 7…  │              └──────────────┴─────────┘
│ manual · demo │       └───────────────────────────┘   │ chips ▸▸▸    │
│ 1 … 2 … 3 …  │                                        │ ⟲ ◂ ▶ ▸ 1×  │
└──────────────┘                                        └──────────────┘

Scan (camera)           Adjust                          Review / Manual (phone)       Review / Manual (desktop)
┌──────────────┐        ┌──────────────┐                ┌──────────────┐              ┌───────────┬────────────┐
│ ‹ Back ▬ ─ ─ │        │ ‹ Back ▬ ─ ─ │                │ ‹ Back ─ ─ ▬ │              │ title     │            │
│  live video  │        │              │                │ Check colors │              │ net       │   cube     │
│  + hexagon   │        │ photo + grid │                │     net      │              │ message   │            │
│  guide       │        │ + 7 handles  │                │     cube     │              │ [Solve]   │            │
│──────────────│        │              │                │──────────────│              └───────────┴────────────┘
│ ◈ how to hold│        │ Line up grid │                │ message      │
│ [Take photo] │        │ [Retake][OK] │                │ [Solve]      │
└──────────────┘        └──────────────┘                └──────────────┘
```

## Motion

- **One orchestrated moment:** on Home, the cube turns and settles into place while the headline, text and button rise in sequence.
- **Everything else answers the user:** a layer turns when they step or play; the how-to-hold cube plays once on arrival and again when tapped; the solved cube makes one full spin; the picker and messages fade in.
- The Home cube idles with a slow spin, as specified; nothing else moves on its own.
- With `prefers-reduced-motion`, the settle-in, idle spin, pose animations and celebration are off, and a move completes at once with a brief highlight on the layer that turned.

## Principles

1. The cube is the hero; chrome is quiet.
2. Sticker colors mean stickers.
3. One accent, one job.
4. Say it plainly: errors state what happened and what to do next.
5. Color is never the only signal: every sticker has a spoken name, every state has an icon or words.

## Critique against generic defaults, and what changed

| First instinct                                           | Why it was wrong here                                                                                             | What shipped                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Violet primary buttons                                   | Reads as a stock SaaS template, and spends the accent on something that isn't a state                             | Primary buttons are Ink; Iris only marks state                          |
| Warm off-white page                                      | Cream-and-something is the commonest generated look, and warm paper shifts how the white and yellow stickers read | A cool neutral gray, like a photo sweep                                 |
| Three rounded cards with shadows for "How it works"      | Identical floating cards are filler                                                                               | A numbered list with hairlines and mono numerals: it is a real sequence |
| A soft gradient spotlight behind the cube                | Gradient washes are decoration                                                                                    | A flat backdrop; the cube's own contact shadow grounds it               |
| Small all-caps labels above headings                     | An affectation that adds nothing                                                                                  | Sentence-case labels in Graphite, or no label                           |
| Red for errors, green for "valid"                        | Both are sticker colors                                                                                           | An icon, plain text and Ink                                             |
| Color swatches next to the color words in "white on top" | A white swatch looked like an unchecked checkbox                                                                  | Bold words only; the 3D cube shows the orientation                      |
| Apostrophe for prime moves, in a monospace cell          | `R '` with a gap is hard to read at a glance                                                                      | A true prime mark, kerned in                                            |
| Arrows on buttons ("Scan my cube →")                     | Noise                                                                                                             | Plain labels                                                            |
