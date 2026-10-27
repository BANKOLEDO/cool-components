# command-palette (Fuzzy Ghost)

A command palette that behaves like an app, not a dropdown. It owns the whole
screen: search, kind tabs, results with live per-character lighting, a preview
pane that shows exactly what running an item will do, and a recent strip you
can re-run from.

## Concept

- Search is fuzzy and honest about it: matched characters light one by one,
  left to right, in ember... not bold, real color spans.
- Every row animates in with a 12 ms stagger, and the selection is a measured
  pill that morphs between rows instead of hard-swapping.
- The right pane previews the selected item before you commit: files show an
  actual code card, places show an arrowed route ending at your destination,
  actions show a numbered timeline of what happens, snippets show what will
  be pasted.
- No results isn't a dead end. You get the three closest finds by edit
  distance, each tagged "off by N", and you can run them anyway.

## Interaction map

| Keys                       | Effect                                    |
| -------------------------- | ----------------------------------------- |
| Ctrl/Cmd+K                 | toggle the palette (opens on load)        |
| Up / Down                  | move selection, pill rides the rows       |
| Enter                      | run the selected command                  |
| Esc                        | close to the sleep-state dock             |
| click a Recent chip        | run that command again                    |

Hover selects too, so mouse users get the same preview-first flow.
## States

- Idle: all commands, count chip reads "22 of 22 commands".
- Typing: matches light up per-character; the chip keeps a live "N of M".
- Filtered: kind tabs (Everything / Places / Actions / Files / Snippets) show
  live counts; the Everything pill drops to exact matches only.
- No match: dashed ghost rows with distance pills; label "No match. The
  closest finds:".
- Closed: a sleep-state dock console with last opened, a huge faint ⌘K
  watermark, and one button.

## Design rules

Flat black instrument: zero shadows, zero gradients, zero glows. Surface on
field, hairline dividers, ember accent, mono micro-labels. The syntax copy is
plain sentences (no dashboard-speak), and the demo data is a real-feeling
command set: deploys, typechecks, billing, files, snippets.

## Stack

React 19, TypeScript, Vite, Framer Motion. System font stacks only (no font
packages). One CSS file, one component file, one command registry.

## Scripts

```sh
pnpm install
pnpm dev          # vite dev server
pnpm build        # tsc --noEmit + vite build
pnpm typecheck    # tsc --noEmit --pretty
pnpm preview      # serve the production build
```

## Layout

```
src/
  App.tsx                     hotkey, activity log, sleep-state dock
  commands.ts                 the 22-command demo registry with typed previews
  palette/
    CommandPalette.tsx        the whole palette: head, tabs, list, pill, preview
    fuzzy.ts                  subsequence scorer (boundary + camel bonuses) and edit distance
  styles/palette.css          tokens, card grid, rows, pill, preview variants, dock
```

## Accessibility notes

The list is a real listbox with aria-selected rows, the preview position is
mirrored in a title attribute and the match q chip exposes `no matches` when
empty. Reduced motion collapses all animations to instant. Palette focus goes
straight to the input on mount.
