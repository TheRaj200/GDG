import {
  CROPS_DATA,
  MANDI_PRICE_HISTORY,
  SEHORE_CLIMATE_REFERENCE,
  DISTRICT_INFO,
} from '../data/regionalData.js';
import { farmProfileRepository } from '../repositories/farmProfileRepository.js';
import { geminiService } from './geminiService.js';
import { mandiService } from './mandiService.js';
import { weatherService } from './weatherService.js';


function normalizeAreaToAcres(area, unit = 'Acre') {
  const num = Number(area) || 1;
  const u = (unit || '').toLowerCase();
  if (u.includes('bigha') || u.includes('बीघ')) {
    return num * 0.625; // Standard MP Pakka Bigha
  }
  if (u.includes('hectare') || u.includes('हेक्ट')) {
    return num * 2.471;
  }
  return num; // Default Acre
}

export const comparisonService = {
  async compareCrops(sessionId) {
    const profile = await farmProfileRepository.findBySessionId(sessionId);
    
    if (!profile) {
      return {
        hasRequiredInputs: false,
        messageHindi: 'Kripya pehle apni zameen aur location ki jaankari darj karein.',
        comparisons: [],
      };
    }



    if (!profile.totalArea || profile.totalArea <= 0) {
      return {
        hasRequiredInputs: false,
        messageHindi: 'Kripya pehle apni kul zameen (rakba) darj karein taaki sahi lagat aur munafa nikala ja sake.',
        farmerContext: {
          totalArea: 0,
          areaUnit: profile.areaUnit || 'Acre',
          normalizedAcres: 0,
          waterAvailability: profile.waterAvailability || 'Not specified',
          budget: profile.budget || 0,
          soilConfirmed: profile.soilTestConfirmed,
        },
        comparisons: [],
      };
    }

    const areaInAcres = normalizeAreaToAcres(profile.totalArea, profile.areaUnit);
    const results = [];

    const cropKeys = ['wheat', 'chickpea', 'mustard'];

    for (const key of cropKeys) {
      const crop = CROPS_DATA[key];
      const mandiHistory = MANDI_PRICE_HISTORY[key];

      // Fetch live market observation for unified price context
      const liveMarket = await mandiService.getLatestMarketPrice(key, 'Madhya Pradesh', profile.district);
      const basePrice = liveMarket?.modalPrice || mandiHistory.scenarioPricesPerQuintal.base;
      const lowPrice = mandiHistory.scenarioPricesPerQuintal.low;
      const highPrice = liveMarket?.modalPrice ? Math.round(liveMarket.modalPrice * 1.12) : mandiHistory.scenarioPricesPerQuintal.high;

      const scenarioPrices = {
        low: lowPrice,
        base: basePrice,
        high: highPrice,
      };

      // Cost calculation
      const totalCostPerAcre = crop.costPerAcre.totalPerAcre;
      const totalEstimatedCost = Math.round(totalCostPerAcre * areaInAcres);
      const costBreakdown = {
        seeds: Math.round(crop.costPerAcre.seeds * areaInAcres),
        fertilizers: Math.round(crop.costPerAcre.fertilizers * areaInAcres),
        irrigation: Math.round(crop.costPerAcre.irrigation * areaInAcres),
        laborAndMachinery: Math.round(crop.costPerAcre.laborAndMachinery * areaInAcres),
        plantProtection: Math.round(crop.costPerAcre.plantProtection * areaInAcres),
        total: totalEstimatedCost,
      };

      // Financial scenarios (Low, Base, High)
      const scenarios = {};
      for (const level of ['low', 'base', 'high']) {
        const yieldPerAcre = crop.yieldQuintalPerAcre[level];
        const totalProductionQuintals = +(yieldPerAcre * areaInAcres).toFixed(1);
        const pricePerQuintal = scenarioPrices[level];
        const grossRevenue = Math.round(totalProductionQuintals * pricePerQuintal);
        const netReturn = grossRevenue - totalEstimatedCost;

        scenarios[level] = {
          yieldPerAcre,
          totalProductionQuintals,
          pricePerQuintal,
          grossRevenue,
          totalCost: totalEstimatedCost,
          netReturn,
          returnOnInvestmentPercent: totalEstimatedCost > 0 ? +((netReturn / totalEstimatedCost) * 100).toFixed(1) : 0,
        };
      }

      // Suitability check logic
      const suitabilityChecks = [];
      let suitabilityScore = 0;
      let suitabilityLevel = 'Suitable';

      // 1. Sowing Season & Date Check
      const sowingText = (profile.intendedSowingDate || '').toLowerCase();
      const isMonsoonOrKharif = sowingText.includes('july') || sowingText.includes('august') || sowingText.includes('june') || sowingText.includes('जुलाई');

      if (isMonsoonOrKharif) {
        suitabilityChecks.push({
          factor: 'Buwai Mausam (Sowing Window)',
          status: 'warning',
          message: `${crop.nameHindi} Rabi mausam (October-December) ki fasal hai. July/August barish mein buwai anukul nahi hai.`,
        });
      } else if (sowingText) {
        suitabilityChecks.push({
          factor: 'Buwai Samay (Sowing Window)',
          status: 'good',
          message: `${sowingText} Rabi buwai ke anukool window (${crop.sowingWindow.optimalHindi}) ke anusar hai.`,
        });
        suitabilityScore += 1;
      }

      // 2. Water check
      const water = (profile.waterAvailability || '').toLowerCase();
      const isWaterScarce = water.includes('seemit') || water.includes('asinchit') || water.includes('kuan') || water.includes('1-2') || water.includes('rainfed');

      if (key === 'wheat') {
        if (isWaterScarce) {
          suitabilityChecks.push({
            factor: 'Sinchai (Water)',
            status: 'warning',
            message: 'Gehun ko 3-4 paani ki zaroorat hai. Seemit paani mein dana halka reh sakta hai.',
          });
        } else {
          suitabilityChecks.push({
            factor: 'Sinchai (Water)',
            status: 'good',
            message: 'Paryapt paani hone par Gehun ke liye behtareen sthiti hai.',
          });
          suitabilityScore += 1;
        }
      } else if (key === 'chickpea') {
        if (isWaterScarce) {
          suitabilityChecks.push({
            factor: 'Sinchai (Water)',
            status: 'good',
            message: 'Chana 1-2 halki sinchai mein uttam utpadan deta hai.',
          });
          suitabilityScore += 1;
        } else {
          suitabilityChecks.push({
            factor: 'Sinchai (Water)',
            status: 'neutral',
            message: 'Zyada paani ya jal-bharav se bachein, ukhta rog ka risk rehta hai.',
          });
          suitabilityScore += 1;
        }
      } else if (key === 'mustard') {
        suitabilityChecks.push({
          factor: 'Sinchai (Water)',
          status: 'good',
          message: 'Sirf 1-2 sinchai mein sabse kam paani khapat wali fasal.',
        });
        suitabilityScore += 1;
      }

      // 3. Soil check
      if (profile.soilTestConfirmed && profile.soilData && profile.soilData.ph) {
        const ph = profile.soilData.ph;
        if (ph >= crop.soilSuitability.minPh && ph <= crop.soilSuitability.maxPh) {
          suitabilityChecks.push({
            factor: 'Mitti pH',
            status: 'good',
            message: `Jaanch pH ${ph} is fasal ke anukool range (${crop.soilSuitability.minPh}-${crop.soilSuitability.maxPh}) mein hai.`,
          });
          suitabilityScore += 1;
        } else {
          suitabilityChecks.push({
            factor: 'Mitti pH',
            status: 'warning',
            message: `Jaanch pH ${ph} thoda asantulit hai. Jaivik khaad ya gypsum/chuna ki zaroorat ho sakti hai.`,
          });
        }
      } else {
        suitabilityChecks.push({
          factor: 'Mitti (Soil)',
          status: 'neutral',
          message: profile.district ? `${profile.district} ki kheti mitti ke anusaar anukool.` : 'Samanya kheti mitti ke liye anukool.',
        });
      }

      // 4. Budget check
      if (profile.budget && profile.budget > 0) {
        if (profile.budget >= totalEstimatedCost) {
          suitabilityChecks.push({
            factor: 'Lagat Budget',
            status: 'good',
            message: `Anumanit lagat (₹${totalEstimatedCost.toLocaleString('en-IN')}) aapke budget (₹${profile.budget.toLocaleString('en-IN')}) ke andar hai.`,
          });
          suitabilityScore += 1;
        } else {
          suitabilityChecks.push({
            factor: 'Lagat Budget',
            status: 'warning',
            message: `Lagat (₹${totalEstimatedCost.toLocaleString('en-IN')}) aapke budget se zyada hai.`,
          });
        }
      }

      if (isMonsoonOrKharif) {
        suitabilityLevel = 'Not Recommended (Kharif Month)';
      } else if (suitabilityScore >= 3) {
        suitabilityLevel = 'Highly Recommended';
      } else if (suitabilityScore >= 1) {
        suitabilityLevel = 'Moderately Suitable';
      } else {
        suitabilityLevel = 'Caution Needed';
      }

      results.push({
        cropKey: key,
        nameHindi: crop.nameHindi,
        variety: crop.recommendedVarieties,
        durationDays: crop.durationDays,
        sowingWindow: crop.sowingWindow,
        waterRequirements: crop.waterRequirements,
        costBreakdown,
        scenarios,
        suitabilityLevel,
        suitabilityChecks,
        prosHindi: crop.keyProsHindi,
        consHindi: crop.keyConsHindi,
        mandiPriceHistory: mandiHistory,
      });
    }

    // Fetch live district weather data
    const liveWeather = await weatherService.getLiveWeather(profile.district || 'Sehore');

    // Generate AI explanation
    const aiExplanation = await geminiService.generateComparisonExplanation(profile, results);

    return {
      supported: true,
      districtInfo: DISTRICT_INFO,
      farmerContext: {
        totalArea: profile.totalArea,
        areaUnit: profile.areaUnit || 'Acre',
        normalizedAcres: +areaInAcres.toFixed(2),
        waterAvailability: profile.waterAvailability || 'Not specified',
        budget: profile.budget || 0,
        soilConfirmed: profile.soilTestConfirmed,
      },
      liveWeather,
      climateReference: SEHORE_CLIMATE_REFERENCE,
      comparisons: results,
      aiExplanationHindi: aiExplanation,
    };
  },
};

