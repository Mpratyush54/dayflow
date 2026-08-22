# DayFlow — HRMS

A Human Resource Management System covering authentication, role-based access
(Employee vs Admin/HR), employee profiles, attendance, leave management, and
payroll visibility.

## Structure

```
dayflow/
├── backend/            # Node.js + Express API
│   └── src/
│       ├── config/     # DB connection, env
│       ├── controllers/# Request handlers (auth, employees, attendance, leaves, payroll)
│       ├── middleware/ # Auth (JWT), role checks, error handler
│       ├── models/     # Data models (user, attendance, leave)
│       ├── routes/     # Express routers per resource
│       ├── utils/
│       ├── app.js      # Express app setup
│       └── server.js   # Entry point
└── frontend/           # React 19 + Vite + TypeScript
    └── src/
        ├── api/        # HTTP client & API wrappers
        ├── components/ # Shared components (common/, layout/)
        ├── context/    # React contexts (e.g. auth)
        ├── hooks/      # Custom hooks
        ├── pages/      # Screens: auth/, employee/, admin/
        ├── types/      # Shared TypeScript types
        └── utils/
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
