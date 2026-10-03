import { comparisonService } from '../services/comparisonService.js';

export const comparisonController = {
  async getComparison(req, res, next) {
    try {
      const data = await comparisonService.compareCrops(req.sessionId);
      return res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};
