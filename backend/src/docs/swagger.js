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
