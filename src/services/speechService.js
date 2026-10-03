import { geminiService } from './geminiService.js';

export const speechService = {
  /**
   * Generates a concise spoken summary in natural Hinglish from detailed crop text
   */
  async generateSpokenSummary(detailedText) {
    if (!geminiService.isAvailable()) {
      const parts = detailedText.split(/[।.\n]/).filter(p => p.trim().length > 0);
      return parts.slice(0, 2).join('. ') + '.';
    }

    try {
      const model = geminiService.getModel();
      const prompt = `
Summarize the following agricultural advice in 2 short, crisp, spoken-friendly Hinglish sentences (Hindi in Latin/English letters).
No bullet points, no special symbols.
Text: "${detailedText}"
`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      const parts = detailedText.split(/[।.\n]/).filter(p => p.trim().length > 0);
      return parts.slice(0, 2).join('. ') + '.';
    }
  },
};
