import { CROPS_DATA, MANDI_PRICE_HISTORY } from '../data/regionalData.js';
import { farmProfileRepository } from '../repositories/farmProfileRepository.js';
import { planRepository } from '../repositories/planRepository.js';
import { geminiService } from './geminiService.js';
import { mandiService } from './mandiService.js';

function normalizeAreaToAcres(area, unit = 'Acre') {
  const num = Number(area) || 1;
  const u = (unit || '').toLowerCase();
  if (u.includes('bigha') || u.includes('बीघ')) return num * 0.625;
  if (u.includes('hectare') || u.includes('हेक्ट')) return num * 2.471;
  return num;
}

export const planService = {
  async selectAndCreatePlan(sessionId, cropKey, scenario = 'base') {
    const profile = await farmProfileRepository.findBySessionId(sessionId);
    if (!profile) {
      throw new Error('Kisan profile nahi mili. Pehle farm profile darj karein.');
    }

    if (!profile.totalArea || profile.totalArea <= 0) {
      throw new Error('Kripya pehle apni kul zameen (rakba) darj karein.');
    }



    const crop = CROPS_DATA[cropKey];
    if (!crop) {
      throw new Error(`Amanaya fasal chayan. Sirf Wheat, Chickpea aur Mustard supported hain.`);
    }

    const areaInAcres = normalizeAreaToAcres(profile.totalArea, profile.areaUnit);
    const mandiHistory = MANDI_PRICE_HISTORY[cropKey];

    // Live market price observation
    const liveMarket = await mandiService.getLatestMarketPrice(cropKey, 'Madhya Pradesh', profile.district);
    const basePrice = liveMarket?.modalPrice || mandiHistory.scenarioPricesPerQuintal.base;
    const lowPrice = mandiHistory.scenarioPricesPerQuintal.low;
    const highPrice = liveMarket?.modalPrice ? Math.round(liveMarket.modalPrice * 1.12) : mandiHistory.scenarioPricesPerQuintal.high;

    const scenarioPrices = {
      low: lowPrice,
      base: basePrice,
      high: highPrice,
    };

    const yieldPerAcre = crop.yieldQuintalPerAcre[scenario] || crop.yieldQuintalPerAcre.base;
    const productionTotal = +(yieldPerAcre * areaInAcres).toFixed(1);
    const unitPrice = scenarioPrices[scenario] || scenarioPrices.base;
    const totalRevenue = Math.round(productionTotal * unitPrice);

    const costBreakdown = {
      seeds: Math.round(crop.costPerAcre.seeds * areaInAcres),
      fertilizers: Math.round(crop.costPerAcre.fertilizers * areaInAcres),
      irrigation: Math.round(crop.costPerAcre.irrigation * areaInAcres),
      laborAndMachinery: Math.round(crop.costPerAcre.laborAndMachinery * areaInAcres),
      plantProtection: Math.round(crop.costPerAcre.plantProtection * areaInAcres),
    };
    const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);
    const netReturn = totalRevenue - totalCost;

    // Build timeline stages in Hinglish
    const stageBasedChecks = [
      {
        stage: 'Buwai Purva v Buwai (Sowing Stage: 0-10 Din)',
        keyActivity: `Khet ki jutai v palewa. Beej Dar: ${crop.verifiedAgronomicGuide.seedRate}`,
        precaution: 'Beej upchar zaroori hai taaki ukhta rog aur jad sadan se bacha ja sake.',
      },
      {
        stage: 'Vridhi v Pehli Sinchai (Vegetative Stage: 20-35 Din)',
        keyActivity: crop.waterRequirements.irrigationStages[0]?.description || 'Halki sinchai aur nirai-gudai',
        precaution: 'Kharpatwar niyantran samay par karein aur Urea ki pehli khurak dein.',
      },
      {
        stage: 'Phool v Dana Bharav (Flowering & Grain Filling: 55-80 Din)',
        keyActivity: crop.waterRequirements.irrigationStages[1]?.description || 'Dana bharav awastha ki nigrani',
        precaution: 'Chane mein phool aate samay paani na dein. Illi ya keet ka dhyan rakhein.',
      },
      {
        stage: 'Paripakwata v Katai (Maturity & Harvesting: 100-125 Din)',
        keyActivity: `Katai window: ${crop.verifiedAgronomicGuide.harvestWindow}`,
        precaution: 'Dane mein 12-14% nami rehne par hi katai v bhandaran karein.',
      },
    ];

    const planData = {
      cropKey,
      cropNameHindi: crop.nameHindi,
      variety: crop.recommendedVarieties,
      area: profile.totalArea,
      areaUnit: profile.areaUnit || 'Acre',
      selectedScenario: scenario,
      financials: {
        yieldPerUnit: yieldPerAcre,
        productionTotal,
        unitPrice,
        totalRevenue,
        totalCost,
        netReturn,
        costBreakdown,
      },
      agronomyPlan: {
        soilPreparation: crop.verifiedAgronomicGuide.soilPrep,
        sowingWindow: crop.sowingWindow.optimalHindi,
        seedRate: crop.verifiedAgronomicGuide.seedRate,
        fertilizerGuidance: crop.verifiedAgronomicGuide.fertilizerDosage,
        irrigationSchedule: crop.waterRequirements.irrigationStages,
        stageBasedChecks,
        harvestWindow: crop.verifiedAgronomicGuide.harvestWindow,
      },
    };

    const savedPlan = await planRepository.savePlan(sessionId, planData);

    // Append to conversation history so chat stream reflects crop selection immediately
    await farmProfileRepository.appendMessage(sessionId, 'user', `Maine ${crop.nameHindi} fasal chuni hai.`);
    await farmProfileRepository.appendMessage(
      sessionId,
      'assistant',
      `Badhai kisan bhai! Aapne ${profile.totalArea} ${profile.areaUnit || 'Acre'} ke liye ${crop.nameHindi} ki yojana safaltapoorvak chun li hai.\n\nAnumanit Kul Utpadan: ${productionTotal} Quintal\nKul Lagat: ₹${totalCost.toLocaleString('en-IN')}\nAnumanit Shuddh Munafa: ₹${netReturn.toLocaleString('en-IN')}\n\nNeeche aapka Krishi schedule, sinchai aur khaad prabandhan taiyar hai.`
    );

    const updatedProfile = await farmProfileRepository.findBySessionId(sessionId);

    return {
      plan: savedPlan,
      profile: updatedProfile || profile,
    };
  },

  async getActivePlan(sessionId) {
    return await planRepository.findBySessionId(sessionId);
  },

  async handleFollowUp(sessionId, question) {
    let plan = await planRepository.findBySessionId(sessionId);
    let profile = await farmProfileRepository.findBySessionId(sessionId);

    if (!plan) {
      throw new Error('Koi sakriya fasal yojana nahi mili. Kripya pehle fasal chunein.');
    }

    const qLower = question.toLowerCase();
    const areaMatch = question.match(/(\d+(\.\d+)?)\s*(acre|bigha|hectare|ekad|एकड़|बीघा|हेक्टेयर)/i);
    let recalculationNote = '';

    const isExplicitUpdate = qLower.includes('kar do') || qLower.includes('kardo') || qLower.includes('badal do') || qLower.includes('update') || qLower.includes('change karo') || qLower.includes('badlo');

    if (areaMatch) {
      const newArea = parseFloat(areaMatch[1]);
      let newUnit = 'Acre';
      const u = areaMatch[3].toLowerCase();
      if (u.includes('bigha') || u.includes('बीघ')) newUnit = 'Bigha';
      else if (u.includes('hectare') || u.includes('हेक्ट')) newUnit = 'Hectare';

      const newAcres = normalizeAreaToAcres(newArea, newUnit);

      const crop = CROPS_DATA[plan.cropKey];
      const mandiHistory = MANDI_PRICE_HISTORY[plan.cropKey];
      const yieldPerAcre = plan.financials.yieldPerUnit || crop.yieldQuintalPerAcre.base;
      const unitPrice = plan.financials.unitPrice || mandiHistory.scenarioPricesPerQuintal.base;
      const newProduction = +(yieldPerAcre * newAcres).toFixed(1);
      const newRevenue = Math.round(newProduction * unitPrice);
      const newCost = Math.round(crop.costPerAcre.totalPerAcre * newAcres);
      const newNet = newRevenue - newCost;

      if (isExplicitUpdate) {
        // Explicit area update: persist profile and recalculate plan
        profile = await farmProfileRepository.upsertProfile(sessionId, {
          totalArea: newArea,
          areaUnit: newUnit,
        });
        plan = await this.selectAndCreatePlan(sessionId, plan.cropKey, plan.selectedScenario || 'base');
        recalculationNote = `\n\n✅ [Plan Updated - ${newArea} ${newUnit}]:\n- Naya Rakba: ${newArea} ${newUnit} (${newAcres.toFixed(2)} Acre)\n- Naya Utpadan: ${newProduction} Quintal\n- Nayi Lagat: ₹${newCost.toLocaleString('en-IN')}\n- Naya Shuddh Munafa: ₹${newNet.toLocaleString('en-IN')}`;
      } else {
        // Hypothetical preview
        recalculationNote = `\n\n📊 [Hypothetical Preview - ${newArea} ${newUnit} ke liye]:\n- Anumanit Kul Utpadan: ${newProduction} Quintal\n- Kul Anumanit Lagat: ₹${newCost.toLocaleString('en-IN')}\n- Kul Anumanit Shuddh Munafa: ₹${newNet.toLocaleString('en-IN')}\n*(Note: Yeh keval anuman hai. Profile mein badlaav karne ke liye "Mera area ${newArea} ${newUnit} kar do" kahein.)*`;
      }
    }

    const answer = await geminiService.answerFollowUp(question, profile, plan);
    const finalAnswer = answer + (recalculationNote ? recalculationNote : '');

    await planRepository.appendFollowUp(sessionId, question, finalAnswer);

    return {
      question,
      answer: finalAnswer,
      plan,
    };
  },
};
