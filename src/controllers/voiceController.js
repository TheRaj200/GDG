import { geminiService } from '../services/geminiService.js';
import { speechService } from '../services/speechService.js';
import { farmService } from '../services/farmService.js';

export const voiceController = {
  async transcribeAudio(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Kripya audio file bhejein.' });
      }

      const mimeType = req.file.mimetype || 'audio/webm';
      const transcript = await geminiService.transcribeAudio(req.file.buffer, mimeType);

      // Process as intake message automatically
      const intakeResult = await farmService.handleIntakeMessage(req.sessionId, transcript);

      // Generate spoken audio script
      const spokenSummary = await speechService.generateSpokenSummary(intakeResult.assistantResponse);

      return res.json({
        success: true,
        transcript,
        ...intakeResult,
        spokenSummary,
      });
    } catch (err) {
      next(err);
    }
  },

  async synthesizeSpeech(req, res, next) {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'Bolne ke liye text avashyak hai.' });
      }

      const spokenSummary = await speechService.generateSpokenSummary(text);

      return res.json({
        success: true,
        spokenSummary,
      });
    } catch (err) {
      next(err);
    }
  },
};
