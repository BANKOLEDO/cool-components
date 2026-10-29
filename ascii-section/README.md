# ascii-section

A WebGL fragment-shader landing section for the fictional IMAGINERY brand. The
hero draws a half-arc point field on a single fullscreen triangle, lit in real
time, with no mesh and no sprites. The name predates the shader rewrite.

## Concept

- Brand navigation, editorial hero, and a live shader stage.
- `ShaderDome` plots one dot per grid cell from a GLSL fragment shader; the
  cursor acts as a third light and the render reports its measured frame rate.
- `KnotFigure` is a three.js point-cloud torus knot, toggled by click or Enter.
- Reduced motion freezes both figures, and small screens lower the stage density.

## Stack

React 19, TypeScript, Vite, three.js, plain CSS. Font: JetBrains Mono variable
(local package, no CDN).

## Design rules

Blue gradient page, white paper panel, hairline borders, one brand blue accent,
sentence-case type.

## Scripts

```sh
pnpm install
pnpm dev          # vite dev server
pnpm build        # tsc --noEmit + vite build
pnpm typecheck    # tsc --noEmit --pretty
pnpm preview      # serve the production build
```

## Layout

```text
src/
  App.tsx             app shell
  ascii.css           tokens, layout, stage surface, responsive styles
  main.tsx            root, font import
  components/
    AsciiSection.tsx  section composition and copy
    BrandMark.tsx     reusable brand link
    Feature.tsx       reusable feature row
    ShaderDome.tsx    WebGL half-arc shader (exports its GLSL source)
    KnotFigure.tsx    three.js point-cloud knot
```
