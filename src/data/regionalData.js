/**
 * SOURCED REGIONAL REFERENCE DATASET
 * Location: Sehore District, Madhya Pradesh (Vindhyan Plateau Agro-Climatic Zone)
 * Sources:
 * 1. RVSKVV Gwalior & JNKVV Jabalpur Rabi Crop Production Guides
 * 2. MP Krishi Vibhag (Department of Farmer Welfare and Agriculture Development, MP)
 * 3. ICAR-Indian Institute of Wheat & Barley Research / ICAR-IIPR Kanpur / ICAR-DRMR Bharatpur
 * 4. Agmarknet (Directorate of Marketing & Inspection) Sehore & Astha Mandi Price Records (2023–2025)
 * 5. IMD / District Agro-meteorological Advisory Bulletin (DAMU Sehore)
 */

export const DISTRICT_INFO = {
  district: 'Sehore',
  districtHindi: 'Sehore',
  state: 'Madhya Pradesh',
  stateHindi: 'Madhya Pradesh',
  agroClimaticZone: 'Vindhyan Plateau (Vindhya Pathar Kshetra)',
  primarySoilType: 'Deep to Medium Black Soils (Gehri v Madhyam Kali Mitti / Vertisols)',
  typicalSoilPhRange: { min: 7.2, max: 8.4 },
  rabiSeasonMonths: 'October to April (October se April)',
  supportedCrops: ['wheat', 'chickpea', 'mustard'],
  supportedCropsHindi: ['Gehun (Wheat)', 'Chana (Chickpea)', 'Sarson (Mustard)'],
};

// Monthly Climate Reference for Sehore (Rabi Season Historical 10-Yr Normals - IMD DAMU Sehore)
export const SEHORE_CLIMATE_REFERENCE = [
  {
    month: 'October',
    avgMaxTempC: 32.5,
    avgMinTempC: 18.2,
    rainfallMm: 22.4,
    historicalCondition: 'Monsoon ki wapsi, Rabi jutai aur palewa ke liye sahi samay',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'November',
    avgMaxTempC: 29.1,
    avgMinTempC: 13.6,
    rainfallMm: 8.5,
    historicalCondition: 'Sarson, chana aur gehun ki mukhya buwai window',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'December',
    avgMaxTempC: 25.8,
    avgMinTempC: 9.8,
    rainfallMm: 4.2,
    historicalCondition: 'Thand ka mausam, kalle phootne (tillering) ka samay',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'January',
    avgMaxTempC: 24.6,
    avgMinTempC: 8.9,
    rainfallMm: 7.1,
    historicalCondition: 'Sheetlahar ki sambhavna, pale (frost) se bachav zaroori',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'February',
    avgMaxTempC: 28.7,
    avgMinTempC: 12.1,
    rainfallMm: 5.6,
    historicalCondition: 'Dana bharav (grain filling), halki sinchai ki zaroorat',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'March',
    avgMaxTempC: 34.2,
    avgMinTempC: 17.5,
    rainfallMm: 3.8,
    historicalCondition: 'Taapmaan mein tezi, sarson v chana ki katai, gehun pakna',
    coverage: 'Sehore District Normal (2014-2024)',
  },
  {
    month: 'April',
    avgMaxTempC: 38.9,
    avgMinTempC: 22.8,
    rainfallMm: 2.1,
    historicalCondition: 'Garm mausam, gehun katai aur gahai ka samay',
    coverage: 'Sehore District Normal (2014-2024)',
  },
];

