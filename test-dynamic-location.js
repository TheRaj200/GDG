import assert from 'assert';

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
  return { status: res.status, data, sessionId: res.headers.get('x-session-id') || sessionId };
}

async function testDynamicLocation(locationName, areaAcres) {
  console.log(`\nTesting Dynamic Location: "${locationName}" with ${areaAcres} Acre...`);
  const init = await req('/session/init');
  const sess = init.sessionId;

  // Answer location
  const locRes = await req('/farm/message', 'POST', { message: `Main ${locationName} se hoon` }, sess);
  console.log(`  Location Recorded: ${locRes.data.profile.district}`);
  assert.ok(locRes.data.profile.district.toLowerCase().includes(locationName.toLowerCase()));

  // Answer area
  await req('/farm/message', 'POST', { message: `${areaAcres} acre zameen hai` }, sess);
  // Answer water
  await req('/farm/message', 'POST', { message: 'Tubewell paryapt paani' }, sess);
  // Answer sowing
  await req('/farm/message', 'POST', { message: '15-30 November' }, sess);
  // Answer previous crop
  await req('/farm/message', 'POST', { message: 'Soybean' }, sess);
  // Answer budget
  const finalRes = await req('/farm/message', 'POST', { message: '50000 budget' }, sess);

  assert.strictEqual(finalRes.data.profile.intakeCompleted, true);

  // Fetch comparison
  const compRes = await req('/crops/compare', 'GET', null, sess);
  assert.strictEqual(compRes.data.success, true);
  assert.strictEqual(compRes.data.data.supported, true);
  console.log(`  Live Weather Resolved for: ${compRes.data.data.liveWeather.location}`);
  console.log(`  Live Temperature: ${compRes.data.data.liveWeather.currentTempC}°C | 7d Rain: ${compRes.data.data.liveWeather.rainForecast7DaysMm}mm`);
  console.log(`  Crops Compared Count: ${compRes.data.data.comparisons.length}`);
  console.log(`  AI Recommendation: "${compRes.data.data.aiExplanationHindi}"`);
  console.log(`  [PASS] Dynamic Location "${locationName}" successfully analyzed!`);
}

async function run() {
  await testDynamicLocation('Pune', 8);
  await testDynamicLocation('Jaipur', 4);
  await testDynamicLocation('Goa', 3);
  console.log('\n ALL DYNAMIC LOCATION TESTS PASSED 100%!');
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
