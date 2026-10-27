# cool-components

A working lab of single-purpose UI components. Each folder is a standalone
Vite + React + TypeScript project with its own demo, interactions and build.
Shared design law: flat everything... no shadows, no gradients, no glows;
paper and ink surfaces with one loud accent; states stay bold; no filler copy.

## The components

| Project         | What it is                                                            |
| --------------- | --------------------------------------------------------------------- |
| `otp-input`     | One-time code as six combination-lock wheels. Digits roll, the gate points, wrong codes rattle and eject, success clicks forward wheel by wheel. |
| `command-palette` | Palette-as-app on black. Fuzzy match with per-character lighting, a live preview pane, Recent re-runs and a sleep-state dock. |

## Running a project

```sh
cd <project>
pnpm install
pnpm dev
```

Every project exposes `dev`, `build` (typecheck + vite), `typecheck` and
`preview`.

## Conventions

- pnpm only; never fetch fonts at runtime (packages or system stacks).
- Playwright audits drive each demo end-to-end before it ships: type, commit,
  scrub, restart, reduced motion, and a clean console.
- Conventional commits, one file or one intent per commit.
