const http = require('http');

process.env.PORT = '3098';
const server = require('../server');

function makeRequest(options, postData = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {};
    if (postData) {
      defaultHeaders['Content-Type'] = 'application/json';
      defaultHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) {
      defaultHeaders['Cookie'] = cookie;
    }

    const reqOptions = {
      hostname: '127.0.0.1',
      port: 3098,
      path: options.path,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        let cookieHeader = null;
        if (setCookie) {
          cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookie: cookieHeader,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing 3-File Authentication Architecture...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await new Promise(r => setTimeout(r, 600));

    // 1. Serving index.html
    const indexRes = await makeRequest({ path: '/' });
    assert(indexRes.statusCode === 200 && indexRes.body.includes('loginSection') && indexRes.body.includes('script.js'), 'GET / serves index.html with loginSection & script.js');

    // 2. Serving script.js
    const scriptRes = await makeRequest({ path: '/script.js' });
    assert(scriptRes.statusCode === 200 && scriptRes.body.includes('/api/login'), 'GET /script.js serves frontend script');

    // 3. GET /api/me when unauthenticated
    const unauthMe = await makeRequest({ path: '/api/me' });
    const unauthMeData = JSON.parse(unauthMe.body);
    assert(unauthMe.statusCode === 200 && unauthMeData.authenticated === false, 'GET /api/me returns authenticated: false initially');

    // 4. Login with demo user
    const demoLogin = await makeRequest(
      { path: '/api/login', method: 'POST' },
      JSON.stringify({ username: 'demo', password: 'password123' })
    );
    const demoData = JSON.parse(demoLogin.body);
    assert(demoLogin.statusCode === 200 && demoData.success === true && demoData.user.username === 'demo', 'POST /api/login succeeds with demo / password123');
    assert(Boolean(demoLogin.cookie), 'Login sets session cookie auth.sid');

    const demoCookie = demoLogin.cookie;

    // 5. GET /api/me with session cookie
    const authMe = await makeRequest({ path: '/api/me' }, null, demoCookie);
    const authMeData = JSON.parse(authMe.body);
    assert(authMe.statusCode === 200 && authMeData.authenticated === true && authMeData.user.username === 'demo', 'GET /api/me returns active session user info');

    // 6. Register a new user
    const randomUser = 'user_' + Date.now().toString().slice(-4);
    const regRes = await makeRequest(
      { path: '/api/register', method: 'POST' },
      JSON.stringify({ username: randomUser, password: 'SecurePassword123' })
    );
    const regData = JSON.parse(regRes.body);
    assert(regRes.statusCode === 201 && regData.success === true && regData.user.username === randomUser, `POST /api/register creates user "${randomUser}" and hashes password`);
    assert(Boolean(regRes.cookie), 'Registration sets session cookie automatically');

    // 7. Prevent duplicate registration
    const dupRes = await makeRequest(
      { path: '/api/register', method: 'POST' },
      JSON.stringify({ username: randomUser, password: 'SecurePassword123' })
    );
    assert(dupRes.statusCode === 409, 'POST /api/register detects duplicate username (409 Conflict)');

    // 8. Reject weak/short passwords
    const weakRes = await makeRequest(
      { path: '/api/register', method: 'POST' },
      JSON.stringify({ username: 'another_user', password: '123' })
    );
    assert(weakRes.statusCode === 400, 'POST /api/register rejects short password (400 Bad Request)');

    // 9. Login with wrong password
    const wrongPass = await makeRequest(
      { path: '/api/login', method: 'POST' },
      JSON.stringify({ username: randomUser, password: 'WrongPassword' })
    );
    assert(wrongPass.statusCode === 401, 'POST /api/login rejects invalid password (401 Unauthorized)');

    // 10. Logout
    const logoutRes = await makeRequest({ path: '/api/logout', method: 'POST' }, null, demoCookie);
    const logoutData = JSON.parse(logoutRes.body);
    assert(logoutRes.statusCode === 200 && logoutData.success === true, 'POST /api/logout destroys session');

    // 11. GET /api/me after logout
    const postLogoutMe = await makeRequest({ path: '/api/me' }, null, demoCookie);
    const postLogoutData = JSON.parse(postLogoutMe.body);
    assert(postLogoutData.authenticated === false, 'Session is destroyed after logout');

    console.log(`\n========================================`);
    console.log(`Total Passed: ${passed} | Failed: ${failed}`);
    console.log(`========================================\n`);

    server.close(() => process.exit(failed > 0 ? 1 : 0));
  } catch (err) {
    console.error('Test error:', err);
    server.close(() => process.exit(1));
  }
}

runTests();
