# DayFlow — HRMS

A Human Resource Management System covering authentication, role-based access
(Employee vs Admin/HR), employee profiles, attendance, leave management, and
payroll visibility.

## Structure

```
dayflow/
├── backend/                 # Node.js + Express API
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js           # Express app setup
│       ├── server.js        # Entry point
│       ├── config/          # DB + env config
│       │   ├── db.js
│       │   └── env.js
│       ├── controllers/     # Request handlers
│       │   ├── analytics.controller.js
│       │   ├── attendance.controller.js
│       │   ├── auth.controller.js
│       │   ├── employee.controller.js
│       │   ├── leave.controller.js
│       │   └── payroll.controller.js
│       ├── docs/
│       │   └── swagger.js   # Swagger/OpenAPI docs
│       ├── middleware/
│       │   ├── auth.middleware.js  # JWT + role checks
│       │   └── error.middleware.js
│       ├── models/
│       │   ├── attendance.model.js
│       │   ├── leave.model.js
│       │   ├── payroll.model.js
│       │   ├── refreshToken.model.js
│       │   └── user.model.js
│       ├── routes/
│       │   ├── index.js     # Route aggregator
│       │   ├── analytics.routes.js
│       │   ├── attendance.routes.js
│       │   ├── auth.routes.js
│       │   ├── employee.routes.js
│       │   ├── leave.routes.js
│       │   └── payroll.routes.js
│       ├── services/
│       │   └── attendance.service.js
│       └── utils/
│           ├── employeeId.js
│           ├── httpError.js
│           ├── mailer.js
│           ├── pagination.js
│           ├── password.js
│           ├── seed.js
│           ├── tokens.js
│           └── validation.js
│
├── frontend/                # React 19 + Vite + TypeScript
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── public/
│   │   └── favicon.svg
│   ├── design/              # Design system
│   │   ├── DESIGN.md
│   │   └── design-tokens.yaml
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/             # HTTP client & wrappers
│       │   ├── client.ts
│       │   ├── analytics.ts
│       │   ├── attendance.ts
│       │   ├── employees.ts
│       │   ├── leaves.ts
│       │   └── payroll.ts
│       ├── components/
│       │   ├── ProtectedRoute.tsx
│       │   ├── charts/
│       │   │   ├── AreaChart.tsx
│       │   │   ├── Donut.tsx
│       │   │   ├── Heatmap.tsx
│       │   │   ├── Sparkline.tsx
│       │   │   └── charts.css
│       │   ├── common/      # Shared UI kit
│       │   │   ├── AvatarStack.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Button.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── CommandPalette.tsx
│       │   │   ├── CountdownRing.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Pagination.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── components.css
│       │   └── layout/
│       │       ├── AppLayout.tsx
│       │       ├── AuthLayout.tsx
│       │       ├── Sidebar.tsx
│       │       └── layout.css
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   ├── ThemeContext.tsx
│       │   ├── auth-context.ts
│       │   └── theme-context.ts
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useCountUp.ts
│       │   ├── useDelayedReady.ts
│       │   └── useToasts.ts
│       ├── pages/
│       │   ├── Landing.tsx
│       │   ├── auth/
│       │   │   ├── SignIn.tsx
│       │   │   ├── VerifyEmail.tsx
│       │   │   └── ChangePassword.tsx
│       │   ├── employee/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Attendance.tsx
│       │   │   ├── Leaves.tsx
│       │   │   ├── Payslip.tsx
│       │   │   └── Profile.tsx
│       │   └── admin/
│       │       ├── Dashboard.tsx
│       │       ├── Employees.tsx
│       │       ├── Attendance.tsx
│       │       ├── LeaveApprovals.tsx
│       │       ├── Payroll.tsx
│       │       └── Reports.tsx
│       ├── styles/
│       │   ├── base.css
│       │   ├── tokens.css
│       │   └── dashboards.css
│       ├── types/
│       │   └── index.ts
│       └── utils/
│
├── docs/
│   └── REQ_VIEW.md
├── AGENTS.md
├── README.md
└── .gitignore
```

## Getting started

```bash
# Backend
cd backend
cp .env.example .env   # fill in DB + JWT values
npm install
npm run dev            # http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

### Demo data

With MongoDB running and `DATABASE_URL` set in `backend/.env`:

```bash
cd backend
npm run seed
```

This creates **9 demo accounts** (7 employees + HR + admin) with ~5 weeks of attendance, leave requests (pending/approved/rejected), and payroll structures. Safe to re-run — it refreshes demo attendance, leaves, and payroll each time.

| Role | Email | Password |
|------|-------|----------|
| **Demo employee** | `demo@dayflow.dev` | `Dayflow!2026` |
| HR | `meera@dayflow.dev` | `Dayflow!2026` |
| Admin | `admin@dayflow.dev` | `Dayflow!2026` |

Use **`demo@dayflow.dev`** to apply leave — no seed leaves block this account, and re-running `npm run seed` preserves leave requests you create as this user.

## Roles

- **Employee**: views own profile/attendance/salary, applies for leave, check-in/out.
- **Admin / HR**: manages employees, reviews leave, views/updates payroll.

## Setup — PWA offline queue & SSE

### PWA offline check-in queue (employee)
- **Queue key**: `localStorage["dayflow:attendance:queue"]` stores `{type: "checkin"|"checkout", ts: number}[]`.
- **Offline detection**: `frontend/src/pages/employee/Attendance.tsx` checks `!navigator.onLine` before `checkIn`/`checkOut`. If offline, the action is enqueued and a toast `Queued offline` is shown.
- **Sync on reconnect**: a `window.addEventListener('online', flush)` handler flushes the queue in order via `POST /api/attendance/checkin` / `checkout`, then reloads the 7-day window and shows `Synced N queued …`.
- **Service worker**: `frontend/public/sw.js` is registered by `frontend/src/pwa.ts` (`registerSW()` called from `main.tsx`). It network-first caches navigations and intercepts `POST /attendance/checkin|checkout` when offline, returning `202 {queued:true}` so the UI does not hard-fail. The queue itself lives in `localStorage` (SW cannot access it), so the main-thread queue is the source of truth.
- **Manual test**: open `/attendance`, go offline in DevTools (Offline checkbox), click Check in → toast `Queued offline` → go online → queue flushes.

### SSE live presence (admin)
- **Endpoint**: `GET /api/attendance/stream` (HR/ADMIN only, `text/event-stream`). Query param `?token=<accessToken>` is accepted because `EventSource` cannot set `Authorization` headers; `requireAuth` also checks `req.query.token`.
- **Payload**: every 5 s (and immediately after any `checkin`/`checkout`) the server sends `data: {"stillIn": <number>}` where `stillIn` is `count({date: today, checkIn != null, checkOut == null})`.
- **Frontend**: `frontend/src/pages/admin/Attendance.tsx` opens `new EventSource(getAttendanceStreamUrl())`, updates `liveStillIn` on `onmessage`, and renders `stillIn = liveStillIn ?? rows.filter(stillIn).length` in the Still in card/sparkline. Keep-alive comments `: keepalive` every 15 s prevent proxy buffering (`X-Accel-Buffering: no`).
- **Fallback**: if `EventSource` is unavailable or `onerror` fires (401/ network), the stream is closed and the page falls back to polling `GET /api/attendance/team` every 5 s. Historical dates (`date !== today`) skip SSE entirely.
- **Docs**: Swagger spec in `backend/src/docs/swagger.js` documents `/api/attendance/stream`.
