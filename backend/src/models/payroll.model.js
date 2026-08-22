import mongoose from 'mongoose';

// Immutable salary-structure snapshot — used for the current structure and
// for the `previous` entry pushed into the revision trail on every change.
const structureSchema = new mongoose.Schema(
  {
    basicSalary: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    allowances: { type: Map, of: Number, default: {} },
    deductions: { type: Map, of: Number, default: {} },
  },
  { _id: false },
);

const revisionSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previous: { type: structureSchema, default: () => ({}) },
  },
  { _id: false },
);

const payrollSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    basicSalary: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    allowances: { type: Map, of: Number, default: {} },
    deductions: { type: Map, of: Number, default: {} },
    effectiveFrom: { type: Date, default: Date.now },
    revisions: { type: [revisionSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = typeof ret.userId.toJSON === 'function' ? ret.userId.toJSON() : ret.userId;
        } else {
          ret.userId = ret.userId?.toString() ?? null;
        }
        // Net pay is computed server-side so clients never do the math — handle Map or plain object
        const toVals = (v) => {
          if (!v) return [];
          if (v instanceof Map) return Array.from(v.values());
          if (typeof v === 'object') return Object.values(v);
          return [];
        };
        ret.totalAllowances = toVals(ret.allowances).reduce((s, v) => s + v, 0);
        ret.totalDeductions = toVals(ret.deductions).reduce((s, v) => s + v, 0);
        ret.grossPay = ret.basicSalary + ret.totalAllowances;
        ret.netPay = ret.grossPay - ret.totalDeductions;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.Payroll ?? mongoose.model('Payroll', payrollSchema);
