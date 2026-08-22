import mongoose from 'mongoose';

// One record per user per local calendar day (YYYY-MM-DD).
// status is set at checkout: >= 4 worked hours = PRESENT, else HALF_DAY.
// ABSENT/LEAVE are derived at read time (no record for a workday).
const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    status: { type: String, enum: ['PRESENT', 'HALF_DAY'], default: 'PRESENT' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        ret.workedHours = workedHours(ret.checkIn, ret.checkOut);
        return ret;
      },
    },
  },
);

function workedHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.round(((checkOut - checkIn) / 3600000) * 10) / 10;
}

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance =
  mongoose.models.Attendance ?? mongoose.model('Attendance', attendanceSchema);
export default Attendance;
