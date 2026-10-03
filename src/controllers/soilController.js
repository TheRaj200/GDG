import { soilService } from '../services/soilService.js';

export const soilController = {
  async uploadPdf(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Kripya soil test PDF file chunein.',
        });
      }

      const result = await soilService.processSoilPdf(
        req.sessionId,
        req.file.buffer,
        req.file.originalname
      );

      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async confirmSoilData(req, res, next) {
    try {
      const soilData = req.body;
      if (!soilData || typeof soilData !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Amanaya soil data format.',
        });
      }

      const profile = await soilService.confirmSoilData(req.sessionId, soilData);

      return res.json({
        success: true,
        message: 'Mitti jaanch data safaltapoorvak save ho gaya.',
        profile,
      });
    } catch (err) {
      next(err);
    }
  },
};
