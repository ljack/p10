#!/usr/bin/env node

/**
 * Test script to demonstrate enhanced error handling
 * Run this after starting the server: node test-error-handling.js
 */

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(description, method, url, body = null) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body !== null) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      console.log(`   Body: ${options.body}`);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.log(`   Error:`, error.message);
    return { error: error.message };
  }
}

async function runErrorHandlingTests() {
  console.log('🚀 Starting Error Handling Tests for Todo API\n');
  console.log('Make sure the server is running on http://localhost:3001\n');

  // Test 1: Invalid JSON
  await testEndpoint(
    'Invalid JSON format',
    'POST',
    `${BASE_URL}/api/todos`,
    '{"text": "Invalid JSON"' // Missing closing brace
  );

  // Test 2: Missing required field
  await testEndpoint(
    'Missing required text field',
    'POST',
    `${BASE_URL}/api/todos`,
    {}
  );

  // Test 3: Empty text
  await testEndpoint(
    'Empty text field',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: '', completed: false }
  );

  // Test 4: Whitespace-only text
  await testEndpoint(
    'Whitespace-only text',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: '   ', completed: false }
  );

  // Test 5: Text too long
  await testEndpoint(
    'Text exceeds character limit',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: 'a'.repeat(501), completed: false }
  );

  // Test 6: Invalid completed type
  await testEndpoint(
    'Invalid completed field type',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: 'Valid text', completed: 'not-a-boolean' }
  );

  // Test 7: Extra unexpected fields
  await testEndpoint(
    'Unexpected fields in request',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: 'Valid text', completed: false, priority: 'high', category: 'work' }
  );

  // Test 8: Invalid ID format (non-numeric)
  await testEndpoint(
    'Invalid ID format (non-numeric)',
    'GET',
    `${BASE_URL}/api/todos/abc`
  );

  // Test 9: Invalid ID format (negative)
  await testEndpoint(
    'Invalid ID format (negative)',
    'GET',
    `${BASE_URL}/api/todos/-5`
  );

  // Test 10: Invalid ID format (decimal)
  await testEndpoint(
    'Invalid ID format (decimal)',
    'GET',
    `${BASE_URL}/api/todos/1.5`
  );

  // Test 11: Todo not found
  await testEndpoint(
    'Todo not found',
    'GET',
    `${BASE_URL}/api/todos/9999`
  );

  // Test 12: Update with no fields
  await testEndpoint(
    'Update with no fields provided',
    'PUT',
    `${BASE_URL}/api/todos/1`,
    {}
  );

  // Test 13: Update non-existent todo
  await testEndpoint(
    'Update non-existent todo',
    'PUT',
    `${BASE_URL}/api/todos/9999`,
    { text: 'Updated text' }
  );

  // Test 14: Delete non-existent todo
  await testEndpoint(
    'Delete non-existent todo',
    'DELETE',
    `${BASE_URL}/api/todos/9999`
  );

  // Test 15: Invalid route
  await testEndpoint(
    'Invalid route',
    'GET',
    `${BASE_URL}/api/invalid-route`
  );

  // Test 16: Valid operations (should succeed)
  console.log('\n✅ Testing valid operations (should succeed):\n');

  await testEndpoint(
    'Create valid todo',
    'POST',
    `${BASE_URL}/api/todos`,
    { text: 'Test todo', completed: false }
  );

  await testEndpoint(
    'Update existing todo',
    'PUT',
    `${BASE_URL}/api/todos/1`,
    { completed: true }
  );

  await testEndpoint(
    'Get all todos',
    'GET',
    `${BASE_URL}/api/todos`
  );

  console.log('\n🎉 Error handling tests completed!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This test requires Node.js 18+ with built-in fetch support.');
  console.error('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

runErrorHandlingTests().catch(console.error);