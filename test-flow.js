import assert from 'node:assert';
import http from 'http';
import express from 'express';
import cors from 'cors';
import apiRoutes from './src/routes/index.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import { connectDB } from './src/config/db.js';

/**
 * End-to-end Integration Verification for Kisan Ai Backend (Hinglish Flow)
 * Using strict Node.js assertions (fails with non-zero exit code if any check fails).
 */

async function runTests() {
  console.log('--- Starting Kisan Ai Strict Backend Verification (Hinglish Flow) ---');

  // Launch local test server on an ephemeral port
  const app = express();
  app.use(cors({ exposedHeaders: ['x-session-id'] }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiRoutes);
  app.use(errorHandler);

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}/api`;

  console.log(`[Test Server] Running on ${BASE_URL}`);

  try {
    // 1. Health check
    console.log('\n[Test 1] Health Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint must return 200');
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'ok', 'Health status must be ok');
    assert.strictEqual(health.districtSupported, 'Sehore, Madhya Pradesh');
    console.log('✓ Health check passed.');

    // 2. Reject forged / unissued session on protected route
    console.log('\n[Test 2] Security: Reject forged session credentials...');
    const badRes = await fetch(`${BASE_URL}/farm/profile`, {
      headers: { 'x-session-id': 'forged_fake_session_123' },
    });
    assert.strictEqual(badRes.status, 401, 'Unissued session token must be rejected with HTTP 401');
    console.log('✓ Unissued session token rejected with HTTP 401.');

    // 3. Issue server session for Farmer A
    console.log('\n[Test 3] Server Session Initialization for Farmer A...');
    const initResA = await fetch(`${BASE_URL}/session/init`);
    assert.strictEqual(initResA.status, 200);
    const initA = await initResA.json();
    assert.ok(initA.sessionId.startsWith('kisan_'), 'Server-issued session ID must start with kisan_');
    assert.strictEqual(initA.nextQuestion.field, 'district', 'First question must prompt for location/district');
    const sessionA = initA.sessionId;
    console.log(`✓ Farmer A session issued: ${sessionA}`);

    // 4. Location confirmation and coverage check
    console.log('\n[Test 4] Location Confirmation (Sehore)...');
    const locRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Main Sehore zila se hoon' }),
    });
    assert.strictEqual(locRes.status, 200);
    const locData = await locRes.json();
    assert.strictEqual(locData.profile.district, 'Sehore (MP)', 'District must be Sehore (MP)');
    assert.strictEqual(locData.nextQuestion.field, 'totalArea', 'Next question must be totalArea');
    console.log('✓ Location confirmed as Sehore.');

    // 5. Rule-based intake parsing: Area, Water, Sowing Date chip, Previous Crop chip, Budget chip
    console.log('\n[Test 5] Rule-based Parser: Area, Water, Chips...');
    
    // Area
    const areaRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Mere paas 5 acre zameen hai' }),
    });
    const areaData = await areaRes.json();
    assert.strictEqual(areaData.profile.totalArea, 5, 'Total area must be 5');
    assert.strictEqual(areaData.profile.areaUnit, 'Acre');

    // Water
    const waterRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tubewell hai 3-4 paani mil jata hai' }),
    });
    const waterData = await waterRes.json();
    assert.ok(waterData.profile.waterAvailability.includes('Paryapt'));

    // Sowing Date chip (15-30 November)
    const dateRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '15-30 November' }),
    });
    const dateData = await dateRes.json();
    assert.strictEqual(dateData.profile.intendedSowingDate, '15-30 November', 'Must preserve 15-30 November date range');

    // Previous crop chip (Khet Khali Tha)
    const cropRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Khet Khali Tha' }),
    });
    const cropData = await cropRes.json();
    assert.strictEqual(cropData.profile.previousCrop, 'Khet Khali Tha', 'Must parse Khet Khali Tha option chip');

    // Budget chip with comma and currency (₹40,000)
    const budgetRes = await fetch(`${BASE_URL}/farm/message`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '₹40,000' }),
    });
    const budgetData = await budgetRes.json();
    assert.strictEqual(budgetData.profile.budget, 40000, 'Must parse ₹40,000 to number 40000');
    assert.strictEqual(budgetData.profile.intakeCompleted, true, 'Intake must be complete');
    console.log('✓ All chips and inputs correctly parsed without AI dependency.');

    // 6. Confirm Soil Data
    console.log('\n[Test 6] Soil Data Confirmation...');
    const soilRes = await fetch(`${BASE_URL}/soil/confirm`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ph: 7.8,
        organicCarbon: 0.58,
        nitrogen: 245,
        phosphorus: 18,
        potassium: 310,
        labName: 'KVK Sehore',
      }),
    });
    const soil = await soilRes.json();
    assert.strictEqual(soil.profile.soilTestConfirmed, true);
    assert.strictEqual(soil.profile.soilData.ph, 7.8);
    console.log('✓ Soil data confirmed.');

    // 7. Crop Comparison
    console.log('\n[Test 7] Crop Comparison for 5 Acres in Sehore...');
    const compRes = await fetch(`${BASE_URL}/comparison`, {
      headers: { 'x-session-id': sessionA },
    });
    const comp = await compRes.json();
    assert.strictEqual(comp.data.supported, true);
    assert.strictEqual(comp.data.comparisons.length, 3);
    const wheat = comp.data.comparisons.find((c) => c.cropKey === 'wheat');
    assert.strictEqual(wheat.scenarios.base.totalProductionQuintals, 90, '5 Acres * 18 q/acre = 90 q');
    assert.strictEqual(wheat.costBreakdown.total, 62500, '5 Acres * 12,500 = 62,500');
    console.log(`✓ Deterministic comparison verified: Wheat 90 q, Cost ₹62,500, Net return ₹${wheat.scenarios.base.netReturn}`);

    // 8. Plan Selection
    console.log('\n[Test 8] Plan Selection (Wheat - Base Scenario)...');
    const planRes = await fetch(`${BASE_URL}/plan/select`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cropKey: 'wheat', scenario: 'base' }),
    });
    const plan = await planRes.json();
    assert.strictEqual(plan.plan.cropKey, 'wheat');
    assert.strictEqual(plan.plan.financials.productionTotal, 90);
    console.log('✓ Plan successfully saved.');

    // 9. Follow-up: Hectare Conversion (2 Hectare = 4.94 Acres) & Explicit Update
    console.log('\n[Test 9] Hectare Conversion & Explicit Update...');
    const updateFollowUpRes = await fetch(`${BASE_URL}/plan/followup`, {
      method: 'POST',
      headers: { 'x-session-id': sessionA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Mera area 2 hectare kar do' }),
    });
    const updateFollowUp = await updateFollowUpRes.json();
    assert.ok(updateFollowUp.answer.includes('2 Hectare') || updateFollowUp.answer.includes('4.94'), 'Must calculate for 2 Hectare (~4.94 Acres)');
    
    const refreshedPlanRes = await fetch(`${BASE_URL}/plan/active`, {
      headers: { 'x-session-id': sessionA },
    });
    const refreshedPlan = await refreshedPlanRes.json();
    assert.strictEqual(refreshedPlan.plan.area, 2, 'Profile and plan must be updated to 2');
    assert.strictEqual(refreshedPlan.plan.areaUnit, 'Hectare', 'Area unit must be Hectare');
    console.log('✓ Accurate hectare conversion and explicit plan recalculation verified.');

    // 10. Farmer B Session Isolation
    console.log('\n[Test 10] Session Isolation Verification (Farmer B)...');
    const initResB = await fetch(`${BASE_URL}/session/init`);
    const initB = await initResB.json();
    const sessionB = initB.sessionId;
    assert.notStrictEqual(sessionA, sessionB, 'Session IDs must be distinct');
    assert.strictEqual(initB.profile.totalArea, 0, 'Farmer B profile must be clean and unpolluted');
    assert.strictEqual(initB.activePlan, null, 'Farmer B must have no active plan');
    console.log('✓ Strict session isolation between Farmer A and Farmer B verified.');

    console.log('\n======================================================');
    console.log('🎉 ALL TESTS PASSED WITH ZERO FAILURES!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
