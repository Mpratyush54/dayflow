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
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'email', 'password', 'role'],
                properties: {
                  employeeId: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['EMPLOYEE', 'HR'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
          400: { description: 'Invalid input' },
        },
      },
    },
    '/api/auth/signin': {
      post: {
        summary: 'Sign in with email and password',
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
          200: { description: 'Signed in, returns JWT' },
          401: { description: 'Invalid credentials' },
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
