const http = require('http');

async function testEndpoints() {
  const baseUrl = 'http://localhost:5000/api';
  let passed = 0;
  let failed = 0;
  const errors = [];

  const runTest = async (name, url, options = {}) => {
    try {
      const res = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        console.log(`✅ [PASS] ${name}`);
        passed++;
        return data;
      } else {
        console.log(`❌ [FAIL] ${name} - Status: ${res.status} - Msg: ${data.message || JSON.stringify(data)}`);
        failed++;
        errors.push({ name, url, data });
        return null;
      }
    } catch (err) {
      console.log(`❌ [FAIL] ${name} - Error: ${err.message}`);
      failed++;
      errors.push({ name, url, err: err.message });
      return null;
    }
  };

  console.log('--- Starting API Tests Phase 3 ---');
  
  let loginRes = await runTest('Login Admin', '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@library.com', password: 'admin123' })
  });
  
  const token = loginRes?.token;
  if (!token) {
    console.log('Failed to get token, aborting authenticated tests.');
    return;
  }
  
  const headers = { Authorization: `Bearer ${token}` };

  // Books
  const booksRes = await runTest('Get Books', '/books');
  const bookId = booksRes?.books?.[0]?._id;

  if (bookId) {
    await runTest('Get Single Book', `/books/${bookId}`);
    
    // Progress
    await runTest('Update Progress', '/progress/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookId, currentPage: 10, timeSpent: 15 })
    });
    await runTest('Get Progress Stats', '/progress/stats', { headers });
    await runTest('Get Book Progress', `/progress/book/${bookId}`, { headers });

    // Favorites
    await runTest('Toggle Favorite', '/favorites/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookId })
    });
    await runTest('Get My Favorites', '/favorites', { headers });

    // Notes
    await runTest('Add Note', '/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookId, pageNumber: 10, noteText: 'Test note' })
    });
    await runTest('Get Notes', `/notes/book/${bookId}`, { headers });
    
    // Bookmarks
    await runTest('Add Bookmark', '/bookmarks', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookId, pageNumber: 5, note: 'Important page' })
    });
    await runTest('Get Bookmarks', `/bookmarks/book/${bookId}`, { headers });
    
    // Reviews
    await runTest('Add Review', '/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookId, rating: 5, comment: 'Great book!' })
    });
    await runTest('Get Reviews', `/reviews/book/${bookId}`, { headers });
  } else {
    console.log('⚠️ Skipping book-related tests (no book found)');
  }

  // Admin Dashboard
  await runTest('Get Admin Stats', '/admin/stats', { headers });
  await runTest('Get Admin Users', '/admin/users', { headers });

  console.log('\n--- Test Summary ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
      console.log('Errors:', JSON.stringify(errors, null, 2));
  }
}

testEndpoints();
