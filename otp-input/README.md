# otp-input

A one-time-code field built as six combination-lock wheels. Every interaction is
wheel rotation: digits roll in on a spring, row after row, and the state of the
code is painted straight onto the hardware.

## Concept

- Six vertical strip of tiles: spacer, 0 and 9, spacer. The wheel rests on the
  blank tile, so every keystroke is a real roll, never a text swap.
- The gate line under each wheel is the pointer. Filled wheels darken their gate,
  the active wheel blinks a dash, and state repaints are full-bleed, never quiet.
- Preview chrome is a phone mockup: status bar, dynamic island, app bar, home
  bar. Small screens drop the chrome and go full bleed.

## Interaction map

Input then result:

| State     | What happens                                                          |
| --------- | --------------------------------------------------------------------- |
| typing    | spring roll per digit, dash-pulse on the active wheel                 |
| verifying | wheels dim while the check runs (520 ms guard)                        |
| success   | every wheel clicks forward in a cascade, then holds green             |
| error     | red repaint, rattle keyframes, digits eject back to the blank tile    |
| locked    | masked inputs, countdown chip until the 30 s lock expires             |

Sessions allow 3 mistakes, then lock for 30 seconds. Backspace last-digits, full
paste as a fill, and a resend cooldown of 60 s with a live countdown track.

## Demo controls

Press the controls button in the app bar:

- the valid key is `123456`
- toggle reduced motion (keyboard and wheel springs drop to instant)
- reset the session to a clean lock

## Stack

React 19, TypeScript, Vite, Framer Motion, Tailwind v4 for the engine tokens,
plain CSS for the wheel surfaces. Fonts: Manrope variable, JetBrains Mono
variable (local packages, no CDN).

## Design rules

Flat only: zero shadows, zero gradients, zero glows. Everything is paper, ink,
hairlines and one ember accent. State colors are loud on purpose; quiet states
are reserved for motion, not paint.

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
  App.tsx               phone shell, app bar, controls sheet, motion config
  commands -> hooks/useOTPState.ts   attempt, resend, error-settle and lock timers
  components/
    OTPInput.tsx        capture input, wheels, status line, resend dock, lock row
    Slit.tsx            the rolling strip behind each wheel gate
    ResendTimer.tsx     cooldown countdown and resend affordance
    StatusLine.tsx      tone-aware status copy and orbit indicator
  styles/otp.css        tokens, chrome, wheels, roles, responsivity, a11y
```

## Input element

`OTPInput` exposes a transparent `otp-capture` text input (z-10, full cover,
mapped clicks land on the right wheel) that stays screen-reader reachable; the
visible wheels are inert spans with `aria-live` from the status line.
