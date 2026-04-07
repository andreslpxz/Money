import { POST } from '../route.ts';
import assert from 'node:assert';

async function testNoFlowJson() {
  console.log('Running test: should return 400 if no flowJson is provided');
  const req = new Request('http://localhost/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({})
  });

  const response = await POST(req);
  const data = await response.json();

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(data, {
    success: false,
    error: "No flow JSON provided"
  });
  console.log('✅ Passed');
}

async function testNullFlowJson() {
  console.log('Running test: should return 400 if flowJson is null');
  const req = new Request('http://localhost/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ flowJson: null })
  });

  const response = await POST(req);
  const data = await response.json();

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(data, {
    success: false,
    error: "No flow JSON provided"
  });
  console.log('✅ Passed');
}

async function runTests() {
  try {
    await testNoFlowJson();
    await testNullFlowJson();
    console.log('\nAll tests passed! 🎉');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
