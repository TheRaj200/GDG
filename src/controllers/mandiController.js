import { mandiService } from '../services/mandiService.js';
import { farmService } from '../services/farmService.js';

export const mandiController = {
  async getMandiAdvice(req, res, next) {
    try {
      const { crop, quantity, quantityQuintals, unit, origin, state, variety, grade } = req.body;

      if (!crop || typeof crop !== 'string' || crop.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Kripya fasal ka naam (jaise Gehun, Chana, Sarson) batayein.',
        });
      }

      // Determine quantity in quintals
      const rawQty = quantityQuintals || quantity;
      const normalizedQty = mandiService.normalizeQuantity(rawQty, unit || 'quintal');

      if (!normalizedQty) {
        return res.status(400).json({
          success: false,
          error: 'Kripya sahi matra (quantity in quintals ya kg) batayein.',
        });
      }

      // If origin not passed, check farmer profile district/village
      let finalOrigin = origin;
      if (!finalOrigin && req.sessionId) {
        const profile = await farmService.getProfile(req.sessionId);
        if (profile?.district) {
          finalOrigin = profile.district;
        }
      }

      const result = await mandiService.getBestMandis({
        crop: crop.trim(),
        quantityQuintals: normalizedQty,
        origin: finalOrigin,
        state: state || 'Madhya Pradesh',
        variety: variety || '',
        grade: grade || '',
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
