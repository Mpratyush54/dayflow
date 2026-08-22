import mongoose from 'mongoose';

const salaryStructureSchema = new mongoose.Schema(
  {
    basicSalary: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    allowances: {
      type: Map,
      of: Number,
      default: {},
    },
    deductions: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    _id: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'HR', 'ADMIN'],
      default: 'EMPLOYEE',
    },

    // Personal details
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date },
    profilePicture: { type: String }, // URL or data-URI string

    // Job details
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    dateOfJoining: { type: Date },
    workLocation: { type: String, trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'RESIGNED'],
      default: 'ACTIVE',
    },

    // Payroll visibility (read-only for employees, editable by admin)
    salary: { type: salaryStructureSchema, default: () => ({}) },

    documents: { type: [documentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const USER_PUBLIC_FIELDS =
  'employeeId email role name phone address profilePicture';

export default mongoose.model('User', userSchema);
