import { FarmProfileModel } from '../models/FarmProfile.js';
import { isDbConnected } from '../config/db.js';

const memoryProfiles = new Map();

const ALLOWED_PROFILE_FIELDS = [
  'district',
  'village',
  'totalArea',
  'areaUnit',
  'intendedSowingDate',
  'irrigationType',
  'waterAvailability',
  'budget',
  'previousCrop',
  'soilTestConfirmed',
  'soilData',
  'intakeCompleted',
];

function sanitizeProfileData(inputData) {
  const sanitized = {};
  if (!inputData || typeof inputData !== 'object') return sanitized;

  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (inputData[field] !== undefined) {
      if (field === 'totalArea' || field === 'budget') {
        const val = Number(inputData[field]);
        sanitized[field] = isNaN(val) || val < 0 ? 0 : val;
      } else {
        sanitized[field] = inputData[field];
      }
    }
  }
  return sanitized;
}

export const farmProfileRepository = {
  async findBySessionId(sessionId) {
    if (!sessionId) return null;
    if (isDbConnected()) {
      try {
        return await FarmProfileModel.findOne({ sessionId });
      } catch (err) {
        console.error('DB find profile error:', err.message);
      }
    }
    return memoryProfiles.get(sessionId) || null;
  },

  async upsertProfile(sessionId, updateData) {
    if (!sessionId) throw new Error('Session ID is required for profile update.');
    const sanitized = sanitizeProfileData(updateData);

    if (isDbConnected()) {
      try {
        return await FarmProfileModel.findOneAndUpdate(
          { sessionId },
          { $set: { ...sanitized, sessionId } },
          { new: true, upsert: true, runValidators: true }
        );
      } catch (err) {
        console.error('DB upsert profile error:', err.message);
      }
    }

    const existing = memoryProfiles.get(sessionId) || {
      sessionId,
      district: '',
      village: '',
      totalArea: 0,
      areaUnit: 'Acre',
      intendedSowingDate: '',
      irrigationType: '',
      waterAvailability: '',
      budget: 0,
      previousCrop: '',
      soilTestConfirmed: false,
      soilData: {},
      intakeCompleted: false,
      conversationHistory: [],
      createdAt: new Date(),
    };

    const updated = {
      ...existing,
      ...sanitized,
      soilData: {
        ...(existing.soilData || {}),
        ...(sanitized.soilData || {}),
      },
      updatedAt: new Date(),
    };
    memoryProfiles.set(sessionId, updated);
    return updated;
  },


  async appendMessage(sessionId, role, content) {
    const message = { role, content, timestamp: new Date() };

    if (isDbConnected()) {
      try {
        return await FarmProfileModel.findOneAndUpdate(
          { sessionId },
          { $push: { conversationHistory: message } },
          { new: true, upsert: true }
        );
      } catch (err) {
        console.error('DB push message error:', err.message);
      }
    }

    const existing = await this.findBySessionId(sessionId) || {
      sessionId,
      conversationHistory: [],
    };
    existing.conversationHistory = existing.conversationHistory || [];
    existing.conversationHistory.push(message);
    memoryProfiles.set(sessionId, existing);
    return existing;
  },

  async resetProfile(sessionId) {
    if (isDbConnected()) {
      try {
        return await FarmProfileModel.findOneAndDelete({ sessionId });
      } catch (err) {
        console.error('DB reset profile error:', err.message);
      }
    }
    memoryProfiles.delete(sessionId);
    return true;
  },
};
