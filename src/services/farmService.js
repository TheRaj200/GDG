import { farmProfileRepository } from '../repositories/farmProfileRepository.js';
import { planRepository } from '../repositories/planRepository.js';
import { geminiService } from './geminiService.js';
import { mandiService } from './mandiService.js';

// In-memory store for pending selling context per farmer
const pendingSellingQueries = new Map();

export const farmService = {
  async getProfile(sessionId) {
    let profile = await farmProfileRepository.findBySessionId(sessionId);
    if (!profile) {
      profile = await farmProfileRepository.upsertProfile(sessionId, {
        district: '',
        village: '',
        totalArea: 0,
        areaUnit: 'Acre',
      });
    }
    return profile;
  },

  getNextQuestion(profile) {
    if (!profile.district) {
      return {
        field: 'district',
        questionHindi: 'Apna gaon, zila ya rajya batayein (jaise Pune, Gwalior, Jaipur, Patna, Lucknow ya apna zila)?',
        options: ['Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh', 'Bihar', 'Punjab'],
      };
    }


    if (!profile.totalArea || profile.totalArea <= 0) {
      return {
        field: 'totalArea',
        questionHindi: `Aapke paas ${profile.district || 'khet'} mein kul kitni zameen (rakba) hai aur kis unit (Acre ya Bigha) mein hai?`,
        options: ['2 Acre', '5 Acre', '10 Acre', '5 Bigha', '10 Bigha'],
      };
    }

    if (!profile.waterAvailability && !profile.irrigationType) {
      return {
        field: 'waterAvailability',
        questionHindi: 'Aapke khet mein sinchai (paani) ki kya vyavastha hai? Tubewell, nahar, kuan ya sirf barish par nirbhar hai?',
        options: ['Tubewell (Paryapt Paani - 3-4 Sinchai)', 'Kuan (Seemit Paani - 1-2 Sinchai)', 'Nahar Ki Suvidha', 'Asinchit (Rainfed)'],
      };
    }

    if (!profile.intendedSowingDate) {
      return {
        field: 'intendedSowingDate',
        questionHindi: 'Aap Rabi fasal ki buwai kab tak karne ka plan bana rahe hain?',
        options: ['15-30 October (October Last)', '1-15 November (November Mid)', '15-30 November', 'December Pehla Saptah'],
      };
    }

    if (!profile.previousCrop) {
      return {
        field: 'previousCrop',
        questionHindi: 'Kharif mausam mein khet mein kaunsi pichhli fasal lagayi thi?',
        options: ['Soybean', 'Dhan / Paddy', 'Makka (Maize)', 'Urad', 'Khet Khali Tha'],
      };
    }

    if (!profile.budget || profile.budget <= 0) {
      return {
        field: 'budget',
        questionHindi: 'Is Rabi season mein beej, khaad aur jutai ke liye kul anumanit budget kitna hai (Rupees mein)?',
        options: ['₹20,000', '₹40,000', '₹60,000', '₹1,00,000'],
      };
    }

    return null; // All core questions answered
  },

  async handleIntakeMessage(sessionId, userMessage) {
    let profile = await this.getProfile(sessionId);

    // Append user message
    await farmProfileRepository.appendMessage(sessionId, 'user', userMessage);

    const msgLower = (userMessage || '').toLowerCase();

    // ─── Check Selling Intent ─────────────────────────────────────────
    const isSellingIntent =
      msgLower.includes('bech') ||
      msgLower.includes('sell') ||
      msgLower.includes('bhav') ||
      msgLower.includes('mandi') ||
      msgLower.includes('rate') ||
      msgLower.includes('kahan bechu') ||
      pendingSellingQueries.has(sessionId);

    if (isSellingIntent) {
      const pending = pendingSellingQueries.get(sessionId) || {};
      const cropMapping = mandiService.normalizeCropName(userMessage) || (pending.crop ? mandiService.normalizeCropName(pending.crop) : null);

      // Extract quantity
      const qtyMatch = userMessage.match(/(\d+(\.\d+)?)\s*(quintal|kwintal|qtl|kg|kilo|ton|tonne)?/i);
      let extractedQty = null;
      if (qtyMatch && Number(qtyMatch[1]) > 0 && !msgLower.includes('acre') && !msgLower.includes('bigha')) {
        extractedQty = mandiService.normalizeQuantity(qtyMatch[1], qtyMatch[3] || 'quintal');
      }
      const finalQty = extractedQty || pending.quantityQuintals;

      // Extract origin if mentioned
      let finalOrigin = pending.origin || profile.district || 'Gwalior';
      if (msgLower.includes('gwalior')) finalOrigin = 'Gwalior';
      else if (msgLower.includes('dabra')) finalOrigin = 'Dabra';
      else if (msgLower.includes('sehore')) finalOrigin = 'Sehore';
      else if (msgLower.includes('indore')) finalOrigin = 'Indore';

      if (!cropMapping) {
        pendingSellingQueries.set(sessionId, { quantityQuintals: finalQty, origin: finalOrigin });
        const askCrop = 'Aap kaunsi fasal (jaise Gehun, Chana, Sarson) bechna chahte hain?';
        await farmProfileRepository.appendMessage(sessionId, 'assistant', askCrop);
        const upProfile = await farmProfileRepository.findBySessionId(sessionId);
        return {
          profile: upProfile || profile,
          assistantResponse: askCrop,
          nextQuestion: null,
          isSellingIntent: true,
        };
      }

      if (!finalQty) {
        pendingSellingQueries.set(sessionId, { crop: cropMapping.displayNameHindi, origin: finalOrigin });
        const askQty = `Aapke paas kul kitna quintal ${cropMapping.displayNameHindi} bechne ke liye hai?`;
        await farmProfileRepository.appendMessage(sessionId, 'assistant', askQty);
        const upProfile = await farmProfileRepository.findBySessionId(sessionId);
        return {
          profile: upProfile || profile,
          assistantResponse: askQty,
          nextQuestion: null,
          isSellingIntent: true,
        };
      }

      // Both crop and quantity available -> Execute Mandi Advisory
      pendingSellingQueries.delete(sessionId);
      const mandiRes = await mandiService.getBestMandis({
        crop: cropMapping.displayNameHindi,
        quantityQuintals: finalQty,
        origin: finalOrigin,
      });

      const replyText = mandiRes.success
        ? `${mandiRes.summaryHindi}\n\n*(${mandiRes.warningDisclaimer})*`
        : mandiRes.error || 'Mandi data prapt nahi ho saka.';

      await farmProfileRepository.appendMessage(sessionId, 'assistant', replyText);
      const upProfile = await farmProfileRepository.findBySessionId(sessionId);

      return {
        profile: upProfile || profile,
        assistantResponse: replyText,
        nextQuestion: null,
        mandiAdvice: mandiRes,
        isSellingIntent: true,
      };
    }

    // ─── Standard Planning Intake ─────────────────────────────────────
    const extracted = await geminiService.extractIntakeEntities(userMessage, profile);
    const updates = {};

    if (extracted.district) {
      updates.district = extracted.district;
    }
    if (extracted.totalArea && extracted.totalArea > 0) updates.totalArea = extracted.totalArea;
    if (extracted.areaUnit) updates.areaUnit = extracted.areaUnit;
    if (extracted.village) updates.village = extracted.village;
    if (extracted.waterAvailability) updates.waterAvailability = extracted.waterAvailability;
    if (extracted.irrigationType) updates.irrigationType = extracted.irrigationType;
    if (extracted.intendedSowingDate) updates.intendedSowingDate = extracted.intendedSowingDate;
    if (extracted.previousCrop) {
      updates.previousCrop = extracted.previousCrop.toLowerCase().includes('khali') ? 'Khet Khali Tha' : extracted.previousCrop;
    }
    if (extracted.budget && extracted.budget > 0) updates.budget = extracted.budget;

    const hasUpdates = Object.keys(updates).length > 0;

    // Apply updates
    profile = await farmProfileRepository.upsertProfile(sessionId, updates);

    // If profile had a previous plan and crucial inputs changed, mark plan outdated
    if (updates.district || updates.totalArea || updates.areaUnit || updates.waterAvailability || updates.intendedSowingDate || updates.budget) {
      await planRepository.markOutdated(sessionId);
    }

    // Determine next question
    const nextQ = this.getNextQuestion(profile);

    let assistantResponse = '';
    if (nextQ) {
      if (hasUpdates) {
        // Natural confirmation of what was recorded
        if (updates.district) {
          assistantResponse = `Theek hai kisan bhai! Aapka zila ${profile.district} darj kar liya gaya hai.\n\n${nextQ.questionHindi}`;
        } else if (updates.totalArea) {
          assistantResponse = `Bahut badhiya! ${profile.totalArea} ${profile.areaUnit || 'Acre'} zameen darj ho gayi hai.\n\n${nextQ.questionHindi}`;
        } else if (updates.waterAvailability || updates.irrigationType) {
          assistantResponse = `Samajh gaya, sinchai ki jaankari darj ho gayi hai.\n\n${nextQ.questionHindi}`;
        } else if (updates.intendedSowingDate) {
          assistantResponse = `Theek hai, buwai ka samay (${profile.intendedSowingDate}) darj kar liya hai.\n\n${nextQ.questionHindi}`;
        } else if (updates.previousCrop) {
          assistantResponse = `Pichhli fasal (${profile.previousCrop}) darj ho gayi hai.\n\n${nextQ.questionHindi}`;
        } else if (updates.budget) {
          assistantResponse = `Budget ₹${profile.budget.toLocaleString('en-IN')} darj ho gaya hai.\n\n${nextQ.questionHindi}`;
        } else {
          assistantResponse = nextQ.questionHindi;
        }
      } else {
        // Dynamic conversational reply for general questions, greetings, chit-chat
        assistantResponse = await geminiService.generateChatReply(userMessage, profile, nextQ);
      }
      profile = await farmProfileRepository.upsertProfile(sessionId, { intakeCompleted: false });
    } else {
      assistantResponse = `Bahut badhiya kisan bhai! Aapki ${profile.totalArea} ${profile.areaUnit} zameen ki saari jaankari darj ho gayi hai. Humne aapke khet ke liye Gehun, Chana aur Sarson ka tulnatmak vishleshan taiyar kar liya hai. Aap Fasal Tulna (Comparison) dekh sakte hain.`;
      profile = await farmProfileRepository.upsertProfile(sessionId, { intakeCompleted: true });
    }

    await farmProfileRepository.appendMessage(sessionId, 'assistant', assistantResponse);
    const updatedProfile = await farmProfileRepository.findBySessionId(sessionId);

    return {
      profile: updatedProfile || profile,
      assistantResponse,
      nextQuestion: nextQ,
      extracted,
    };
  },

  async updateProfileManual(sessionId, updateData) {
    const updated = await farmProfileRepository.upsertProfile(sessionId, updateData);
    await planRepository.markOutdated(sessionId);
    return updated;
  },

  async resetProfile(sessionId) {
    pendingSellingQueries.delete(sessionId);
    await farmProfileRepository.resetProfile(sessionId);
    await planRepository.deletePlan(sessionId);
    return true;
  },
};

