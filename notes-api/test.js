#!/usr/bin/env node
/**
 * Test script for Notes API CRUD endpoints
 */

const BASE_URL = 'http://localhost:3001';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n🧪 Testing Notes API CRUD Endpoints\n');
  
  let createdNoteId;
  
  // Test: GET /api/notes (empty)
  await test('GET /api/notes returns empty array initially', async () => {
    const { status, data } = await request('GET', '/api/notes');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error('Expected success: true');
    if (!Array.isArray(data.data)) throw new Error('Expected data array');
  });
  
  // Test: POST /api/notes - create note
  await test('POST /api/notes creates a new note', async () => {
    const { status, data } = await request('POST', '/api/notes', {
      title: 'My First Note',
      content: 'This is the content of my first note.'
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}`);
    if (!data.success) throw new Error('Expected success: true');
    if (!data.data.id) throw new Error('Expected note to have id');
    if (data.data.title !== 'My First Note') throw new Error('Title mismatch');
    if (!data.data.createdAt) throw new Error('Expected createdAt');
    if (!data.data.updatedAt) throw new Error('Expected updatedAt');
    createdNoteId = data.data.id;
  });
  
  // Test: POST /api/notes - validation error
  await test('POST /api/notes returns 400 for missing title', async () => {
    const { status, data } = await request('POST', '/api/notes', { content: 'No title' });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success) throw new Error('Expected success: false');
  });
  
  // Test: GET /api/notes/:id
  await test('GET /api/notes/:id returns the created note', async () => {
    const { status, data } = await request('GET', `/api/notes/${createdNoteId}`);
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.id !== createdNoteId) throw new Error('ID mismatch');
    if (data.data.title !== 'My First Note') throw new Error('Title mismatch');
  });
  
  // Test: GET /api/notes/:id - not found
  await test('GET /api/notes/999 returns 404', async () => {
    const { status, data } = await request('GET', '/api/notes/999');
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
    if (data.success) throw new Error('Expected success: false');
  });
  
  // Test: PUT /api/notes/:id - update
  await test('PUT /api/notes/:id updates the note', async () => {
    const { status, data } = await request('PUT', `/api/notes/${createdNoteId}`, {
      title: 'Updated Title',
      content: 'Updated content.'
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.title !== 'Updated Title') throw new Error('Title not updated');
    if (data.data.content !== 'Updated content.') throw new Error('Content not updated');
  });
  
  // Test: PUT /api/notes/:id - partial update
  await test('PUT /api/notes/:id allows partial update', async () => {
    const { status, data } = await request('PUT', `/api/notes/${createdNoteId}`, {
      content: 'Only content updated'
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.title !== 'Updated Title') throw new Error('Title should remain');
    if (data.data.content !== 'Only content updated') throw new Error('Content not updated');
  });
  
  // Test: PUT /api/notes/999 - not found
  await test('PUT /api/notes/999 returns 404', async () => {
    const { status } = await request('PUT', '/api/notes/999', { title: 'Test' });
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });
  
  // Test: Create another note
  await test('POST /api/notes creates a second note', async () => {
    const { status, data } = await request('POST', '/api/notes', {
      title: 'Second Note',
      content: 'Content of the second note.'
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}`);
    if (data.data.id !== createdNoteId + 1) throw new Error('Expected incremental ID');
  });
  
  // Test: GET /api/notes - multiple notes
  await test('GET /api/notes returns all notes', async () => {
    const { status, data } = await request('GET', '/api/notes');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.count !== 2) throw new Error(`Expected 2 notes, got ${data.count}`);
  });
  
  // ===== SEARCH TESTS =====
  
  // Test: Search by title
  await test('GET /api/notes/search finds notes by title', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=Updated');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error('Expected success: true');
    if (data.count !== 1) throw new Error(`Expected 1 result, got ${data.count}`);
    if (data.data[0].title !== 'Updated Title') throw new Error('Wrong note returned');
    if (data.query !== 'Updated') throw new Error('Query not returned in response');
  });
  
  // Test: Search by content
  await test('GET /api/notes/search finds notes by content', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=second');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.count !== 1) throw new Error(`Expected 1 result, got ${data.count}`);
    if (data.data[0].title !== 'Second Note') throw new Error('Wrong note returned');
  });
  
  // Test: Case-insensitive search
  await test('GET /api/notes/search is case-insensitive', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=SECOND');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.count !== 1) throw new Error(`Expected 1 result, got ${data.count}`);
    if (data.data[0].title !== 'Second Note') throw new Error('Case-insensitive search failed');
  });
  
  // Test: Search with no results
  await test('GET /api/notes/search returns empty array when no matches', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=nonexistent');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.count !== 0) throw new Error(`Expected 0 results, got ${data.count}`);
    if (data.data.length !== 0) throw new Error('Expected empty array');
  });
  
  // Test: Search without query parameter
  await test('GET /api/notes/search returns 400 for missing query', async () => {
    const { status, data } = await request('GET', '/api/notes/search');
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success) throw new Error('Expected success: false');
    if (!data.error.includes('Query parameter')) throw new Error('Expected query parameter error');
  });
  
  // Test: Search with empty query
  await test('GET /api/notes/search returns 400 for empty query', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=');
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success) throw new Error('Expected success: false');
  });
  
  // Test: Search with whitespace-only query
  await test('GET /api/notes/search returns 400 for whitespace-only query', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=   ');
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success) throw new Error('Expected success: false');
  });
  
  // Test: Search matches both title and content
  await test('GET /api/notes/search finds notes matching title OR content', async () => {
    const { status, data } = await request('GET', '/api/notes/search?q=content');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.count !== 2) throw new Error(`Expected 2 results, got ${data.count}`);
    // Both notes should match: "Updated Title" has "Only content updated", "Second Note" has "Content of the second note."
  });
  
  // ===== END SEARCH TESTS =====
  
  // Test: DELETE /api/notes/:id
  await test('DELETE /api/notes/:id deletes the note', async () => {
    const { status, data } = await request('DELETE', `/api/notes/${createdNoteId}`);
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.id !== createdNoteId) throw new Error('Deleted note ID mismatch');
  });
  
  // Test: GET deleted note
  await test('GET /api/notes/:id returns 404 for deleted note', async () => {
    const { status } = await request('GET', `/api/notes/${createdNoteId}`);
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });
  
  // Test: DELETE /api/notes/999 - not found
  await test('DELETE /api/notes/999 returns 404', async () => {
    const { status } = await request('DELETE', '/api/notes/999');
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });
  
  console.log('\n✨ All tests completed!\n');
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
