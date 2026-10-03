import { SessionModel } from '../models/Session.js';
import { isDbConnected } from '../config/db.js';

// In-memory store fallback if DB is not connected
const memorySessions = new Map();

export const sessionRepository = {
  async findBySessionId(sessionId) {
    if (isDbConnected()) {
      try {
        return await SessionModel.findOne({ sessionId });
      } catch (err) {
        console.error('DB find error, using fallback memory:', err.message);
      }
    }
    return memorySessions.get(sessionId) || null;
  },

  async createOrUpdate(sessionId, data = {}) {
    const payload = {
      sessionId,
      farmerName: data.farmerName || 'Kisan Bhai',
      lastActive: new Date(),
    };

    if (isDbConnected()) {
      try {
        return await SessionModel.findOneAndUpdate(
          { sessionId },
          { $set: payload },
          { new: true, upsert: true }
        );
      } catch (err) {
        console.error('DB upsert error, using fallback memory:', err.message);
      }
    }

    const existing = memorySessions.get(sessionId) || { createdAt: new Date() };
    const saved = { ...existing, ...payload, updatedAt: new Date() };
    memorySessions.set(sessionId, saved);
    return saved;
  },
};
