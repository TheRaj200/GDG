import { sessionRepository } from '../repositories/sessionRepository.js';
import { farmService } from '../services/farmService.js';
import { planService } from '../services/planService.js';

export const sessionController = {
  async initSession(req, res, next) {
    try {
      const sessionId = req.sessionId;
      const session = await sessionRepository.findBySessionId(sessionId);
      const profile = await farmService.getProfile(sessionId);
      const nextQuestion = farmService.getNextQuestion(profile);
      const activePlan = await planService.getActivePlan(sessionId);

      return res.json({
        success: true,
        sessionId,
        farmerName: session?.farmerName || 'Kisan Bhai',
        profile,
        nextQuestion,
        activePlan,
      });
    } catch (err) {
      next(err);
    }
  },
};
