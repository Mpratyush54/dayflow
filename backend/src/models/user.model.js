import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

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
    // Auth (SRS 3.1)
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'HR', 'ADMIN'],
      default: 'EMPLOYEE',
    },
    isVerified: { type: Boolean, default: false },
    // Set when HR creates the account with a system-generated password;
    // cleared on first successful password change
    mustChangePassword: { type: Boolean, default: false, select: true },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },

    // Personal details (SRS 3.3)
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date },
    profilePicture: { type: String }, // URL or data-URI string
    nationality: { type: String, trim: true },
    personalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator(value) {
          return !value || /^\S+@\S+\.\S+$/.test(value);
        },
        message: 'Invalid personal email address',
      },
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY', ''],
      default: '',
    },
    maritalStatus: {
      type: String,
      enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER', ''],
      default: '',
    },

    // Bank & statutory (private info)
    bankAccountNo: { type: String, trim: true },
    bankName: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    uan: { type: String, trim: true },
    empCode: { type: String, trim: true },

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
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.verificationTokenHash;
        delete ret.verificationTokenExpires;
        return ret;
      },
    },
  },
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Projection for HR/ADMIN employee lists — no auth-internal or salary fields
export const USER_PUBLIC_FIELDS =
  'employeeId email role name phone address profilePicture';

const User = mongoose.models.User ?? mongoose.model('User', userSchema);
export default User;
