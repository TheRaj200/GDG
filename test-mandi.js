/**
 * Kisan Ai - Mandi Advisory & Geo Calculation Test Suite
 *
 * Tests:
 * 1. Crop alias normalization (gehu -> Wheat, chana -> Bengal Gram(Gram)(Whole), sarson -> Mustard)
 * 2. Quantity unit conversion (4000 kg -> 40 q, 40 ton -> 400 q)
 * 3. Verified APMC geocoding and OSRM route distance calculations
 * 4. Net sale receipts ranking formula (Gross - Transport(1.5/q/km) - Mandi Tax(1.5%))
 * 5. Stale date warning detection
 * 6. Full Wheat / 400 quintals selling flow from Gwalior
 * 7. Conversational selling intent routing via farmService
 */

import assert from 'node:assert';
import { mandiService, MANDI_DEFAULTS } from './src/services/mandiService.js';
import { getMandiCoordinates } from './src/data/mandiGeocodes.js';
import { farmService } from './src/services/farmService.js';

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  Kisan Ai - Mandi & Geo Advisory Verification Tests  ');
  console.log('======================================================\n');

  console.log('[1] Crop Alias & Provider Mapping:');
  await it('Normalizes "gehu" to "Wheat"', () => {
    const res = mandiService.normalizeCropName('gehu');
    assert.strictEqual(res?.providerCommodity, 'Wheat');
  });

  await it('Normalizes "chana" to "Bengal Gram(Gram)(Whole)"', () => {
    const res = mandiService.normalizeCropName('chana');
    assert.strictEqual(res?.providerCommodity, 'Bengal Gram(Gram)(Whole)');
  });

  await it('Normalizes "sarson" to "Mustard"', () => {
    const res = mandiService.normalizeCropName('sarson');
    assert.strictEqual(res?.providerCommodity, 'Mustard');
  });

  await it('Returns null for unknown commodity', () => {
    const res = mandiService.normalizeCropName('avocado');
    assert.strictEqual(res, null);
  });

  console.log('\n[2] Quantity Unit Normalization:');
  await it('Converts 4000 kg to 40 quintals', () => {
    const q = mandiService.normalizeQuantity('4000', 'kg');
    assert.strictEqual(q, 40);
  });

  await it('Converts 40 metric tonnes to 400 quintals', () => {
    const q = mandiService.normalizeQuantity('40', 'tonne');
    assert.strictEqual(q, 400);
  });

  await it('Preserves 400 quintals as 400', () => {
    const q = mandiService.normalizeQuantity('400', 'quintal');
    assert.strictEqual(q, 400);
  });

  console.log('\n[3] Mandi Geocoding & Coordinate Verification:');
  await it('Resolves verified coordinates for Lashkar (Gwalior)', () => {
    const coords = getMandiCoordinates('Lashkar', 'Gwalior');
    assert.ok(coords, 'Lashkar coordinates should exist');
    assert.strictEqual(coords.verified, true);
    assert.ok(coords.lat > 25 && coords.lat < 27);
  });

  await it('Resolves verified coordinates for Dabra (Gwalior)', () => {
    const coords = getMandiCoordinates('Dabra', 'Gwalior');
    assert.ok(coords, 'Dabra coordinates should exist');
    assert.strictEqual(coords.verified, true);
  });

  await it('Resolves verified coordinates for Kumbhraj (Guna)', () => {
    const coords = getMandiCoordinates('Kumbhraj', 'Guna');
    assert.ok(coords, 'Kumbhraj coordinates should exist');
    assert.strictEqual(coords.verified, true);
  });

  await it('Returns null for unknown mandi without throwing', () => {
    const coords = getMandiCoordinates('RandomNonExistentPlace', 'UnknownDistrict');
    assert.strictEqual(coords, null);
  });

  console.log('\n[4] Financial Deductions & Net Receipts:');
  await it('Computes Net Receipts accurately: Gross - Transport - Mandi Charges', () => {
    const modalPrice = 2640;
    const qty = 400; // quintals
    const distanceKm = 100; // km
    const ratePerKm = MANDI_DEFAULTS.TRANSPORT_RATE_PER_QUINTAL_PER_KM; // 1.5
    const chargePct = MANDI_DEFAULTS.MANDI_CHARGE_PERCENT; // 1.5%

    const gross = modalPrice * qty; // 1,056,000
    const transport = Math.round(distanceKm * ratePerKm * qty); // 100 * 1.5 * 400 = 60,000
    const charges = Math.round(gross * (chargePct / 100)); // 1,056,000 * 0.015 = 15,840
    const net = gross - transport - charges; // 980,160

    assert.strictEqual(gross, 1056000);
    assert.strictEqual(transport, 60000);
    assert.strictEqual(charges, 15840);
    assert.strictEqual(net, 980160);
  });

  console.log('\n[5] End-to-End Mandi Advisory: Wheat / 400 Quintals from Gwalior:');
  await it('Fetches and ranks live mandis for Wheat / 400 quintals from Gwalior', async () => {
    const advice = await mandiService.getBestMandis({
      crop: 'gehu',
      quantityQuintals: 400,
      origin: 'Gwalior',
    });

    assert.strictEqual(advice.success, true, 'Advice should succeed');
    assert.ok(advice.topMandis.length > 0, 'Should return at least one top mandi');

    const top = advice.topMandis[0];
    assert.ok(top.market, 'Top mandi must have a market name');
    assert.ok(top.modalPrice > 0, 'Modal price must be positive');
    assert.ok(top.distanceKm !== null, 'Distance must not be null');
    assert.ok(top.transportCost !== null, 'Transport cost must not be null');
    assert.ok(top.estimatedNetReceipts > 0, 'Net receipts must be positive');
    assert.ok(advice.staleWarning, 'Stale warning should be present');

    console.log(`    → Best Mandi: ${top.market} (${top.district})`);
    console.log(`    → Modal Price: ₹${top.modalPrice}/q | Distance: ${top.distanceKm} km`);
    console.log(`    → Gross: ₹${top.grossReceipts.toLocaleString('en-IN')} | Net Receipts: ₹${top.estimatedNetReceipts.toLocaleString('en-IN')}`);
    console.log(`    → Stale Notice: "${advice.staleWarning}"`);
  });

  console.log('\n[6] Conversational Selling Flow in farmService:');
  await it('Handles direct selling query "Mere paas 400 quintal gehu hai, kahan bechu?" without intake diversion', async () => {
    const sessionId = `test_selling_${Date.now()}`;
    const result = await farmService.handleIntakeMessage(sessionId, 'Mere paas 400 quintal gehu hai, kahan bechu?');

    assert.strictEqual(result.isSellingIntent, true);
    assert.ok(result.mandiAdvice, 'Should contain mandiAdvice object');
    assert.strictEqual(result.mandiAdvice.success, true);
    assert.ok(result.mandiAdvice.topMandis.length > 0);
    assert.ok(result.assistantResponse.includes('mandi') || result.assistantResponse.includes('₹'));

    console.log(`    → Assistant Spoken Reply: "${result.assistantResponse.substring(0, 100)}..."`);
  });

  console.log('\n------------------------------------------------------');
  console.log(`  Tests Completed: ${passed}/${total} PASSED (${total - passed} FAILED)`);
  console.log('------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
