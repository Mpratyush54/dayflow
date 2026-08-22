# REQ View — Remaining DayFlow HRMS Issues (for PR review)

This document is the **viewable requirement checklist** for the open backlog after PR #47. It is intentionally on a branch so you can open a PR, share the link, and tick items as they land.

> Base: `main` @ `e790a60` (after #44 dashboards + #47 Pratyush fixes)
> Branch: `fix/req-view` — no code changes yet, just this doc for review

## How to use this PR

1. Open the PR link below → **Files changed** → this doc
2. Review the requirements per issue
3. Check boxes in the PR description as work merges (or use this file as a living spec)

---

## Assigned to Parth (ParthKhandelwal537) — 4 open

### #31 [Enhancement] Pagination
- [ ] `GET /api/employees`, `/api/payroll/all`, `/api/leaves/all`, attendance endpoints accept `?page=&limit=&sort=` (default 10–20, max 50) → response `{ data, total, page, pages }`, keep compat when omitted
- [ ] Shared `<Pagination>` in `frontend/src/components/common/Pagination.tsx`, URL-synced `?page=` via react-router, Prev/numbers/Next, total count
- [ ] Applied on Employees, Payroll, LeaveApprovals, Attendance pages
- [ ] Swagger updated, `npm run build` passes

### #34 [Bug] Attendance date selector not opening
- [ ] Clicking date input / calendar icon on `/attendance` and `/admin/attendance` opens picker (native or custom) and refetches `AttendanceWindow`
- [ ] Keyboard accessible, `?date=YYYY-MM-DD` URL sync, future/invalid dates handled
- [ ] Scope: `frontend/src/pages/employee/Attendance.tsx`, `frontend/src/pages/admin/Attendance.tsx`

### #37 [Bug] Leave exceeds available balance
- [ ] `POST /api/leaves` validates against accrued balance (exclude REJECTED, include PENDING+APPROVED) → `400 INSUFFICIENT_BALANCE { available, requested }`
- [ ] Frontend shows remaining balance in apply form, disables submit with inline error
- [ ] Unit test for quota logic

### #40 [Bug] Employee documents / PDFs broken
- [ ] `POST /api/employees/:id/documents` multipart upload (≤5MB, PDF/JPG/PNG), MIME + size validation, stored + served via static route
- [ ] Preview via iframe/img, filename preserved, `frontend/src/pages/employee/Profile.tsx:358` Documents section
- [ ] Error toasts on failure, `npm run build` passes

---

## Assigned to Siddhant (SiddhantSSoni) — 4 open

### #32 [Enhancement] Lazy loading & code splitting
- [ ] `React.lazy` + `Suspense` for `Dashboard`, `Attendance`, `Leaves`, `Payslip`, `Admin/*`, `Profile`
- [ ] Heavy charts (`Donut`) deferred, `loading="lazy"` for avatars, reuse `useDelayedReady` skeleton
- [ ] `vite build` produces multiple chunks, main < 180kB gz, Lighthouse perf bump

### #35 [Bug] Leave date picker invisible in dark mode
- [ ] Start/end inputs on `/leaves` use tokens (`var(--color-*)`) with AA contrast in light + dark
- [ ] Calendar popup not clipped by orb/card, respects `color-scheme`
- [ ] No hardcoded colors (per `frontend/design/DESIGN.md`)

### #38 [Bug] Backdated leave allowed
- [ ] `POST /api/leaves` rejects `startDate < today` (server date, timezone-aware) for `EMPLOYEE` → `400 VALIDATION_ERROR`, HR override flag if needed
- [ ] Frontend `min={today}` + helper text, coordinates with attendance read-side derivation (#23)

### #41 [Bug] Page scrolling clipped
- [ ] `.page` / `.shell__main` `overflow-y: auto`, orb `position: fixed` behind content, no double scrollbars, 100% + 400% zoom tested
- [ ] Scope: `frontend/src/styles/base.css`, `frontend/src/styles/tokens.css`, `Sidebar.tsx`

---

## Already done (Pratyush, PR #47) — for reference

- [x] **#30** Approve/Reject inline actions — `LeaveApprovals.tsx:147` Actions column, `stopPropagation`, `colSpan` 6
- [x] **#39** Phone validation — client `PHONE_RE`, inline error, backend 400 in `employee.controller.js:9`
- [x] **#33** Responsive — sidebar hamburger <900px, 640px bento/heroActions/table breakpoints
- [x] **#36** Payslip PDF — `GET /api/payroll/slip?month=` + month picker in `Payslip.tsx:120`
- [x] **#42** Landing — `/` at `Landing.tsx`/`Landing.css` (PR #43)

---

## PR checklist (copy to description)

- [ ] Pagination (#31)
- [ ] Attendance picker (#34)
- [ ] Leave balance guard (#37)
- [ ] Document PDFs (#40)
- [ ] Lazy loading (#32)
- [ ] Dark-mode picker (#35)
- [ ] Backdate guard (#38)
- [ ] Scroll fix (#41)
- [ ] `npm run build` passes
- [ ] Swagger updated where endpoints changed

---

## Links

- Repo: https://github.com/Mpratyush54/dayflow
- Issues: #31 #32 #34 #35 #37 #38 #40 #41 (open) · #30 #33 #36 #39 #42 (closed via #47)
- Design: `frontend/design/DESIGN.md`, `frontend/design/design-tokens.yaml`, `frontend/src/styles/tokens.css`
- Branch to view: `fix/req-view` → PR `fix/req-view → main`
