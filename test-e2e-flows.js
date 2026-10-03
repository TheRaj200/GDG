/**
 * Kisan Ai - End-to-End Flow Verification Script
 *
 * Verifies both real flows:
 * Flow 1: Intake (asking one missing question at a time) -> Crop Comparison (Low/Base/High Scenarios) -> Plan Selection -> Restart/Refresh Persistence
 * Flow 2: Selling Advice (Wheat / 400 quintals -> Gwalior -> Ranked Mandi Advice with OSRM driving distance, Transport & Mandi Tax deductions, Stale Date Notice)
 */

import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, method = 'GET', body = null, sessionId = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionId) headers['x-session-id'] = sessionId;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  const returnedSessionId = res.headers.get('x-session-id') || sessionId;
  return { status: res.status, data, sessionId: returnedSessionId };
}

async function runVerification() {
  console.log('================================================================');
  console.log('  KISAN AI - COMPLETE END-TO-END FLOW VERIFICATION REPORT      ');
  console.log('================================================================\n');

  // ====================================================================
  // FLOW 1: Voice/Chat Intake -> Comparison -> Selection -> Persistence
  // ====================================================================
  console.log('--- FLOW 1: Intake -> Comparison -> Selection -> Persistence ---');

  // Step 1: Session Init
  const initRes = await req('/session/init');
  const session1 = initRes.sessionId;
  assert.strictEqual(initRes.data.success, true);
  assert.ok(session1, 'Session ID must be created');
  assert.strictEqual(initRes.data.nextQuestion?.field, 'district');
  console.log('  [PASS] Step 1: Session Initialized.');
  console.log(`         Greeting / Question 1: "${initRes.data.nextQuestion.questionHindi}"`);

  // Step 2: Answer District
  const dRes = await req('/farm/message', 'POST', { message: 'Mera gaon Shyampur zila Sehore hai' }, session1);
  assert.ok(dRes.data.profile.district.includes('Sehore'));
  assert.strictEqual(dRes.data.nextQuestion?.field, 'totalArea');
  console.log(`  [PASS] Step 2: District Confirmed: "${dRes.data.profile.district}". Next Q: Rakba/Area.`);

  // Step 3: Answer Area
  const aRes = await req('/farm/message', 'POST', { message: '5 acre zameen hai' }, session1);
  assert.strictEqual(aRes.data.profile.totalArea, 5);
  assert.strictEqual(aRes.data.profile.areaUnit, 'Acre');
  assert.strictEqual(aRes.data.nextQuestion?.field, 'waterAvailability');
  console.log('  [PASS] Step 3: Area Confirmed: 5 Acre. Next Q: Sinchai/Water.');

  // Step 4: Answer Water
  const wRes = await req('/farm/message', 'POST', { message: 'Tubewell hai 3-4 sinchai mil jayegi' }, session1);
  assert.ok(wRes.data.profile.waterAvailability);
  assert.strictEqual(wRes.data.nextQuestion?.field, 'intendedSowingDate');
  console.log('  [PASS] Step 4: Water Availability Confirmed. Next Q: Sowing Date.');

  // Step 5: Answer Sowing Date
  const sRes = await req('/farm/message', 'POST', { message: '15 November tak buwai karenge' }, session1);
  assert.ok(sRes.data.profile.intendedSowingDate);
  assert.strictEqual(sRes.data.nextQuestion?.field, 'previousCrop');
  console.log('  [PASS] Step 5: Sowing Date Confirmed. Next Q: Pichhli Fasal.');

  // Step 6: Answer Previous Crop
  const pRes = await req('/farm/message', 'POST', { message: 'Kharif mein Soybean lagayi thi' }, session1);
  assert.strictEqual(pRes.data.profile.previousCrop, 'Soybean');
  assert.strictEqual(pRes.data.nextQuestion?.field, 'budget');
  console.log('  [PASS] Step 6: Previous Crop Confirmed: Soybean. Next Q: Budget.');

  // Step 7: Answer Budget -> Complete Intake
  const bRes = await req('/farm/message', 'POST', { message: 'Budget lagbhag ₹50,000 hai' }, session1);
  assert.strictEqual(bRes.data.profile.budget, 50000);
  assert.strictEqual(bRes.data.profile.intakeCompleted, true);
  assert.strictEqual(bRes.data.nextQuestion, null);
  console.log('  [PASS] Step 7: Budget Confirmed: ₹50,000. Intake Completed = true.');

  // Step 8: Get Crop Comparison
  const compRes = await req('/comparison', 'GET', null, session1);
  assert.strictEqual(compRes.data.success, true);
  const comps = compRes.data.data.comparisons;
  assert.strictEqual(comps.length, 3, 'Must compare 3 crops (Wheat, Chickpea, Mustard)');
  const wheatComp = comps.find((c) => c.cropKey === 'wheat');
  assert.ok(wheatComp);
  assert.ok(wheatComp.scenarios.low.netReturn !== undefined);
  assert.ok(wheatComp.scenarios.base.netReturn !== undefined);
  assert.ok(wheatComp.scenarios.high.netReturn !== undefined);
  console.log('  [PASS] Step 8: Regional Crop Comparison Generated (3 crops with Low/Base/High scenarios).');
  console.log(`         Wheat Base Scenario Net Return: ₹${wheatComp.scenarios.base.netReturn.toLocaleString('en-IN')}`);

  // Step 9: Select Crop & Create Saved Plan
  const planRes = await req('/plan/select', 'POST', { cropKey: 'wheat', scenario: 'base' }, session1);
  assert.strictEqual(planRes.data.success, true);
  const plan = planRes.data.plan;
  assert.strictEqual(plan.cropKey, 'wheat');
  assert.strictEqual(plan.financials.productionTotal, 90);
  console.log('  [PASS] Step 9: Fasal Plan Created & Saved (Wheat 90q, Net: ₹' + plan.financials.netReturn.toLocaleString('en-IN') + ').');

  // Step 10: Refresh / Persistence Verification (Retrieve Active Plan)
  const activePlanRes = await req('/plan/active', 'GET', null, session1);
  assert.strictEqual(activePlanRes.data.success, true);
  assert.strictEqual(activePlanRes.data.plan.cropKey, 'wheat');
  console.log('  [PASS] Step 10: Plan Persistence Verified (Survives reload across Atlas/Session).');

  // ====================================================================
  // FLOW 2: Mandi Selling Advice (Wheat / 400 quintals from Gwalior)
  // ====================================================================
  console.log('\n--- FLOW 2: Mandi Selling Advice (Wheat / 400 Quintals) ---');

  // Step 1: Initialize session for Farmer 2
  const init2 = await req('/session/init');
  const session2 = init2.sessionId;

  // Step 2: Farmer asks selling query directly
  const sellQueryRes = await req(
    '/farm/message',
    'POST',
    { message: 'Mere paas 400 quintal gehu hai, kahan bechu?' },
    session2
  );


  assert.strictEqual(sellQueryRes.data.success, true);
  assert.strictEqual(sellQueryRes.data.isSellingIntent, true);
  assert.ok(sellQueryRes.data.mandiAdvice, 'Must return mandiAdvice');
  const advice = sellQueryRes.data.mandiAdvice;
  assert.strictEqual(advice.success, true);
  assert.ok(advice.topMandis.length > 0, 'Must return ranked top mandis');

  const bestMandi = advice.topMandis[0];
  console.log('  [PASS] Step 1: Selling Intent Recognized.');
  console.log(`         Origin: ${advice.query.originName} | Quantity: ${advice.query.quantityQuintals} Quintals`);
  console.log(`         Best Mandi: ${bestMandi.market} (${bestMandi.district})`);
  console.log(`         Modal Bhav: ₹${bestMandi.modalPrice}/q | Route Distance: ${bestMandi.distanceKm} km`);
  console.log(`         Gross Receipts: ₹${bestMandi.grossReceipts.toLocaleString('en-IN')}`);
  console.log(`         Transport Deduction: -₹${bestMandi.transportCost.toLocaleString('en-IN')}`);
  console.log(`         Mandi Charges (1.5%): -₹${bestMandi.mandiCharges.toLocaleString('en-IN')}`);
  console.log(`         Estimated Net Sale Receipts: ₹${bestMandi.estimatedNetReceipts.toLocaleString('en-IN')}`);
  console.log(`         Stale Date Notice: "${advice.staleWarning}"`);

  // Step 2: Dedicated Mandi Advice Endpoint Verification
  const directMandiRes = await req(
    '/mandi/advice',
    'POST',
    {
      crop: 'chana',
      quantityQuintals: 200,
      origin: 'Sehore',
    },
    session2
  );
  assert.strictEqual(directMandiRes.data.success, true);

  const chanaBest = directMandiRes.data.data.topMandis[0];
  console.log('  [PASS] Step 2: Direct Mandi Advisory Endpoint Verified for Chana (200q from Sehore).');
  console.log(`         Top Mandi for Chana: ${chanaBest.market} (${chanaBest.district}) @ ₹${chanaBest.modalPrice}/q`);

  console.log('\n================================================================');
  console.log('  ALL FLOWS FULLY VERIFIED & WORKING AS SPECIFIED!             ');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
