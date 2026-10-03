import { farmService } from '../services/farmService.js';

export const farmController = {
  async getProfile(req, res, next) {
    try {
      const profile = await farmService.getProfile(req.sessionId);
      const nextQuestion = farmService.getNextQuestion(profile);

      return res.json({
        success: true,
        profile,
        nextQuestion,
      });
    } catch (err) {
      next(err);
    }
  },

  async handleMessage(req, res, next) {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message khali nahi ho sakta.' });
      }

      const result = await farmService.handleIntakeMessage(req.sessionId, message.trim());
      return res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updateData = req.body;
      const updated = await farmService.updateProfileManual(req.sessionId, updateData);
      const nextQuestion = farmService.getNextQuestion(updated);

      return res.json({
        success: true,
        profile: updated,
        nextQuestion,
      });
    } catch (err) {
      next(err);
    }
  },

  async resetProfile(req, res, next) {
    try {
      await farmService.resetProfile(req.sessionId);
      const newProfile = await farmService.getProfile(req.sessionId);
      const nextQuestion = farmService.getNextQuestion(newProfile);

      return res.json({
        success: true,
        message: 'Profile safaltapoorvak reset ho gayi.',
        profile: newProfile,
        nextQuestion,
      });
    } catch (err) {
      next(err);
    }
  },
};
