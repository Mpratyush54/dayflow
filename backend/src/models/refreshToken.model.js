import mongoose from 'mongoose';

// Refresh tokens are stored hashed; the raw value only ever lives in the
// httpOnly cookie. MongoDB's TTL index removes expired documents automatically.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken =
  mongoose.models.RefreshToken ?? mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
