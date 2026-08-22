import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
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
    name: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
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

const User = mongoose.models.User ?? mongoose.model('User', userSchema);

// Fields safe to expose on employee listings (sensitive fields are excluded by schema + toJSON)
export const USER_PUBLIC_FIELDS = 'employeeId email role name isVerified createdAt';

export default User;
