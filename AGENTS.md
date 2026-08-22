# Agent Guide — DayFlow HRMS

Repo layout: `backend/` (Node + Express + MongoDB API), `frontend/` (React 19 + Vite + TS).

## Frontend design system (MANDATORY)

- Source of truth: `frontend/design/design-tokens.yaml`
- Usage guide: `frontend/design/DESIGN.md`
- Tokens are exported as CSS variables in `frontend/src/styles/tokens.css` — use `var(--color-*)`, `var(--type-*)`, `var(--radius-*)`, `var(--space-*)` only. Never hardcode colors, fonts, radii, or spacing.
- Reuse shared components in `frontend/src/components/common/` (`Button`, `Input`, `Card`, `Badge`).
- Brand: off-white canvas `#f5f5f5`, warm near-black ink `#292524`, Waldenburg Light display / Inter body, pastel gradient orbs as the only color moments. No neon or saturated accent colors.

## Frontend rules (MANDATORY)

- **URL-based routing**: every screen must have its own URL via `react-router-dom` (already installed). Never switch screens with component state alone. Existing routes: `/signin`, `/signup`, `/dashboard` (employee), `/admin`. Add new pages as new routes and navigate with `<Link>` / `useNavigate`.
- **Animation**: pages and cards must animate in. Use the shared keyframes in `src/styles/base.css` (`fade-up`, `fade-in`, `orb-drift`) via the `.animate-in` class or `animation:` declarations; stagger cards with `animation-delay`. The gradient orb always drifts (`orb-drift`). Respect `prefers-reduced-motion` (already handled globally in `base.css`).

## Conventions

- Backend: ESM (`"type": "module"`), routes in `src/routes/`, handlers in `src/controllers/`, keep Swagger spec (`src/docs/swagger.js`) updated when endpoints change.
- Frontend: TypeScript, pages in `src/pages/{auth,employee,admin}/`, API calls via `src/api/client.ts`.
- `npm run build` in `frontend/` must pass before finishing any frontend change.
