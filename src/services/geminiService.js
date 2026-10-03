import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';

let genAI = null;
if (ENV.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
}

export const geminiService = {
  isAvailable() {
    return Boolean(
      ENV.GEMINI_API_KEY &&
      genAI &&
      (ENV.GEMINI_API_KEY.startsWith('AIzaSy') || ENV.GEMINI_API_KEY.length === 39)
    );
  },


  getModel(modelName = ENV.GEMINI_MODEL) {
    if (!genAI) {
      throw new Error('Gemini API key is not configured.');
    }
    return genAI.getGenerativeModel({ model: modelName });
  },

  /**
   * Generate natural conversational reply in Hinglish
   */
  async generateChatReply(userText, currentProfile = {}, nextQuestion = null) {
    if (this.isAvailable()) {
      try {
        const model = this.getModel();
        const prompt = `
You are "Kisan Ai" (किसान एआई), a helpful, warm, personal agricultural assistant for Indian farmers across all regions and states.
Farmer Profile: ${JSON.stringify(currentProfile)}
Farmer Message: "${userText}"
Next Pending Question: ${nextQuestion ? nextQuestion.questionHindi : 'None (Intake Complete)'}

Instructions:
1. Respond in natural, polite Hinglish (Hindi written in English/Latin letters, e.g. "Ram-ram kisan bhai!").
2. Answer the farmer's question directly, accurately, and helpfully.
3. If they asked a greeting or general question (e.g. "hello", "mera naam kya hai", "fasal kaise chunein"), answer them nicely, and if their farm details are still incomplete, naturally ask the next pending question.
4. Keep the response concise (2-4 sentences max), friendly, and practical.
`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        console.warn('Gemini chat reply fallback:', err.message);
      }
    }

    // Smart contextual fallback
    const raw = (userText || '').toLowerCase();
    if (raw.includes('hello') || raw.includes('hi') || raw.includes('namaste') || raw.includes('ram ram')) {
      if (raw.includes('naam') || raw.includes('name')) {
        return `Ram-ram kisan bhai! Aap Kisan Ai se baat kar rahe hain. Main aapka personal fasal salahkar hoon. ${nextQuestion ? nextQuestion.questionHindi : 'Bataiye main aapki kya madad kar sakta hoon?'}`;
      }
      return `Ram-ram kisan bhai! Main Kisan Ai hoon. ${nextQuestion ? nextQuestion.questionHindi : 'Aap fasal planning ya mandi bhav ke baare mein pooch sakte hain.'}`;
    }

    if (raw.includes('naam') || raw.includes('name')) {
      return `Aap Kisan Ai (Aapka Personal Fasal Salahkar) se baat kar rahe hain. ${nextQuestion ? nextQuestion.questionHindi : ''}`;
    }

    if (raw.includes('kya kar sakte ho') || raw.includes('kya karte ho') || raw.includes('help') || raw.includes('madad')) {
      return `Main aapke khet ke anusaar sahi Rabi fasal (Gehun, Chana, Sarson) chunne, mitti jaanch analysis karne aur live mandi mein bechne ka sahi bhav batane mein madad karta hoon. ${nextQuestion ? nextQuestion.questionHindi : ''}`;
    }

    if (raw.includes('gehu') || raw.includes('wheat')) {
      return `Gehun mukhya Rabi fasal hai jismein 3-4 sinchai aur lagbhag ₹12,500/acre kharch hota hai. ${nextQuestion ? nextQuestion.questionHindi : ''}`;
    }

    if (raw.includes('chana') || raw.includes('gram')) {
      return `Chana kam paani (1-2 sinchai) aur kali ya domat mitti ke liye bahut faydemand fasal hai. ${nextQuestion ? nextQuestion.questionHindi : ''}`;
    }

    if (raw.includes('sarson') || raw.includes('mustard')) {
      return `Sarson kam kharch (₹9,500/acre) aur 105-115 din mein accha munafa dene wali fasal hai. ${nextQuestion ? nextQuestion.questionHindi : ''}`;
    }

    if (nextQuestion) {
      return `Kisan bhai, aapki fasal planning ke liye kripya yeh batayein: ${nextQuestion.questionHindi}`;
    }

    return `Ji kisan bhai, aap khet ki fasal yojana ya live mandi bhav ke baare mein pooch sakte hain.`;
  },

  /**
   * Extract farm intake entities from user message
   */
  async extractIntakeEntities(userText, currentProfile = {}) {

    if (!this.isAvailable()) {
      return this._ruleBasedIntakeExtract(userText, currentProfile);
    }

    try {
      const model = this.getModel();
      const prompt = `
You are the natural language parser for "Kisan Ai" in Sehore, Madhya Pradesh, India.
The farmer is talking in natural Hinglish or Hindi.
Current Profile: ${JSON.stringify(currentProfile)}
Farmer Message: "${userText}"

Extract only the confirmed information from the message into strict JSON (no markdown backticks, no extra keys):
{
  "village": string | null,
  "district": string | null (e.g. "Sehore (MP)", "Indore"),
  "isOutsideSehore": boolean,
  "totalArea": number | null,
  "areaUnit": "Acre" | "Bigha" | "Hectare" | null,
  "intendedSowingDate": string | null (e.g. "15-30 November", "1-15 November", "15-30 October", "1-5 December"),
  "irrigationType": string | null,
  "waterAvailability": "Paryapt (3-4 Sinchai)" | "Seemit (1-2 Sinchai)" | "Asinchit" | null,
  "budget": number | null (clean integer in INR, e.g. 40000 for ₹40,000),
  "previousCrop": string | null (use "Khet Khali Tha" for empty/fallow/khali, or "Soybean", "Paddy / Dhan", "Maize / Makka", "Urad")
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn('Gemini intake extraction fallback:', err.message);
      return this._ruleBasedIntakeExtract(userText, currentProfile);
    }
  },

  _ruleBasedIntakeExtract(userText, currentProfile = {}) {
    const raw = userText || '';
    const text = raw.toLowerCase();
    const extracted = {};

    // Check for explicit location match or generic location patterns
    const locationWords = [
      'sehore', 'bhopal', 'indore', 'gwalior', 'dabra', 'guna', 'ujjain', 'dewas', 'vidisha', 'raisen',
      'hoshangabad', 'jabalpur', 'satna', 'rewa', 'delhi', 'punjab', 'haryana', 'up', 'bihar', 'rajasthan',
      'mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'jaipur', 'jodhpur', 'kota', 'patna', 'gaya',
      'lucknow', 'kanpur', 'varanasi', 'agra', 'meerut', 'chandigarh', 'ludhiana', 'amritsar', 'goa',
      'ahmedabad', 'surat', 'rajkot', 'hyderabad', 'bengaluru', 'chennai', 'kolkata', 'ranchi', 'raipur'
    ];

    for (const loc of locationWords) {
      if (text.includes(loc)) {
        extracted.district = loc.charAt(0).toUpperCase() + loc.slice(1);
        break;
      }
    }

    if (!extracted.district) {
      const placeMatch =
        text.match(/(?:mai|hum|from|zila|gaon|district|city|rehte|rahta)\s+([a-zA-Z]+)/i) ||
        text.match(/([a-zA-Z]+)\s+(?:se hu|se hoon|se|zila|district)/i);

      if (placeMatch) {
        const placeName = placeMatch[1];
        if (!['khet', 'fasal', 'gehu', 'chana', 'sarson', 'paani', 'budget', 'hello', 'hi', 'kya', 'mera', 'naam', 'acre', 'bigha'].includes(placeName.toLowerCase())) {
          extracted.district = placeName.charAt(0).toUpperCase() + placeName.slice(1).toLowerCase();
        }
      }
    }


    // Check area & unit
    const areaMatch = text.match(/(\d+(\.\d+)?)\s*(acre|bigha|hectare|ekad|एकड़|बीघा|हेक्टेयर)/i);
    if (areaMatch) {
      extracted.totalArea = parseFloat(areaMatch[1]);
      const unit = areaMatch[3].toLowerCase();
      if (unit.includes('bigha') || unit.includes('बीघ')) extracted.areaUnit = 'Bigha';
      else if (unit.includes('hectare') || unit.includes('हेक्ट')) extracted.areaUnit = 'Hectare';
      else extracted.areaUnit = 'Acre';
    } else {
      const numMatch = text.match(/(\d+(\.\d+)?)/);
      if (numMatch && !currentProfile.totalArea && !text.includes('₹') && !text.includes('rs') && !text.includes('hazar') && !text.includes('rupaye')) {
        extracted.totalArea = parseFloat(numMatch[1]);
      }
    }

    // Water / irrigation
    if (text.includes('bore') || text.includes('tube') || text.includes('borwell') || text.includes('बोर')) {
      extracted.irrigationType = 'Tubewell / Borewell';
      extracted.waterAvailability = 'Paryapt (3-4 Sinchai)';
    } else if (text.includes('canal') || text.includes('nahar') || text.includes('नहर')) {
      extracted.irrigationType = 'Nahar / Canal';
      extracted.waterAvailability = 'Paryapt (3-4 Sinchai)';
    } else if (text.includes('kuan') || text.includes('well') || text.includes('kam paani') || text.includes('1-2') || text.includes('seemit')) {
      extracted.irrigationType = 'Kuan (Well)';
      extracted.waterAvailability = 'Seemit (1-2 Sinchai)';
    } else if (text.includes('rain') || text.includes('barish') || text.includes('asinchit') || text.includes('sukha') || text.includes('rainfed')) {
      extracted.irrigationType = 'Asinchit / Rainfed';
      extracted.waterAvailability = 'Asinchit';
    }

    // Previous crop
    if (text.includes('khali') || text.includes('खाली') || text.includes('fallow') || text.includes('kuch nahi')) {
      extracted.previousCrop = 'Khet Khali Tha';
    } else if (text.includes('soybean') || text.includes('soya')) {
      extracted.previousCrop = 'Soybean';
    } else if (text.includes('dhan') || text.includes('chawal') || text.includes('paddy')) {
      extracted.previousCrop = 'Paddy / Dhan';
    } else if (text.includes('makka') || text.includes('maize') || text.includes('corn')) {
      extracted.previousCrop = 'Maize / Makka';
    } else if (text.includes('urad')) {
      extracted.previousCrop = 'Urad';
    }

    // Budget: handle ₹20,000, ₹40,000, ₹60,000, ₹1,00,000, 40000, 100000, etc.
    const cleanNumText = text.replace(/,/g, '');
    const budgetMatch = cleanNumText.match(/(?:₹|rs\.?|rupaye|rupee|budget)?\s*(\d{4,7})/i);
    if (budgetMatch && !areaMatch) {
      extracted.budget = parseInt(budgetMatch[1], 10);
    } else if (cleanNumText.match(/(\d{4,7})/)) {
      const bMatch = cleanNumText.match(/(\d{4,7})/);
      extracted.budget = parseInt(bMatch[1], 10);
    }

    // Sowing Date: preserve exact values/ranges
    if (text.includes('15-30 november') || text.includes('15 se 30 november') || text.includes('15 to 30 nov')) {
      extracted.intendedSowingDate = '15-30 November';
    } else if (text.includes('1-15 november') || text.includes('10-15 november') || text.includes('november mid')) {
      extracted.intendedSowingDate = '1-15 November (November Mid)';
    } else if (text.includes('15-30 october') || text.includes('october last') || text.includes('20-25 october')) {
      extracted.intendedSowingDate = '15-30 October (October Last)';
    } else if (text.includes('december') || text.includes('disambar')) {
      extracted.intendedSowingDate = '1-5 December';
    } else if (text.includes('july') || text.includes('जुलाई')) {
      extracted.intendedSowingDate = '15 July';
    } else if (text.includes('november') || text.includes('navambar')) {
      extracted.intendedSowingDate = '1-15 November';
    } else if (text.includes('october') || text.includes('aktubar')) {
      extracted.intendedSowingDate = '15-30 October';
    }

    return extracted;
  },

  /**
   * Multimodal PDF Extraction for Soil Test Report
   */
  async extractSoilPdf(fileBuffer, mimeType = 'application/pdf') {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is required to extract soil PDF.');
    }

    const model = this.getModel();
    const prompt = `
You are a specialized agricultural chemist analyzing a Soil Health Card or Soil Test Report PDF for Indian agricultural land.
Extract all available parameters precisely.
Rules:
1. Extract pH, EC, Organic Carbon (OC), Available Nitrogen (N), Available Phosphorus (P), Available Potassium (K), Zinc (Zn), Sulphur (S), Report Date, and Lab Name.
2. If any value is not present in the document, keep it strictly null. NEVER guess or fabricate values.
3. Write summaryHindi in clear Hinglish (Latin letters).

Return ONLY valid JSON (no markdown backticks):
{
  "ph": number | null,
  "ec": number | null,
  "organicCarbon": number | null,
  "nitrogen": number | null,
  "phosphorus": number | null,
  "potassium": number | null,
  "zinc": number | null,
  "sulphur": number | null,
  "reportDate": string | null,
  "labName": string | null,
  "summaryHindi": string
}
`;

    const imagePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  },

  /**
   * Multimodal Audio Speech-to-Text
   */
  async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
    if (!this.isAvailable()) {
      throw new Error('Gemini API is required for audio transcription.');
    }

    try {
      const model = this.getModel();
      const prompt = `
You are a helpful personal agricultural voice assistant for Indian farmers.
Transcribe the farmer's spoken audio into simple, natural Hinglish (Hindi words in Latin/English letters) or clean text.
Return ONLY the transcribed text without extra meta commentary.
`;

      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent([prompt, audioPart]);
      return result.response.text().trim();
    } catch (err) {
      console.error('Audio transcription error:', err.message);
      throw new Error('Audio samajhne mein samasya aayi: ' + err.message);
    }
  },

  /**
   * Generate crisp Hinglish explanation for crop comparison
   */
  async generateComparisonExplanation(profile, comparisonData) {
    const loc = profile.district || 'aapke ilaqe';
    if (!this.isAvailable()) {
      return `${loc} ke liye aapke ${profile.totalArea || 1} ${profile.areaUnit || 'Acre'} khet aur paani ki suvidha ke anusaar Gehun, Chana aur Sarson ki tulna ki gayi hai. Neeche cards dekhein.`;
    }

    try {
      const model = this.getModel();
      const prompt = `
You are the senior agronomist at Kisan Ai for ${loc}, India.
Farmer Profile: ${JSON.stringify(profile)}
Calculated Crop Comparison Data: ${JSON.stringify(comparisonData)}

Write a 2-3 sentence summary in natural, warm Hinglish (Hindi written in English/Latin letters):
1. Explain which crop is most suitable based on their land and water availability.
2. Highlight one critical caution (e.g. water timing in Chana, aphids in Sarson, or 3-4 irrigations in Wheat).
3. Do not invent any numbers. Keep it crisp and friendly.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      return `${loc} ki mitti aur aapki sinchai suvidha ke aadhar par teeno faslon ka tulnatmak vishleshan taiyar hai.`;
    }
  },

  /**
   * Generate answer for follow up question in Hinglish
   */
  async answerFollowUp(question, farmProfile, activePlan) {
    const loc = farmProfile?.district || 'khet';
    if (!this.isAvailable()) {
      return `Aapke sawal "${question}" ke liye: ${loc} mein anushansit krishi nirdeshon ke anusaar khet ki taiyari aur santulit urvarak ka upyog karein.`;
    }

    try {
      const model = this.getModel();
      const prompt = `
You are the personal agronomist at Kisan Ai.
Location: ${loc}, India.
Farmer Profile: ${JSON.stringify(farmProfile)}
Active Saved Plan: ${JSON.stringify(activePlan)}
Farmer Question: "${question}"

Rules:
1. Answer in natural Hinglish (Hindi in Latin/English letters).
2. Do not invent chemical doses. Reference verified ICAR / State Krishi package of practices.
3. Keep the answer under 100-120 words. Friendly and practical.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      return `${loc} mein ${activePlan.cropNameHindi || 'fasal'} ke liye pramanit nirdeshon ka palan karein. Kisi bhi spray se pehle kisan helpline ya krishi vigyan kendra se salah lein.`;
    }
  },
};
