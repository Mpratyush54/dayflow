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
        const toPlainObject = (v) => {
          if (!v) return {};
          if (v instanceof Map) return Object.fromEntries(v);
          if (typeof v === 'object') return { ...v };
          return {};
        };
        const toVals = (v) => {
          if (!v) return [];
          if (v instanceof Map) return Array.from(v.values());
          if (typeof v === 'object') return Object.values(v);
          return [];
        };
        // Ensure allowances/deductions are plain objects for clients
        ret.allowances = toPlainObject(ret.allowances);
        ret.deductions = toPlainObject(ret.deductions);
        // Ensure revision previous Maps are plain objects so frontend diff works
        if (Array.isArray(ret.revisions)) {
          ret.revisions = ret.revisions.map((r) => {
            if (r && r.previous) {
              r.previous.allowances = toPlainObject(r.previous.allowances);
              r.previous.deductions = toPlainObject(r.previous.deductions);
            }
            if (r && r.at) r.at = r.at instanceof Date ? r.at.toISOString() : r.at;
            if (r && r.changedBy) r.changedBy = r.changedBy?.toString?.() ?? r.changedBy;
            return r;
          });
        }
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
