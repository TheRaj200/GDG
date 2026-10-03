import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMandiCoordinates } from '../data/mandiGeocodes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.resolve(__dirname, '../../data');
const CACHE_FILE = path.join(CACHE_DIR, 'mandi_cache.json');

const PRIMARY_MANDI_API_BASE = 'https://mandi-api.onrender.com/v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache for fast lookup
const memoryCache = new Map();

// Load persistent cache from disk on boot
function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      for (const [key, val] of Object.entries(parsed)) {
        if (val && val.timestamp && Date.now() - val.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, val);
        }
      }
    }
  } catch (err) {
    console.warn('[MandiService] Could not load disk cache:', err.message);
  }
}

function saveDiskCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const obj = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[MandiService] Could not save disk cache:', err.message);
  }
}

loadDiskCache();

// Configurable constants
export const MANDI_DEFAULTS = {
  HOME_LAT: 26.2183,
  HOME_LON: 78.1828,
  HOME_NAME: 'Gwalior (MP)',
  TRANSPORT_RATE_PER_QUINTAL_PER_KM: 1.5,
  MANDI_CHARGE_PERCENT: 1.5,
};

// Crop alias mappings
const CROP_ALIASES = [
  {
    keys: ['wheat', 'gehu', 'gehun', 'gehoo', 'kanak', 'गेंहू', 'गेहूं'],
    internalKey: 'wheat',
    providerCommodity: 'Wheat',
    displayNameHindi: 'Gehun (Wheat)',
  },
  {
    keys: ['chana', 'chane', 'gram', 'chickpea', 'channa', 'चना', 'चने', 'bengal gram'],
    internalKey: 'chickpea',
    providerCommodity: 'Bengal Gram(Gram)(Whole)',
    displayNameHindi: 'Chana (Bengal Gram)',
  },
  {
    keys: ['mustard', 'sarson', 'sarso', 'rai', 'toria', 'सरसों', 'राई'],
    internalKey: 'mustard',
    providerCommodity: 'Mustard',
    displayNameHindi: 'Sarson (Mustard)',
  },
  {
    keys: ['soybean', 'soya', 'soyabean', 'सोयाबीन'],
    internalKey: 'soybean',
    providerCommodity: 'Soyabean',
    displayNameHindi: 'Soybean',
  },
  {
    keys: ['maize', 'makka', 'makkai', 'corn', 'मक्का'],
    internalKey: 'maize',
    providerCommodity: 'Maize',
    displayNameHindi: 'Makka (Maize)',
  },
  {
    keys: ['onion', 'pyaz', 'kanda', 'प्याज', 'कांदा'],
    internalKey: 'onion',
    providerCommodity: 'Onion',
    displayNameHindi: 'Pyaz (Onion)',
  },
  {
    keys: ['potato', 'aloo', 'alu', 'आलू'],
    internalKey: 'potato',
    providerCommodity: 'Potato',
    displayNameHindi: 'Aloo (Potato)',
  },
  {
    keys: ['tomato', 'tamatar', 'टमाटर'],
    internalKey: 'tomato',
    providerCommodity: 'Tomato',
    displayNameHindi: 'Tamatar (Tomato)',
  },
];