// Historical Mandi Price Records for Sehore Mandi (Source: Agmarknet 2023-2025 actual modal range in ₹/Quintal)
export const MANDI_PRICE_HISTORY = {
  wheat: {
    source: 'Agmarknet - Sehore & Astha Mandi Records (Sharbati & Lokwan varieties)',
    timePeriod: '2023-2025 Rabi Harvest Months (March - May)',
    market: 'Sehore Principal Market Yard',
    unit: '₹ per Quintal (1 Quintal = 100 kg)',
    historicalPrices: [
      { year: 2023, month: 'March', minPrice: 2250, maxPrice: 3850, modalPrice: 2650, note: 'Sharbati premium 3400-3850' },
      { year: 2023, month: 'April', minPrice: 2200, maxPrice: 3900, modalPrice: 2550, note: 'Lokwan 2250-2500' },
      { year: 2024, month: 'March', minPrice: 2400, maxPrice: 4200, modalPrice: 2800, note: 'MSP ₹2275 + bonus' },
      { year: 2024, month: 'April', minPrice: 2350, maxPrice: 4350, modalPrice: 2750, note: 'High quality Sharbati demand' },
      { year: 2025, month: 'March', minPrice: 2500, maxPrice: 4500, modalPrice: 2950, note: 'MSP ₹2425 + bonus benchmark' },
    ],
    scenarioPricesPerQuintal: {
      low: 2425, // MSP benchmark
      base: 2850, // Average modal for good quality Lokwan/Sharbati blend
      high: 3800, // Premium grade Sharbati (Sehore Sharbati)
    },
  },
  chickpea: {
    source: 'Agmarknet - Sehore Mandi (Desi & Dollar Chana varieties)',
    timePeriod: '2023-2025 Harvest Months (Feb - April)',
    market: 'Sehore APMC',
    unit: '₹ per Quintal',
    historicalPrices: [
      { year: 2023, month: 'March', minPrice: 4600, maxPrice: 5350, modalPrice: 4950, note: 'Desi Chana' },
      { year: 2023, month: 'April', minPrice: 4700, maxPrice: 5400, modalPrice: 5050, note: 'Dollar Chana ₹9000-11500' },
      { year: 2024, month: 'March', minPrice: 5300, maxPrice: 6200, modalPrice: 5750, note: 'Strong demand' },
      { year: 2024, month: 'April', minPrice: 5500, maxPrice: 6450, modalPrice: 5900, note: 'Dalhan rally' },
      { year: 2025, month: 'March', minPrice: 5600, maxPrice: 6600, modalPrice: 6100, note: 'MSP ₹5440 benchmark' },
    ],
    scenarioPricesPerQuintal: {
      low: 5440, // MSP benchmark
      base: 6000, // Current modal average for Desi/JG-11
      high: 7200, // High grade bold/dollar chana
    },
  },
  mustard: {
    source: 'Agmarknet - Sehore & Bhopal Division Mandis',
    timePeriod: '2023-2025 Harvest Months (Feb - March)',
    market: 'Sehore / Regional Mandis',
    unit: '₹ per Quintal',
    historicalPrices: [
      { year: 2023, month: 'February', minPrice: 4900, maxPrice: 5600, modalPrice: 5250, note: '42% oil content' },
      { year: 2023, month: 'March', minPrice: 4850, maxPrice: 5450, modalPrice: 5100, note: 'New harvest arrival' },
      { year: 2024, month: 'February', minPrice: 5100, maxPrice: 5800, modalPrice: 5450, note: 'MSP ₹5650' },
      { year: 2024, month: 'March', minPrice: 5050, maxPrice: 5750, modalPrice: 5350, note: 'Oil mill demand' },
      { year: 2025, month: 'February', minPrice: 5400, maxPrice: 6100, modalPrice: 5750, note: 'MSP ₹5950 benchmark' },
    ],
    scenarioPricesPerQuintal: {
      low: 5400, // Sub-MSP / high moisture
      base: 5950, // MSP base benchmark
      high: 6500, // Premium bold seed with >42% oil content
    },
  },
};

