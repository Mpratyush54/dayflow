# DayFlow Design System

> **Source of truth:** [`design-tokens.yaml`](./design-tokens.yaml)
> Every UI change MUST use the tokens exported in `src/styles/tokens.css` — never hardcode colors, sizes, or font stacks.

## How to use this (for humans and AI coding agents)

1. Read `design-tokens.yaml` for the full token vocabulary (colors, typography, spacing, radii, component recipes).
2. In code, reference tokens only via the CSS variables defined in `src/styles/tokens.css`
   (e.g. `color: var(--color-ink)`, `font: var(--type-display-lg)`, `border-radius: var(--radius-xl)`).
3. Use the shared components in `src/components/common/` (`Button`, `Input`, `Card`, `Badge`) instead of re-styling from scratch.
4. If a token is missing, add it to `design-tokens.yaml` **and** `tokens.css` in the same change.

## Brand in one paragraph

Off-white canvas (`#f5f5f5`) with warm near-black ink (`#292524`). Display type is
**Waldenburg Light (300)** — quiet and editorial; **Inter** carries everything else.
The only "color" moments are soft pastel gradient orbs (mint → peach → lavender → sky)
used atmospherically. CTAs are a near-black pill (primary) and a transparent outline
pill (secondary). No neon accents, no saturated brand colors.

## Fonts

- **Waldenburg** (display, weight 300): self-host or substitute the serif fallback stack
  (`--font-display`). License: check before committing font files.
- **Inter** (body/UI): loaded via Google Fonts in `index.html`.

## Component recipes (from tokens)

| Component | Recipe |
|---|---|
| Button primary | ink pill, 40px tall, `padding: 10px 20px`, white text, darkens to `#0c0a09` on active |
| Button outline | transparent pill, 1px hairline border, ink text |
| Text input | white surface, radius 8px, `padding: 12px 16px`, 44px tall |
| Card | white surface, radius 16px, `padding: 24–32px`, hairline border |
| Feature card | white, radius 12px, `title-md` heading |
| Badge pill | `surface-strong` bg, uppercase 12px/600 caption, pill radius |
| Top nav | canvas bg, 64px tall, `nav-link` type |
| Gradient orb | radial-gradient(s) of `--gradient-*` colors, heavy blur, absolutely positioned, behind content |
