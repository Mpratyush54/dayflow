export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DayFlow HRMS API',
    version: '0.1.0',
    description: 'API for the DayFlow Human Resource Management System',
  },
  servers: [{ url: 'http://localhost:5000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'dayflow_rt',
        description: 'httpOnly refresh token cookie set by /api/auth/signin',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: { description: 'Service is up' },
        },
      },
    },
    '/api/auth/signup': {
      post: {
        summary: 'Register a new user (Employee or HR)',
        description:
          'Creates an unverified account and issues a one-time email verification token ' +
          '(valid 24h). Without SMTP configured, the verification link is logged and returned outside production.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'email', 'password', 'role'],
                properties: {
                  employeeId: { type: 'string', example: 'EMP-0042' },
                  email: { type: 'string', format: 'email' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Min 8 chars with upper, lower, digit and special character',
                  },
                  role: { type: 'string', enum: ['EMPLOYEE', 'HR'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User created; verification required before signing in',
          },
          400: { description: 'Invalid input (password rules, email format)' },
          409: { description: 'Email or Employee ID already registered' },
        },
      },
    },
    '/api/auth/verify-email': {
      get: {
        summary: 'Verify email with the one-time token',
        parameters: [
          { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Email verified; the user can now sign in' },
          400: { description: 'Missing, invalid or expired token' },
        },
      },
    },
    '/api/auth/signin': {
      post: {
        summary: 'Sign in with email and password',
        description:
          'Returns a short-lived access token (JWT, 15 min) and sets the refresh token ' +
          'as an httpOnly cookie (7 days, path /api/auth).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Signed in — accessToken in body, refresh token in httpOnly cookie' },
          401: { description: 'Invalid email or password' },
          403: { description: 'Email not verified' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Exchange the refresh cookie for a new access token',
        security: [{ refreshCookie: [] }],
        description:
          'Rotates the refresh token: the presented cookie is revoked and a new one is set.',
        responses: {
          200: { description: 'New accessToken; new refresh cookie set' },
          401: { description: 'Missing, invalid or revoked refresh token' },
        },
      },
    },
    '/api/auth/signout': {
      post: {
        summary: 'Sign out — revoke the refresh token and clear the cookie',
        security: [{ refreshCookie: [] }],
        responses: {
          200: { description: 'Signed out' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated user' },
          401: { description: 'Missing, invalid or expired access token' },
        },
      },
    },
    '/api/employees': {
      get: {
        summary: 'List employees (admin/HR only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Employee list' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/employees/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      get: {
        summary: 'View an employee profile (self or admin/HR only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Employee profile incl. job details, salary, documents' },
          403: { description: 'Forbidden' },
          404: { description: 'Employee not found' },
        },
      },
      patch: {
        summary:
          'Edit an employee profile (employees: phone/address/profilePicture only; admins: all fields)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  profilePicture: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date' },
                  designation: { type: 'string' },
                  department: { type: 'string' },
                  employmentType: {
                    type: 'string',
                    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
                  },
                  dateOfJoining: { type: 'string', format: 'date' },
                  workLocation: { type: 'string' },
                  status: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'RESIGNED'] },
                  salary: {
                    type: 'object',
                    description: 'Admin only — full salary structure',
                    properties: {
                      basicSalary: { type: 'number' },
                      currency: { type: 'string' },
                      allowances: { type: 'object', additionalProperties: { type: 'number' } },
                      deductions: { type: 'object', additionalProperties: { type: 'number' } },
                    },
                  },
                  documents: {
                    type: 'array',
                    description: 'Admin only — replaces the document list',
                    items: {
                      type: 'object',
                      required: ['name', 'url'],
                      properties: {
                        name: { type: 'string' },
                        url: { type: 'string' },
                        uploadedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated employee profile' },
          400: { description: 'No valid fields to update' },
          403: { description: 'Forbidden — field not editable by this role' },
          404: { description: 'Employee not found' },
        },
      },
    },
    '/api/attendance': {
      get: {
        summary: 'Own attendance (daily/weekly view + summary); approved-leave days derive LEAVE',
        description:
          'Returns one entry per day for the requested window (gaps included as absent, ' +
          'days inside approved leave as LEAVE) plus a summary: workdays, present, half-days, ' +
          'leave, absent, total hours, attendance rate.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', default: 7, minimum: 1, maximum: 31 },
            description: 'Window length ending today (1 = daily view, 7 = weekly)',
          },
        ],
        responses: {
          200: { description: 'Day list + summary' },
        },
      },
    },
    '/api/attendance/team': {
      get: {
        summary: "Everyone's attendance for a date (HR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'YYYY-MM-DD (defaults to today)',
          },
        ],
        responses: {
          200: { description: 'Per-employee rows: check-in/out, status, worked hours' },
          403: { description: 'Forbidden (EMPLOYEE role)' },
        },
      },
    },
    '/api/attendance/checkin': {
      post: {
        summary: 'Check in for today',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Today's record created with checkIn timestamp" },
          409: { description: 'Already checked in today' },
        },
      },
    },
    '/api/attendance/checkout': {
      post: {
        summary: 'Check out for today (>= 4 worked hours = PRESENT, else HALF_DAY)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Record closed with checkOut timestamp and final status' },
          409: { description: 'Not checked in, or already checked out' },
        },
      },
    },
    '/api/leaves': {
      get: {
        summary: 'Own leave requests',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Leave requests' },
        },
      },
      post: {
        summary: 'Apply for leave',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'startDate', 'endDate'],
                properties: {
                  type: { type: 'string', enum: ['PAID', 'SICK', 'UNPAID'] },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  remarks: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Leave request created (PENDING)' },
          400: { description: 'Invalid type or date range (endDate ≥ startDate)' },
          409: { description: 'Overlaps an existing pending/approved leave' },
        },
      },
    },
    '/api/leaves/all': {
      get: {
        summary: 'All leave requests, newest first (HR/ADMIN only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          },
        ],
        responses: {
          200: { description: 'Leave requests with applicant info' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/leaves/{id}/review': {
      patch: {
        summary: 'Approve or reject a leave request (HR/ADMIN only, while PENDING)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  comment: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Leave request reviewed' },
          400: { description: 'Invalid review status' },
          403: { description: 'Forbidden — HR/ADMIN only, cannot review own request' },
          404: { description: 'Leave request not found' },
          409: { description: 'Already reviewed' },
        },
      },
    },
    '/api/payroll': {
      get: {
        summary: 'Own salary structure (read-only; net pay computed server-side)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Payroll record with totals + net pay' },
          404: { description: 'No payroll record yet' },
        },
      },
    },
    '/api/payroll/all': {
      get: {
        summary: 'All salary structures, employee populated (HR/ADMIN only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Payroll records' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/payroll/{userId}': {
      patch: {
        summary: 'Update an employee salary structure (HR/ADMIN only, upsert with revision trail)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  basicSalary: { type: 'number', minimum: 0 },
                  currency: { type: 'string' },
                  allowances: {
                    type: 'object',
                    description: 'name → non-negative amount',
                    additionalProperties: { type: 'number' },
                  },
                  deductions: {
                    type: 'object',
                    description: 'name → non-negative amount',
                    additionalProperties: { type: 'number' },
                  },
                  effectiveFrom: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated payroll record (previous structure archived in revisions)' },
          400: { description: 'Invalid amounts' },
          403: { description: 'Forbidden — HR/ADMIN only' },
          404: { description: 'Employee not found' },
        },
      },
    },
  },
};