// Sourced Agronomic Crop Specifications for Sehore, MP
export const CROPS_DATA = {
  wheat: {
    key: 'wheat',
    nameHindi: 'Gehun (Wheat)',
    scientificName: 'Triticum aestivum / durum',
    recommendedVarieties: 'Sehore Sharbati (C-306, HI-1544, JW-3288), Lokwan (Lok-1), JW 1203',
    durationDays: '115–125 Din',
    sowingWindow: {
      start: '25 October',
      end: '25 November',
      optimalHindi: '1 November se 20 November (Sabse Uttam)',
      lateSowingAllowed: true,
      lateDeadline: '15 December',
    },
    waterRequirements: {
      category: 'High (3-4 Paani)',
      irrigationCountMin: 3,
      irrigationCountOptimal: 4,
      irrigationStages: [
        { stage: 'CRI (Crown Root Initiation)', daysAfterSowing: 21, description: 'Bohot zaroori - pehli sinchai buwai ke 20-22 din par' },
        { stage: 'Tillering (Kalle Phoot-te Samay)', daysAfterSowing: 45, description: 'Shakha v kalle vikas ke liye' },
        { stage: 'Jointing / Flowering (Gaanth & Phool)', daysAfterSowing: 65, description: 'Baali nikalte samay' },
        { stage: 'Milk / Dough (Dana Bharav)', daysAfterSowing: 85, description: 'Dana pusht karne ke liye antim halki sinchai' },
      ],
      descriptionHindi: 'Kam se kam 3 se 4 baar sinchai (paani) ki zaroorat hoti hai.',
    },
    soilSuitability: {
      minPh: 6.0,
      maxPh: 8.5,
      preferredSoil: 'Gehri madhyam se bhari kali mitti (Deep Black Soil / Vertisol)',
      drainage: 'Achhe jal nikas wali zameen',
    },
    costPerAcre: {
      seeds: 1800, // 40-50 kg/acre
      fertilizers: 3200, // Urea (DAP/NPK + Potash + Zinc)
      irrigation: 2200, // Electricity/diesel pump
      laborAndMachinery: 4500, // Ploughing, sowing, harvesting, threshing
      plantProtection: 800, // Weedicide (Metsulfuron / Clodinafop)
      totalPerAcre: 12500,
    },
    yieldQuintalPerAcre: {
      low: 14,
      base: 18,
      high: 23,
    },
    keyProsHindi: [
      'Sehore ka Sharbati gehun desh bhar mein famous hai aur premium bhav (₹3,500-₹4,200) dilata hai.',
      'Mandi mein turant cash bikri aur sarkari kharid (MSP) ki guarantee.',
      'Bhoosa (chara) se extra aamdani milti hai.',
    ],
    keyConsHindi: [
      'Zyada paani (3-4 sinchai) ki zaroorat - kam paani mein dana pichak sakta hai.',
      'Lagat sarson aur chana se thodi zyada hoti hai.',
      'March mein achanak garmi badhne se upaj par asar pad sakta hai.',
    ],
    verifiedAgronomicGuide: {
      soilPrep: '2 baar cultivator aur 1 baar rotavator chalakar palewa ke baad bhurbhuri mitti taiyar karein.',
      seedRate: '40 se 45 kg per acre (Sharbati), 50 kg (Lokwan). Beej upchar Thiram/Carbendazim (2g/kg) se karein.',
      fertilizerDosage: 'Sifarish: 45-50 kg DAP, 20 kg Potash, 10 kg Zinc Sulphate buwai time + 50 kg Urea sinchai ke sath.',
      weedManagement: 'Buwai ke 30-35 din par Metsulfuron-methyl ya Clodinafop ka chhidkaw karein.',
      harvestWindow: 'March ka aakhiri saptah se April ka pehla pakhwada jab dane mein nami 12-14% reh jaye.',
    },
  },

  chickpea: {
    key: 'chickpea',
    nameHindi: 'Chana / Chhola (Chickpea)',
    scientificName: 'Cicer arietinum',
    recommendedVarieties: 'JG-11, JG-14 (Sookha sahan karne wali), Jaky 9218, RVG 202, Dollar Chana (Kabuli)',
    durationDays: '100–115 Din',
    sowingWindow: {
      start: '15 October',
      end: '15 November',
      optimalHindi: '20 October se 10 November (Best Time)',
      lateSowingAllowed: true,
      lateDeadline: '30 November',
    },
    waterRequirements: {
      category: 'Low to Medium (1-2 Paani)',
      irrigationCountMin: 1,
      irrigationCountOptimal: 2,
      irrigationStages: [
        { stage: 'Branching (Shakha bante samay)', daysAfterSowing: 35, description: 'Shakhayein aur phool aane se pehle halki sinchai' },
        { stage: 'Pod Development (Ghanti / Dana bante samay)', daysAfterSowing: 70, description: 'Phool girte hi dana bharne ke liye (Phool aate samay paani na dein)' },
      ],
      descriptionHindi: 'Seemit paani mein behtareen. Sirf 1 se 2 halki sinchai kaafi hain.',
    },
    soilSuitability: {
      minPh: 6.5,
      maxPh: 8.5,
      preferredSoil: 'Madhyam se bhari kali mitti, jal-bharav mukt',
      drainage: 'Paani jamna nahi chahiye (Ukhta / Wilt rog ka khatra)',
    },
    costPerAcre: {
      seeds: 2600, // 30-35 kg/acre (Desi)
      fertilizers: 1800, // SSP + DAP + Rhizobium
      irrigation: 1000, // 1-2 irrigations
      laborAndMachinery: 3800, // Sowing, weeding, harvesting
      plantProtection: 1300, // Pod borer control - Emamectin Benzoate
      totalPerAcre: 10500,
    },
    yieldQuintalPerAcre: {
      low: 6,
      base: 8.5,
      high: 11,
    },
    keyProsHindi: [
      'Kam paani wale khet ke liye sabse bharosemand fasal.',
      'Jadon se Nitrogen banakar khet ki urvara shakti badhati hai.',
      'Mandi bhav ₹5,800 se ₹6,500 per quintal tak stable rehta hai.',
    ],
    keyConsHindi: [
      'Phool aate samay paani dene se phool jhad jate hain aur Ukhta (Wilt) ka khatra hota hai.',
      'Ghati chhedak illi (Pod borer) aane par samay par spray zaroori hai.',
      'January mein pale (frost) ka thoda risk rehta hai.',
    ],
    verifiedAgronomicGuide: {
      soilPrep: 'Khet mein dhele na hon. Palewa dekar 2 jutai karein aur pata lagakar nami bachayein.',
      seedRate: 'Desi chana: 30-35 kg/acre; Dollar chana: 45-50 kg/acre. Trichoderma viride aur Rhizobium se treat karein.',
      fertilizerDosage: 'Sifarish: 50 kg SSP + 15 kg DAP + 10 kg Sulphur buwai samay. Urea ki zyada zaroorat nahi.',
      weedManagement: 'Buwai ke 48 ghante ke andar Pendimethalin 38.7% CS (600-700 ml/acre) ka spray karein.',
      harvestWindow: 'February aakhiri se March madhya tak jab pattiyan sookh jayein aur fali mein dane khadakne lagein.',
    },
  },

  mustard: {
    key: 'mustard',
    nameHindi: 'Sarson / Rai (Mustard)',
    scientificName: 'Brassica juncea',
    recommendedVarieties: 'Pusa Bold, Giriraj, Pioneer 45S46, RH-749, NRCHB 101',
    durationDays: '105–120 Din',
    sowingWindow: {
      start: '1 October',
      end: '31 October',
      optimalHindi: '10 October se 25 October (Best Window)',
      lateSowingAllowed: false,
      lateDeadline: '10 November (Der se buwai par mahu/aphid ka khatra)',
    },
    waterRequirements: {
      category: 'Very Low (1-2 Paani)',
      irrigationCountMin: 1,
      irrigationCountOptimal: 2,
      irrigationStages: [
        { stage: 'Rosette / Branching (Shakha futav)', daysAfterSowing: 30, description: 'Buwai ke 30-35 din baad pehli sinchai' },
        { stage: 'Siliqua Filling (Faliyan bante samay)', daysAfterSowing: 60, description: 'Doosri halki sinchai (agar nami kam ho)' },
      ],
      descriptionHindi: 'Kam paani mein sabse zyada munafa dene wali fasal. Sirf 1 ya 2 sinchai mein taiyar.',
    },
    soilSuitability: {
      minPh: 6.0,
      maxPh: 8.2,
      preferredSoil: 'Halki se madhyam domat v kali mitti',
      drainage: 'Achha jal nikas zaroori',
    },
    costPerAcre: {
      seeds: 800, // 1.5 - 2 kg/acre
      fertilizers: 2200, // Urea + SSP + Sulphur
      irrigation: 800, // 1-2 light irrigations
      laborAndMachinery: 3200, // Thinning, harvesting, threshing
      plantProtection: 700, // Aphid control
      totalPerAcre: 7700,
    },
    yieldQuintalPerAcre: {
      low: 6.5,
      base: 8.5,
      high: 11.5,
    },
    keyProsHindi: [
      'Kam lagat (sirf ₹7,700/acre) aur kam paani (1-2 sinchai) mein behtareen munafa.',
      'Kam samay (105-115 din) mein pakkar taiyar, khet agali fasal ke liye jaldi khali.',
      'Oil mill demand ke karan achha mandi bhav (MSP ₹5,950+) milta hai.',
    ],
    keyConsHindi: [
      'October mein time par buwai zaroori hai, der hone par Mahu (Aphids) ka attack hota hai.',
      'Shuruat mein paudhon ki chhantai (Thinning) karke 10-12 cm doori banana zaroori hai.',
      'Sulphur ki kami wali mitti mein tel ka percentage kam ho sakta hai.',
    ],
    verifiedAgronomicGuide: {
      soilPrep: 'Mitti ko barik bhurbhuri banayein. Palewa dekar 2 baar harrow aur pata lagayein.',
      seedRate: '1.5 se 2 kg per acre. Beej upchar Metalaxyl + Mancozeb (2g/kg) se karein.',
      fertilizerDosage: 'Sifarish: 35 kg DAP + 15 kg Bentonite Sulphur (90%) ya 100 kg SSP + 40 kg Urea.',
      weedManagement: 'Buwai ke 15-20 din baad paudhon ki chhantai (Thinning) karein taaki 10-15 cm gap bane.',
      harvestWindow: 'February doosre pakhwade se March pehle saptah tak jab 75% faliyan peeli ho jayein.',
    },
  },
};
