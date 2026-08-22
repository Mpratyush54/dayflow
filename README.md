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

## Roles

- **Employee**: views own profile/attendance/salary, applies for leave, check-in/out.
- **Admin / HR**: manages employees, reviews leave, views/updates payroll.
