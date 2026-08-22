import User, { USER_PUBLIC_FIELDS } from '../models/user.model.js';

// Fields an EMPLOYEE may change on their own profile (SRS 3.3.2)
const SELF_EDITABLE_FIELDS = ['phone', 'address', 'profilePicture'];

function canViewProfile(requester, targetId) {
  return (
    requester.id === targetId ||
    requester.role === 'HR' ||
    requester.role === 'ADMIN'
  );
}

// GET /api/employees — list employees (HR/ADMIN)
export async function listEmployees(_req, res, next) {
  try {
    const employees = await User.find().select(USER_PUBLIC_FIELDS).sort({ employeeId: 1 });
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

// GET /api/employees/:id — view profile (self or HR/ADMIN)
export async function getEmployee(req, res, next) {
  try {
    const { id } = req.params;
    if (!canViewProfile(req.user, id)) {
      return res.status(403).json({ message: 'You can only view your own profile' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/employees/:id — edit profile
// Employees edit limited fields on their own profile; ADMIN edits all fields.
export async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = req.user.id === id;

    if (!isSelf && !isAdmin) {
      return res
        .status(403)
        .json({ message: 'Only admins can edit other employees' });
    }

    // Pick only allowed keys from the request body
    const allowedFields = isSelf && !isAdmin
      ? SELF_EDITABLE_FIELDS
      : [
          ...SELF_EDITABLE_FIELDS,
          'name',
          'dateOfBirth',
          'designation',
          'department',
          'employmentType',
          'dateOfJoining',
          'workLocation',
          'status',
          'salary',
          'documents',
        ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          isSelf && !isAdmin
            ? `Employees may only update: ${SELF_EDITABLE_FIELDS.join(', ')}`
            : 'No valid fields to update',
      });
    }

    const dateKeys = ['dateOfBirth', 'dateOfJoining'];
    for (const key of dateKeys) {
      if (updates[key]) {
        const d = new Date(updates[key]);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ message: `${key} must be a valid date` });
        }
        updates[key] = d;
      }
    }

    const employee = await User.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    next(err);
  }
}
