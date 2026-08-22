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
    '/api/attendance': {
      get: {
        summary: 'Own attendance (daily/weekly)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Attendance records' },
        },
      },
    },
    '/api/attendance/checkin': {
      post: {
        summary: 'Check in for today',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Checked in' },
        },
      },
    },
    '/api/attendance/checkout': {
      post: {
        summary: 'Check out for today',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Checked out' },
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
                  remarks: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Leave request created (PENDING)' },
        },
      },
    },
    '/api/leaves/{id}/review': {
      patch: {
        summary: 'Approve or reject a leave request (admin/HR only)',
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
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Leave request reviewed' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/payroll': {
      get: {
        summary: 'Own salary details (read-only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Payroll details' },
        },
      },
    },
  },
};