/**
 * Haversine formula for distance between 2 coordinates in km.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const mandiService = {
  /**
   * Normalize user input crop name into verified provider commodity
   */
  normalizeCropName(inputCrop) {
    if (!inputCrop || typeof inputCrop !== 'string') return null;
    const clean = inputCrop.toLowerCase().trim();

    for (const mapping of CROP_ALIASES) {
      if (mapping.keys.some((k) => clean.includes(k) || k.includes(clean))) {
        return mapping;
      }
    }
    return null;
  },

  /**
   * Normalize quantity to quintals (e.g. 4000 kg -> 40 quintal, 40 ton -> 400 quintal)
   */
  normalizeQuantity(quantity, unit = 'quintal') {
    const q = Number(quantity);
    if (isNaN(q) || q <= 0) return null;

    const u = (unit || '').toLowerCase().trim();
    if (u.includes('kg') || u.includes('kilo')) {
      return +(q / 100).toFixed(2);
    }
    if (u.includes('tonne') || u.includes('ton') || u.includes('metric')) {
      return +(q * 10).toFixed(2);
    }
    return +q.toFixed(2); // Default Quintal
  },

  /**
   * Calculate distance between origin and mandi using OSRM with Haversine fallback
   */
  async calculateDistanceKm(originCoords, mandiCoords) {
    if (!originCoords || !mandiCoords || !mandiCoords.verified) {
      return null;
    }

    try {
      // OSRM expects coordinates in lon,lat order
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${originCoords.lon},${originCoords.lat};${mandiCoords.lon},${mandiCoords.lat}?overview=false`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]?.distance) {
          const km = data.routes[0].distance / 1000;
          return {
            distanceKm: +km.toFixed(1),
            source: 'OSRM Route Driving Distance',
          };
        }
      }
    } catch (_) {
      // OSRM failed or timed out; fallback to Haversine * 1.3
    }

    // Haversine estimated driving distance
    const directKm = haversineDistanceKm(originCoords.lat, originCoords.lon, mandiCoords.lat, mandiCoords.lon);
    const estimatedKm = directKm * 1.3;
    return {
      distanceKm: +estimatedKm.toFixed(1),
      source: 'Haversine Route Estimate (x1.3)',
    };
  },

  /**
   * Fetch live prices from Mandi API with caching
   */
  async fetchLivePrices(state = 'Madhya Pradesh', commodity = 'Wheat') {
    const cacheKey = `${state}__${commodity}`.toLowerCase();
    const cached = memoryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        data: cached.data,
        cachedAt: new Date(cached.timestamp).toISOString(),
        isFromCache: true,
      };
    }

    try {
      const params = new URLSearchParams({ state, commodity });
      const url = `${PRIMARY_MANDI_API_BASE}/prices?${params.toString()}`;

      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`Mandi API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const rawRecords = json.data || [];

      // Save in cache
      const payload = {
        timestamp: Date.now(),
        data: rawRecords,
      };
      memoryCache.set(cacheKey, payload);
      saveDiskCache();

      return {
        data: rawRecords,
        cachedAt: new Date().toISOString(),
        isFromCache: false,
      };
    } catch (err) {
      console.warn(`[MandiService] Live price fetch failed (${err.message}). Checking stale cache...`);
      if (cached) {
        return {
          data: cached.data,
          cachedAt: new Date(cached.timestamp).toISOString(),
          isFromCache: true,
          warning: 'Live network fetch failed; returning cached market records.',
        };
      }
      throw err;
    }
  },

  /**
   * Get latest market modal price for crop comparison / plan integration
   */
  async getLatestMarketPrice(cropKey, state = 'Madhya Pradesh', district = '') {
    const mapping = CROP_ALIASES.find((m) => m.internalKey === cropKey);
    if (!mapping) return null;

    try {
      const { data } = await this.fetchLivePrices(state, mapping.providerCommodity);
      if (!data || data.length === 0) return null;

      // Filter by district if available
      let records = data;
      if (district) {
        const cleanD = district.toLowerCase();
        const districtMatches = data.filter((r) => (r.district || '').toLowerCase().includes(cleanD));
        if (districtMatches.length > 0) records = districtMatches;
      }

      // Sort by arrival_date desc and take highest quality/modal price
      records.sort((a, b) => new Date(b.arrival_date) - new Date(a.arrival_date));
      const latest = records[0];

      return {
        cropKey,
        commodity: mapping.displayNameHindi,
        modalPrice: latest.modal_price,
        minPrice: latest.min_price,
        maxPrice: latest.max_price,
        market: latest.market,
        district: latest.district,
        priceDate: latest.arrival_date,
        fetchedAt: latest.fetched_at,
      };
    } catch (err) {
      console.warn(`[MandiService] Could not fetch market price for ${cropKey}:`, err.message);
      return null;
    }
  },

  /**
   * Core Selling Advisory: Rank best mandis for selling a quantity of crop
   */
  async getBestMandis({
    crop,
    quantityQuintals,
    origin,
    state = 'Madhya Pradesh',
    variety = '',
    grade = '',
  }) {
    // 1. Normalize crop
    const cropMapping = this.normalizeCropName(crop);
    if (!cropMapping) {
      return {
        success: false,
        error: `Fasal "${crop}" ka live mandi data uplabdh nahi hai. Supported faslein: Gehun, Chana, Sarson, Soybean, Makka, Pyaz, Aloo, Tamatar.`,
      };
    }

    // 2. Validate quantity
    const qty = Number(quantityQuintals);
    if (isNaN(qty) || qty <= 0) {
      return {
        success: false,
        error: 'Kripya bechne ke liye sahi matra (quantity in quintals) batayein.',
      };
    }

    // 3. Resolve origin coordinates
    let originName = origin || MANDI_DEFAULTS.HOME_NAME;
    let originCoords = { lat: MANDI_DEFAULTS.HOME_LAT, lon: MANDI_DEFAULTS.HOME_LON };

    if (origin) {
      const match = getMandiCoordinates(origin);
      if (match) {
        originCoords = { lat: match.lat, lon: match.lon };
        originName = origin;
      }
    }

    // 4. Fetch live observations
    let rawRecords = [];
    let isCached = false;
    let fetchWarning = null;

    try {
      const fetchRes = await this.fetchLivePrices(state, cropMapping.providerCommodity);
      rawRecords = fetchRes.data || [];
      isCached = fetchRes.isFromCache;
      fetchWarning = fetchRes.warning;
    } catch (err) {
      return {
        success: false,
        error: `Mandi data prapt karne mein samasya aayi: ${err.message}`,
      };
    }

    if (rawRecords.length === 0) {
      return {
        success: false,
        error: `${state} mein ${cropMapping.displayNameHindi} ke liye koi sakriya mandi record nahi mila.`,
      };
    }

    // 5. Filter & Deduplicate: Keep latest observation per distinct APMC market
    const marketMap = new Map();

    for (const record of rawRecords) {
      const mName = record.market || 'Unknown Market';
      const existing = marketMap.get(mName);

      if (!existing || new Date(record.arrival_date) > new Date(existing.arrival_date)) {
        marketMap.set(mName, record);
      }
    }

    const uniqueRecords = Array.from(marketMap.values());

    // 6. Calculate Net Receipts & Rank
    const rankedCandidates = [];
    const unresolvedMandis = [];

    const now = new Date();

    const candidatePromises = uniqueRecords.map(async (record) => {
      const mandiCoords = getMandiCoordinates(record.market, record.district);
      const modalPrice = Number(record.modal_price) || 0;
      const grossReceipts = Math.round(modalPrice * qty);
      const mandiCharges = Math.round(grossReceipts * (MANDI_DEFAULTS.MANDI_CHARGE_PERCENT / 100));

      // Calculate arrival date age in days
      const arrivalDateObj = new Date(record.arrival_date);
      const ageDays = Math.max(0, Math.floor((now - arrivalDateObj) / (1000 * 60 * 60 * 24)));
      const isStale = ageDays > 3;

      if (!mandiCoords) {
        return {
          isUnresolved: true,
          data: {
            market: record.market,
            district: record.district,
            state: record.state,
            commodity: cropMapping.displayNameHindi,
            variety: record.variety,
            grade: record.grade,
            modalPrice,
            priceDate: record.arrival_date,
            isStale,
            staleDays: ageDays,
            distanceKm: null,
            transportCost: null,
            mandiCharges,
            grossReceipts,
            estimatedNetReceipts: null,
            unresolvedLocation: true,
          },
        };
      }

      // Calculate driving distance
      const distInfo = await this.calculateDistanceKm(originCoords, mandiCoords);
      const distanceKm = distInfo ? distInfo.distanceKm : null;
      const transportCost = distanceKm !== null ? Math.round(distanceKm * MANDI_DEFAULTS.TRANSPORT_RATE_PER_QUINTAL_PER_KM * qty) : null;
      const estimatedNetReceipts = (grossReceipts && transportCost !== null) ? grossReceipts - transportCost - mandiCharges : null;

      return {
        isUnresolved: false,
        data: {
          market: record.market,
          district: record.district,
          state: record.state,
          commodity: cropMapping.displayNameHindi,
          variety: record.variety,
          grade: record.grade,
          modalPrice,
          priceDate: record.arrival_date,
          isStale,
          staleDays: ageDays,
          distanceKm,
          distanceSource: distInfo?.source || 'Calculated',
          transportCost,
          mandiCharges,
          grossReceipts,
          estimatedNetReceipts,
        },
      };
    });

    const evaluated = await Promise.all(candidatePromises);

    for (const item of evaluated) {
      if (item.isUnresolved) {
        unresolvedMandis.push(item.data);
      } else {
        rankedCandidates.push(item.data);
      }
    }


    // Sort by estimatedNetReceipts descending
    rankedCandidates.sort((a, b) => (b.estimatedNetReceipts || 0) - (a.estimatedNetReceipts || 0));

    const topMandis = rankedCandidates.slice(0, 5);

    // Build concise Hinglish summary
    let summaryHindi = '';
    if (topMandis.length > 0) {
      const best = topMandis[0];
      const second = topMandis[1];
      summaryHindi = `Aapke ${qty} quintal ${cropMapping.displayNameHindi} ke liye sabse behtar mandi ${best.market} (${best.district}) hai, jahan modal bhav ₹${best.modalPrice.toLocaleString('en-IN')}/quintal hai. Transport (₹${best.transportCost?.toLocaleString('en-IN')}) aur 1.5% mandi charges katne ke baad anumanit shuddh bachat lagbhag ₹${best.estimatedNetReceipts?.toLocaleString('en-IN')} hogi.`;
      if (second) {
        summaryHindi += ` Doosra vikalp ${second.market} (${second.district}) hai jahan net lagbhag ₹${second.estimatedNetReceipts?.toLocaleString('en-IN')} mil sakta hai.`;
      }
    } else {
      summaryHindi = `${cropMapping.displayNameHindi} ke liye mandi data prapt hua hai par kisi mandi ki location verify nahi ho saki.`;
    }

    const latestDate = uniqueRecords[0]?.arrival_date || '2026-09-24';

    return {
      success: true,
      query: {
        crop: cropMapping.displayNameHindi,
        quantityQuintals: qty,
        originName,
        state,
      },
      topMandis,
      unresolvedMandis: unresolvedMandis.slice(0, 3),
      summaryHindi,
      staleWarning: `Dhyan dein: Sabse taja uplabdh mandi data ${latestDate} ka hai. Bhav dynamic rehte hain.`,
      warningDisclaimer: 'Yeh transport aur charges ka andaza hai. Jaane se pehle mandi mein bhav, quality aur kharch confirm kar lena.',
      totalCandidatesCount: uniqueRecords.length,
      cached: isCached,
      fetchWarning,
    };
  },
};
