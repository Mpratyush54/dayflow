import mongoose from 'mongoose';

// Leave request model — fields per SRS:
//   userId, type ('PAID' | 'SICK' | 'UNPAID'), startDate, endDate, remarks,
//   status ('PENDING' | 'APPROVED' | 'REJECTED'), reviewerId, reviewerComment
const leaveRequestSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['PAID', 'SICK', 'UNPAID'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerComment: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        // Populated requests carry the applicant document; bare ones the ObjectId
        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = typeof ret.userId.toJSON === 'function' ? ret.userId.toJSON() : ret.userId;
        } else {
          ret.userId = ret.userId?.toString() ?? null;
        }
        ret.reviewerId = ret.reviewerId?.toString() ?? null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Overlap checks scan a user's PENDING/APPROVED range window
leaveRequestSchema.index({ userId: 1, startDate: 1, endDate: 1 });

export default mongoose.models.LeaveRequest ??
  mongoose.model('LeaveRequest', leaveRequestSchema);
