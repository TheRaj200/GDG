/**
 * Kisan Ai - Daily Mandi Price Refresh Script
 *
 * Fetches latest live observations from Agmarknet API for all supported crops in Madhya Pradesh,
 * verifies record freshness, and caches them to disk (`server/data/mandi_cache.json`).
 *
 * Usage:
 *   node scripts/refresh-prices.js
 */

import { mandiService } from '../src/services/mandiService.js';

const COMMODITIES = ['Wheat', 'Bengal Gram(Gram)(Whole)', 'Mustard', 'Soyabean', 'Maize', 'Onion', 'Potato', 'Tomato'];
const STATE = 'Madhya Pradesh';

async function refreshAllPrices() {
  console.log(`[Price-Refresh] Starting daily Agmarknet price sync for ${STATE}...`);
  const startTime = Date.now();
  let totalRecords = 0;
  const results = [];

  for (const commodity of COMMODITIES) {
    try {
      console.log(`[Price-Refresh] Fetching ${commodity}...`);
      const res = await mandiService.fetchLivePrices(STATE, commodity);
      const count = res.data?.length || 0;
      totalRecords += count;
      const latestArrival = res.data?.[0]?.arrival_date || 'N/A';
      results.push({ commodity, count, latestArrival, isFromCache: res.isFromCache });
      console.log(`  ✓ ${commodity}: ${count} records (Latest arrival: ${latestArrival})`);
    } catch (err) {
      console.error(`  ✗ ${commodity} failed:`, err.message);
      results.push({ commodity, error: err.message });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n[Price-Refresh] Completed in ${elapsed}s. Total records: ${totalRecords}`);
  console.table(results);
}

refreshAllPrices()
  .then(() => {
    console.log('[Price-Refresh] Sync completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Price-Refresh] Fatal sync error:', err);
    process.exit(1);
  });
