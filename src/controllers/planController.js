import { planService } from '../services/planService.js';

export const planController = {
  async selectCropAndCreatePlan(req, res, next) {
    try {
      const { cropKey, scenario } = req.body;
      if (!cropKey) {
        return res.status(400).json({ success: false, error: 'Fasal ka chayan anivarya hai.' });
      }

      const result = await planService.selectAndCreatePlan(req.sessionId, cropKey, scenario || 'base');

      return res.json({
        success: true,
        message: `${result.plan.cropNameHindi} ki yojana safaltapoorvak save ho gayi.`,
        plan: result.plan,
        profile: result.profile,
      });
    } catch (err) {
      next(err);
    }
  },

  async getActivePlan(req, res, next) {
    try {
      const plan = await planService.getActivePlan(req.sessionId);
      return res.json({
        success: true,
        plan,
      });
    } catch (err) {
      next(err);
    }
  },

  async handleFollowUp(req, res, next) {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Sawal khali nahi ho sakta.' });
      }

      const result = await planService.handleFollowUp(req.sessionId, question.trim());
      const updatedPlan = await planService.getActivePlan(req.sessionId);

      return res.json({
        success: true,
        ...result,
        plan: updatedPlan,
      });
    } catch (err) {
      next(err);
    }
  },
};
