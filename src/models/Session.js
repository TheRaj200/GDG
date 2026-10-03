import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    farmerName: { type: String, default: 'Kisan Bhai' },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);
