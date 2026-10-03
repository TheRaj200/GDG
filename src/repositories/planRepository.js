import { PlanModel } from '../models/Plan.js';
import { isDbConnected } from '../config/db.js';

const memoryPlans = new Map();

export const planRepository = {
  async findBySessionId(sessionId) {
    if (isDbConnected()) {
      try {
        return await PlanModel.findOne({ sessionId });
      } catch (err) {
        console.error('DB find plan error:', err.message);
      }
    }
    return memoryPlans.get(sessionId) || null;
  },

  async savePlan(sessionId, planData) {
    const payload = {
      sessionId,
      ...planData,
      isOutdated: false,
    };

    if (isDbConnected()) {
      try {
        return await PlanModel.findOneAndUpdate(
          { sessionId },
          { $set: payload },
          { new: true, upsert: true }
        );
      } catch (err) {
        console.error('DB save plan error:', err.message);
      }
    }

    const existing = memoryPlans.get(sessionId) || {};
    const saved = { ...existing, ...payload, updatedAt: new Date() };
    memoryPlans.set(sessionId, saved);
    return saved;
  },

  async markOutdated(sessionId) {
    if (isDbConnected()) {
      try {
        return await PlanModel.findOneAndUpdate(
          { sessionId },
          { $set: { isOutdated: true } },
          { new: true }
        );
      } catch (err) {
        console.error('DB mark outdated error:', err.message);
      }
    }
    const plan = memoryPlans.get(sessionId);
    if (plan) {
      plan.isOutdated = true;
      memoryPlans.set(sessionId, plan);
    }
    return plan;
  },

  async appendFollowUp(sessionId, question, answer) {
    const item = { question, answer, timestamp: new Date() };
    if (isDbConnected()) {
      try {
        return await PlanModel.findOneAndUpdate(
          { sessionId },
          { $push: { followUpHistory: item } },
          { new: true }
        );
      } catch (err) {
        console.error('DB append follow up error:', err.message);
      }
    }
    const plan = memoryPlans.get(sessionId);
    if (plan) {
      plan.followUpHistory = plan.followUpHistory || [];
      plan.followUpHistory.push(item);
      memoryPlans.set(sessionId, plan);
    }
    return plan;
  },

  async deletePlan(sessionId) {
    if (isDbConnected()) {
      try {
        return await PlanModel.findOneAndDelete({ sessionId });
      } catch (err) {
        console.error('DB delete plan error:', err.message);
      }
    }
    memoryPlans.delete(sessionId);
    return true;
  },
};
