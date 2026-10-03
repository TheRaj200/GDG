import { farmProfileRepository } from '../repositories/farmProfileRepository.js';
import { planRepository } from '../repositories/planRepository.js';
import { geminiService } from './geminiService.js';

export const soilService = {
  async processSoilPdf(sessionId, fileBuffer, originalName) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Kripya valid soil test PDF file upload karein.');
    }

    let extracted = {
      ph: null,
      ec: null,
      organicCarbon: null,
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      zinc: null,
      sulphur: null,
      reportDate: null,
      labName: null,
      summaryHindi: '',
    };

    try {
      extracted = await geminiService.extractSoilPdf(fileBuffer, 'application/pdf');
    } catch (err) {
      console.warn('Gemini PDF extraction warning:', err.message);
      extracted.summaryHindi = 'PDF se data padhne mein samasya aayi. Aap neeche hath se maan bhar sakte hain.';
      extracted.isManual = true;
    }

    return {
      success: true,
      extractedData: extracted,
      fileName: originalName,
    };
  },

  async confirmSoilData(sessionId, soilData) {
    const validatedData = {
      ph: soilData.ph !== undefined && soilData.ph !== null && soilData.ph !== '' ? Number(soilData.ph) : null,
      ec: soilData.ec !== undefined && soilData.ec !== null && soilData.ec !== '' ? Number(soilData.ec) : null,
      organicCarbon: soilData.organicCarbon !== undefined && soilData.organicCarbon !== null && soilData.organicCarbon !== '' ? Number(soilData.organicCarbon) : null,
      nitrogen: soilData.nitrogen !== undefined && soilData.nitrogen !== null && soilData.nitrogen !== '' ? Number(soilData.nitrogen) : null,
      phosphorus: soilData.phosphorus !== undefined && soilData.phosphorus !== null && soilData.phosphorus !== '' ? Number(soilData.phosphorus) : null,
      potassium: soilData.potassium !== undefined && soilData.potassium !== null && soilData.potassium !== '' ? Number(soilData.potassium) : null,
      zinc: soilData.zinc !== undefined && soilData.zinc !== null && soilData.zinc !== '' ? Number(soilData.zinc) : null,
      sulphur: soilData.sulphur !== undefined && soilData.sulphur !== null && soilData.sulphur !== '' ? Number(soilData.sulphur) : null,
      reportDate: soilData.reportDate || null,
      labName: soilData.labName || null,
      isManual: Boolean(soilData.isManual),
    };

    const hasAnyMetric = Object.entries(validatedData).some(([k, v]) => ['ph', 'ec', 'organicCarbon', 'nitrogen', 'phosphorus', 'potassium', 'zinc', 'sulphur'].includes(k) && v !== null && !isNaN(v));

    const updated = await farmProfileRepository.upsertProfile(sessionId, {
      soilData: validatedData,
      soilTestConfirmed: hasAnyMetric,
    });

    if (hasAnyMetric) {
      await planRepository.markOutdated(sessionId);
    }

    return updated;
  },
};
