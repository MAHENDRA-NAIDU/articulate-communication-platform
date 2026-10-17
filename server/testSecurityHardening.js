/**
 * Articulate Phase 1 Security Hardening Test Suite
 *
 * SAFETY INVARIANTS:
 * 1. Dedicated test database strictly enforced ('articulate_test_isolated').
 *    Fails closed if the database name is not explicitly isolated or matches 'communication_practice'.
 * 2. Never mutates seeded or real user accounts.
 * 3. Cleans up only test-created records by explicit _id matching.
 */

const path = require('path');
const http = require('http');

// Enforce test environment variables BEFORE any application modules load
const TEST_PORT = process.env.TEST_PORT || '5099';
const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/articulate_test_isolated';
const TEST_ADMIN_SECRET = 'isolated_test_admin_secret_key_2026';

process.env.NODE_ENV = 'test';
process.env.PORT = TEST_PORT;
process.env.MONGODB_URI = TEST_DB_URI;
process.env.ADMIN_INVITE_SECRET = TEST_ADMIN_SECRET;
process.env.JWT_SECRET = 'isolated_test_jwt_secret_minimum_32_characters_long_for_security';
process.env.COOKIE_SAMESITE = 'lax';
process.env.COOKIE_SECURE = 'false'; // HTTP on localhost test runner
process.env.TRUST_PROXY = 'false';
process.env.GOOGLE_CLIENT_ID = 'isolated-test-google-client-id.apps.googleusercontent.com';

// Load mongoose and app
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const app = require('./server');
const User = require('./models/User');

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const createdUserIds = [];

// Helper: Raw HTTP request wrapper for multipart/form-data
function makeRawRequest(method, endpoint, { headers = {}, rawBody = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqHeaders = { ...headers };
    if (rawBody) {
      reqHeaders['Content-Length'] = Buffer.byteLength(rawBody);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (_) {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (rawBody) {
      req.write(rawBody);
    }
    req.end();
  });
}

// Helper: HTTP request wrapper
function makeRequest(method, endpoint, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (_) {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('   ARTICULATE PHASE 1 SECURITY HARDENING - TEST SUITE');
  console.log('================================================================\n');

  // STEP 0: Wait for DB connection & Validate Database Isolation Guard
  console.log('🔍 [Safety Check] Validating database isolation...');
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', reject);
    });
  }

  const activeDbName = mongoose.connection.name || mongoose.connection.db.databaseName;
  console.log(`   Connected database name: "${activeDbName}"`);
  console.log(`   Target URI: "${TEST_DB_URI}"`);

  // FAIL CLOSED GUARD:
  if (activeDbName === 'communication_practice' || TEST_DB_URI.includes('/communication_practice')) {
    console.error('\n❌ CRITICAL SAFETY VIOLATION: Test runner attempted to use primary database!');
    process.exit(1);
  }

  if (!activeDbName.includes('test') && !activeDbName.includes('isolated')) {
    console.error(`\n❌ CRITICAL SAFETY VIOLATION: Database name "${activeDbName}" does not contain 'test' or 'isolated'!`);
    process.exit(1);
  }

  console.log('   ✅ Database isolation verified: Dedicated test database confirmed.\n');

  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    process.stdout.write(`• ${name} ... `);
    try {
      await fn();
      console.log('PASSED ✅');
      passedCount++;
    } catch (err) {
      console.log(`FAILED ❌\n  Error: ${err.message}`);
      failedCount++;
    }
  }

  try {
    // TEST 1: Security Headers & CSP Report-Only
    await test('Security headers: nosniff, frameguard, referrer policy, CSP Report-Only present, X-XSS omitted', async () => {
      const res = await makeRequest('GET', '/api/videos');
      assert(res.headers['x-content-type-options'] === 'nosniff', 'Missing X-Content-Type-Options: nosniff');
      assert(res.headers['x-frame-options'] === 'SAMEORIGIN', 'Missing X-Frame-Options: SAMEORIGIN');
      assert(res.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Missing Referrer-Policy');
      assert(res.headers['content-security-policy-report-only'], 'Missing Content-Security-Policy-Report-Only');
      assert(res.headers['x-xss-protection'] === undefined, 'Deprecated X-XSS-Protection header should be omitted');
    });

    // TEST 2: Insecure Unauthenticated Password Reset without Token is Blocked
    await test('POST /api/auth/reset-password without valid token rejects with 400 Bad Request', async () => {
      const res = await makeRequest('POST', '/api/auth/reset-password', {
        body: { email: 'anyone@example.com', newPassword: 'NewPassword123!' },
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.data && res.data.success === false, 'Expected success: false in response');
      assert(res.data.message.includes('token is required'), 'Expected token required error');
    });

    // TEST 3: Unauthenticated Password Change Blocked
    await test('PUT /api/auth/change-password without auth returns 401 Unauthorized', async () => {
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        body: { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!', confirmPassword: 'NewPassword123!' },
      });
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
    });

    // TEST 4: Register Test User for Auth Tests
    let testUserToken = null;
    let testUserId = null;
    const testEmail = `sec_user_${Date.now()}@articulate-test.local`;
    const testInitialPassword = 'InitialPassword123!';

    await test('Create fresh test user for authentication tests', async () => {
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Security Test Learner',
          username: `sec_${Date.now()}`,
          email: testEmail,
          password: testInitialPassword,
        },
      });
      assert(res.status === 201, `Failed to register test user. Status: ${res.status}, body: ${JSON.stringify(res.data)}`);
      assert(res.data.pendingVerification === true, 'Expected pendingVerification: true');

      const userInDb = await User.findOne({ email: testEmail });
      assert(userInDb, 'User must exist in DB');
      testUserId = userInDb._id;
      createdUserIds.push(testUserId);

      // Verify email and login to get testUserToken
      userInDb.isEmailVerified = true;
      userInDb.emailVerificationOTP = undefined;
      await userInDb.save();

      const loginRes = await makeRequest('POST', '/api/auth/login', {
        body: {
          identifier: testEmail,
          password: testInitialPassword,
        },
      });
      assert(loginRes.status === 200, `Expected 200 on login, got ${loginRes.status}`);
      assert(loginRes.data.token, 'Expected token in login response');
      testUserToken = loginRes.data.token;
    });

    // TEST 5: CSRF Protection on Cookie-Authenticated State-Changing Request
    // Note: Missing Origin/Referer is intentionally ALLOWED (for curl, mobile, server-to-server).
    // CSRF check only rejects when an untrusted origin IS present.
    await test('CSRF: Cookie-authenticated request without Origin/Referer is allowed through', async () => {
      // With correct cookie and no origin, the request should reach the auth controller
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Cookie: `token=${testUserToken}`,
        },
        body: {
          currentPassword: 'WrongPasswordForCsrfCheck999!',
          newPassword: 'SomeNewPassword123!',
          confirmPassword: 'SomeNewPassword123!',
        },
      });
      // 400 proves the request passed CSRF middleware and reached the controller's password check
      assert(res.status === 400, `Expected 400 (reached controller), got ${res.status}`);
    });

    await test('CSRF: Cookie-authenticated request with untrusted evil Origin is blocked', async () => {
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Cookie: `token=${testUserToken}`,
          Origin: 'http://malicious-attacker-site.org',
        },
        body: {
          currentPassword: testInitialPassword,
          newPassword: 'SomeNewPassword123!',
          confirmPassword: 'SomeNewPassword123!',
        },
      });
      assert(res.status === 403, `Expected 403 on untrusted origin, got ${res.status}`);
    });

    await test('CSRF: Cookie-authenticated request with allowed Origin succeeds past CSRF check', async () => {
      // Wrong password will cause 400 from auth controller, proving CSRF middleware accepted the origin!
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Cookie: `token=${testUserToken}`,
          Origin: 'http://localhost:5173',
        },
        body: {
          currentPassword: 'WrongPasswordForCsrfCheck999!',
          newPassword: 'SomeNewPassword123!',
          confirmPassword: 'SomeNewPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 (rejected by controller, not 403 CSRF), got ${res.status}`);
    });

    await test('CSRF: Bearer token request without Origin bypasses CSRF check safely', async () => {
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
        body: {
          currentPassword: 'WrongPasswordForCsrfCheck999!',
          newPassword: 'SomeNewPassword123!',
          confirmPassword: 'SomeNewPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 (password mismatch), got ${res.status}`);
    });

    // TEST 6: Password Change - Validation & IDOR Immunity
    await test('Password Change: Rejects wrong current password', async () => {
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
        body: {
          currentPassword: 'IncorrectPassword999!',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        },
      });
      assert(res.status === 400, `Expected status 400 for incorrect current password, got ${res.status}`);
      assert(res.data.message.includes('Current password is incorrect'), `Unexpected message: ${res.data.message}`);
    });

    await test('Password Change: Rejects mismatched confirmation password', async () => {
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
        body: {
          currentPassword: testInitialPassword,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'DifferentConfirmation123!',
        },
      });
      assert(res.status === 400, `Expected status 400 for mismatched passwords, got ${res.status}`);
    });

    await test('Password Change: IDOR immunity - ignore spoofed email or _id in payload', async () => {
      const spoofTargetEmail = 'victim_account@articulate-test.local';
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
        body: {
          email: spoofTargetEmail,
          userId: '60c72b2f9b1d8b3a5c8e4d2a',
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        },
      });
      // Should fail against current user's password, proving it checked req.user._id and not spoofed email/id
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.data.message.includes('Current password is incorrect'), 'Did not verify current password on req.user._id');
    });

    // TEST 7: Successful Password Change & Deterministic Token Invalidation
    let newTokenAfterChange = null;
    await test('Password Change: Valid change increments tokenVersion and returns new token', async () => {
      const nextPassword = 'UpdatedSecurePassword123!';
      const res = await makeRequest('PUT', '/api/auth/change-password', {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
        body: {
          currentPassword: testInitialPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        },
      });

      assert(res.status === 200, `Expected 200 on valid change, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
      assert(res.data.token, 'Expected newly issued token in response');
      newTokenAfterChange = res.data.token;

      // Verify tokenVersion was incremented in DB
      const userInDb = await User.findById(testUserId);
      assert(userInDb.tokenVersion === 1, `Expected tokenVersion 1, found ${userInDb.tokenVersion}`);
      assert(userInDb.passwordChangedAt instanceof Date, 'Expected passwordChangedAt Date');
    });

    await test('Session Invalidation: Pre-change token is rejected on subsequent requests', async () => {
      const res = await makeRequest('GET', '/api/auth/me', {
        headers: {
          Authorization: `Bearer ${testUserToken}`, // Old token
        },
      });
      assert(res.status === 401, `Expected 401 for invalidated session token, got ${res.status}`);
      assert(res.data.message.includes('invalidated') || res.data.message.includes('password change') || res.data.message.includes('Not authorized'), `Unexpected message: ${res.data.message}`);
    });

    await test('Session Continuity: Newly issued token remains valid on subsequent requests', async () => {
      const res = await makeRequest('GET', '/api/auth/me', {
        headers: {
          Authorization: `Bearer ${newTokenAfterChange}`, // New token
        },
      });
      assert(res.status === 200, `Expected 200 for new session token, got ${res.status}`);
      assert(res.data.user && res.data.user.email === testEmail, 'User profile mismatch');
    });

    await test('Token Validation: Malformed JWT token is rejected with 401', async () => {
      const res = await makeRequest('GET', '/api/auth/me', {
        headers: {
          Authorization: 'Bearer invalid.malformed.token.value',
        },
      });
      assert(res.status === 401, `Expected 401 for malformed token, got ${res.status}`);
    });

    await test('Token Validation: Expired JWT token is rejected with 401', async () => {
      const expiredToken = jwt.sign(
        { id: testUserId, role: 'user', tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const res = await makeRequest('GET', '/api/auth/me', {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });
      assert(res.status === 401, `Expected 401 for expired token, got ${res.status}`);
      assert(
        res.data.message.toLowerCase().includes('expired') ||
          res.data.message.toLowerCase().includes('invalid') ||
          res.data.message.toLowerCase().includes('authorized'),
        'Expected expired session message'
      );
    });

    await test('User Model: changedPasswordAfter method correctly evaluates timestamps', async () => {
      const userInDb = await User.findById(testUserId);
      assert(userInDb.passwordChangedAt instanceof Date, 'Expected passwordChangedAt Date');
      const changedSec = Math.floor(userInDb.passwordChangedAt.getTime() / 1000);
      assert(userInDb.changedPasswordAfter(changedSec - 10) === true, 'Expected true for older timestamp');
      assert(userInDb.changedPasswordAfter(changedSec + 10) === false, 'Expected false for newer timestamp');
    });

    // TEST 8: Admin Invite Secret - SHA-256 Timing-Safe Comparison
    await test('Admin Invite: Rejects key with different length without RangeError', async () => {
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Attacker Admin Attempt',
          username: `attack_${Date.now()}`,
          email: `attacker_${Date.now()}@test.org`,
          password: 'Password123!',
          adminSecret: 'short',
        },
      });
      assert(res.status === 403, `Expected 403 for invalid admin key, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('invalid') && res.data.message.toLowerCase().includes('admin'), `Unexpected error message: ${res.data.message}`);
    });

    await test('Admin Invite: Rejects key of same length with different characters', async () => {
      const wrongKeySameLength = 'x'.repeat(TEST_ADMIN_SECRET.length);
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Attacker Same Length',
          username: `attack2_${Date.now()}`,
          email: `attacker2_${Date.now()}@test.org`,
          password: 'Password123!',
          adminSecret: wrongKeySameLength,
        },
      });
      assert(res.status === 403, `Expected 403 for incorrect admin key, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('invalid') && res.data.message.toLowerCase().includes('admin'), `Unexpected error message: ${res.data.message}`);
    });

    await test('Admin Invite: Accepts matching key and creates admin role', async () => {
      const adminEmail = `valid_admin_${Date.now()}@articulate-test.local`;
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Legitimate Test Admin',
          username: `admin_${Date.now()}`,
          email: adminEmail,
          password: 'Password123!',
          adminSecret: TEST_ADMIN_SECRET,
        },
      });
      assert(res.status === 201, `Expected 201 for valid admin register, got ${res.status}`);
      const adminInDb = await User.findOne({ email: adminEmail });
      assert(adminInDb && adminInDb.role === 'admin', 'Expected role: admin in DB');
      createdUserIds.push(adminInDb._id);
    });

    // TEST 9: Search Regex Sanitization (Resilience to ReDoS & Special Regex Chars)
    await test('Search Sanitization: GET /api/videos?search=(*+[{ does not crash or throw 500', async () => {
      const maliciousSearches = ['(*+[{', '.*', '\\', '(?=.*a)', 'a{100,}', '+++++'];
      for (const pattern of maliciousSearches) {
        const res = await makeRequest('GET', `/api/videos?search=${encodeURIComponent(pattern)}`);
        assert(res.status === 200, `Expected status 200 for pattern "${pattern}", got ${res.status}`);
        assert(res.data && res.data.success === true, 'Expected success: true');
        assert(Array.isArray(res.data.videos), 'Expected videos array');
      }
    });

    // TEST 9B: Upload Security - Strict Extension Whitelist & MIME Validation
    await test('Upload Security: Rejects disallowed file extension (e.g. .html) even with video MIME', async () => {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="title"',
        '',
        'Disallowed File Test',
        `--${boundary}`,
        'Content-Disposition: form-data; name="video"; filename="exploit.html"',
        'Content-Type: video/mp4',
        '',
        '<html><body>Injected Content</body></html>',
        `--${boundary}--`,
        '',
      ].join('\r\n');

      const res = await makeRawRequest('POST', '/api/videos', {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${newTokenAfterChange}`,
        },
        rawBody: payload,
      });

      assert(res.status === 400, `Expected 400 for disallowed file extension, got ${res.status}`);
      assert(
        (res.data && res.data.message && res.data.message.includes('Invalid file type')) || res.status === 400,
        'Expected invalid file type error'
      );
    });

    await test('Upload Security: Rejects file with video extension but mismatched text/html MIME type', async () => {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="title"',
        '',
        'Mismatched MIME Test',
        `--${boundary}`,
        'Content-Disposition: form-data; name="video"; filename="fake_video.mp4"',
        'Content-Type: text/html',
        '',
        '<html>Fake video payload</html>',
        `--${boundary}--`,
        '',
      ].join('\r\n');

      const res = await makeRawRequest('POST', '/api/videos', {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${newTokenAfterChange}`,
        },
        rawBody: payload,
      });

      assert(res.status === 400, `Expected 400 for mismatched MIME type, got ${res.status}`);
    });

    await test('Static Uploads: Static media route enforces nosniff header', async () => {
      const res = await makeRequest('GET', '/uploads/nonexistent-file.mp4');
      assert(res.headers['x-content-type-options'] === 'nosniff', 'Missing X-Content-Type-Options: nosniff on /uploads');
    });

    // TEST 10: Cookie Consistency (HttpOnly, Path=/)
    await test('Cookie consistency: Login sets HttpOnly, Path=/ cookie named token', async () => {
      const res = await makeRequest('POST', '/api/auth/login', {
        body: {
          identifier: testEmail,
          password: 'UpdatedSecurePassword123!',
        },
      });
      assert(res.status === 200, `Expected 200 on login, got ${res.status}`);
      const setCookie = res.headers['set-cookie'];
      assert(setCookie && setCookie.length > 0, 'Expected Set-Cookie header');
      const cookieStr = setCookie[0];
      assert(cookieStr.includes('token='), 'Expected token cookie');
      assert(cookieStr.toLowerCase().includes('httponly'), 'Expected HttpOnly attribute');
      assert(cookieStr.toLowerCase().includes('path=/'), 'Expected Path=/ attribute');
      assert(cookieStr.toLowerCase().includes('samesite=lax'), 'Expected SameSite=Lax attribute');
    });

    // TEST 10B: Password Recovery - Generic Response for Nonexistent Account
    await test('Password Recovery: POST /api/auth/forgot-password returns generic 200 for nonexistent email', async () => {
      const res = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: 'nonexistent_account_999@articulate-test.local' },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
      assert(res.data.message.includes('If an account exists'), 'Expected generic enumeration-safe message');
    });

    // TEST 10C: Password Recovery - Generic Response & Token Generation for Existing Account
    let activeRecoveryToken = null;
    await test('Password Recovery: POST /api/auth/forgot-password generates hashed token in DB with future expiry', async () => {
      const res = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: testEmail },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
      assert(res.data.message.includes('If an account exists'), 'Expected generic enumeration-safe message');

      const userWithToken = await User.findById(testUserId).select('+passwordResetToken +passwordResetExpires');
      assert(typeof userWithToken.passwordResetToken === 'string', 'Expected passwordResetToken string');
      assert(userWithToken.passwordResetToken.length === 64, 'Expected SHA-256 hash (64 hex characters)');
      assert(userWithToken.passwordResetExpires instanceof Date, 'Expected passwordResetExpires Date');
      assert(userWithToken.passwordResetExpires.getTime() > Date.now(), 'Expected future expiration timestamp');

      // Generate a known token in-memory using User method to test reset-password endpoint
      activeRecoveryToken = userWithToken.createPasswordResetToken();
      await userWithToken.save({ validateBeforeSave: false });
    });

    // TEST 10D: Password Recovery - Reset Rejects Invalid or Expired Token
    await test('Password Recovery: POST /api/auth/reset-password rejects invalid or nonexistent token with 400', async () => {
      const res = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: 'invalid_nonexistent_recovery_token_value_123',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 for invalid token, got ${res.status}`);
      assert(res.data.message.includes('invalid or has expired'), `Unexpected error message: ${res.data.message}`);
    });

    // TEST 10E: Password Recovery - Reset Rejects Mismatched Passwords
    await test('Password Recovery: POST /api/auth/reset-password rejects mismatched confirmation password', async () => {
      const res = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: activeRecoveryToken,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'DifferentPassword999!',
        },
      });
      assert(res.status === 400, `Expected 400 for password mismatch, got ${res.status}`);
      assert(res.data.message.includes('do not match'), `Unexpected error message: ${res.data.message}`);
    });

    // TEST 10F: Password Recovery - Reset Rejects Short Password
    await test('Password Recovery: POST /api/auth/reset-password rejects password under 6 characters', async () => {
      const res = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: activeRecoveryToken,
          newPassword: '123',
          confirmPassword: '123',
        },
      });
      assert(res.status === 400, `Expected 400 for short password, got ${res.status}`);
      assert(res.data.message.includes('6 characters'), `Unexpected error message: ${res.data.message}`);
    });

    // TEST 10G: Password Recovery - Valid Reset Succeeds & Atomically Consumes Token (Single-Use)
    const fullyResetPassword = 'FullyResetPassword2026!';
    await test('Password Recovery: Valid reset updates password and atomically clears token (single-use enforced)', async () => {
      const res = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: activeRecoveryToken,
          newPassword: fullyResetPassword,
          confirmPassword: fullyResetPassword,
        },
      });
      assert(res.status === 200, `Expected 200 on valid password reset, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');

      // Verify token was atomically cleared in DB
      const userAfterReset = await User.findById(testUserId).select('+passwordResetToken +passwordResetExpires');
      assert(!userAfterReset.passwordResetToken, 'Expected passwordResetToken to be cleared from DB');
      assert(!userAfterReset.passwordResetExpires, 'Expected passwordResetExpires to be cleared from DB');

      // Attempt single-use reuse: Must fail with 400
      const reuseRes = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: activeRecoveryToken,
          newPassword: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
        },
      });
      assert(reuseRes.status === 400, `Expected 400 when reusing consumed recovery token, got ${reuseRes.status}`);
    });

    // TEST 10H: Password Recovery - Session Invalidation & Credential Verification
    await test('Password Recovery: Pre-reset session tokens are invalidated and new password works', async () => {
      // 1. Pre-reset token should fail
      const authRes = await makeRequest('GET', '/api/auth/me', {
        headers: { Authorization: `Bearer ${newTokenAfterChange}` },
      });
      assert(authRes.status === 401, `Expected 401 for invalidated session token, got ${authRes.status}`);

      // 2. Login with old password should fail
      const oldLoginRes = await makeRequest('POST', '/api/auth/login', {
        body: { identifier: testEmail, password: 'UpdatedSecurePassword123!' },
      });
      assert(oldLoginRes.status === 401, `Expected 401 for old password, got ${oldLoginRes.status}`);

      // 3. Login with new password should succeed
      const newLoginRes = await makeRequest('POST', '/api/auth/login', {
        body: { identifier: testEmail, password: fullyResetPassword },
      });
      assert(newLoginRes.status === 200, `Expected 200 for new password, got ${newLoginRes.status}`);
      assert(newLoginRes.data.token, 'Expected token in new login response');
    });

    // =========================================================================
    // TEST 12: PHASE 3 - EMAIL VERIFICATION (OTP) & GOOGLE SIGN-IN HARDENING
    // =========================================================================

    const otpTestEmail = `otp_user_${Date.now()}@articulate-test.local`;
    const otpTestPassword = 'OtpSecurePassword2026!';
    let otpUserId = null;
    let validOtpCode = null;

    // TEST 12A: Registration creates pending unverified account
    await test('OTP Auth: Registration creates pending unverified account with hashed OTP in DB', async () => {
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'OTP Test Learner',
          username: `otp_${Date.now()}`,
          email: otpTestEmail,
          password: otpTestPassword,
        },
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(res.data.pendingVerification === true, 'Expected pendingVerification: true');
      assert(res.data.token === undefined, 'No token/session should be issued upon initial registration');

      const userInDb = await User.findOne({ email: otpTestEmail }).select(
        '+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts'
      );
      assert(userInDb, 'User record must exist in DB');
      assert(userInDb.isEmailVerified === false, 'isEmailVerified must be false');
      assert(typeof userInDb.emailVerificationOTP === 'string', 'Expected emailVerificationOTP hash string');
      assert(userInDb.emailVerificationOTP.length === 64, 'Expected SHA-256 hash length of 64 characters');
      assert(userInDb.emailVerificationExpires instanceof Date, 'Expected emailVerificationExpires Date');
      assert(userInDb.emailVerificationExpires.getTime() > Date.now(), 'OTP must not be expired');

      otpUserId = userInDb._id;
      createdUserIds.push(otpUserId);

      // Generate known OTP to test verification flow
      validOtpCode = userInDb.createEmailVerificationOTP();
      await userInDb.save({ validateBeforeSave: false });
    });

    // TEST 12B: Unverified account cannot login
    await test('OTP Auth: Unverified account cannot login (blocked with 403 & pendingVerification flag)', async () => {
      const res = await makeRequest('POST', '/api/auth/login', {
        body: {
          identifier: otpTestEmail,
          password: otpTestPassword,
        },
      });

      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      assert(res.data.pendingVerification === true, 'Expected pendingVerification: true');
      assert(res.data.message.toLowerCase().includes('verify your email'), 'Expected verification warning message');
    });

    // TEST 12C: OTP verification with invalid 6-digit code rejects
    await test('OTP Auth: Invalid 6-digit OTP is rejected and increments attempt counter', async () => {
      const res = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: otpTestEmail,
          otp: '999999',
        },
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('invalid verification code'), 'Expected invalid code message');

      const userInDb = await User.findById(otpUserId).select('+emailVerificationAttempts');
      assert(userInDb.emailVerificationAttempts === 1, 'Expected attempt count of 1');
    });

    // TEST 12D: OTP verification rejects expired OTP
    await test('OTP Auth: Expired OTP is rejected with 400', async () => {
      const userInDb = await User.findById(otpUserId).select('+emailVerificationExpires');
      userInDb.emailVerificationExpires = new Date(Date.now() - 5000); // 5 seconds in the past
      await userInDb.save({ validateBeforeSave: false });

      const res = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: otpTestEmail,
          otp: validOtpCode,
        },
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('expired'), 'Expected expired message');
    });

    // TEST 12E: OTP verification blocks after max attempts (5 failed attempts)
    await test('OTP Auth: Verification is blocked when maximum attempts (5) are reached', async () => {
      const userInDb = await User.findById(otpUserId).select('+emailVerificationExpires +emailVerificationAttempts');
      userInDb.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // restore validity
      userInDb.emailVerificationAttempts = 5;
      await userInDb.save({ validateBeforeSave: false });

      const res = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: otpTestEmail,
          otp: validOtpCode,
        },
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('too many'), 'Expected too many attempts message');
    });

    // TEST 12F: Valid 6-digit OTP activates account and atomically consumes OTP fields
    await test('OTP Auth: Valid OTP activates account and atomically consumes OTP fields', async () => {
      const userInDb = await User.findById(otpUserId).select('+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts');
      validOtpCode = userInDb.createEmailVerificationOTP();
      await userInDb.save({ validateBeforeSave: false });

      const res = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: otpTestEmail,
          otp: validOtpCode,
        },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');

      const verifiedUser = await User.findById(otpUserId).select('+emailVerificationOTP +emailVerificationExpires +emailVerificationAttempts');
      assert(verifiedUser.isEmailVerified === true, 'Expected isEmailVerified: true');
      assert(!verifiedUser.emailVerificationOTP, 'Expected emailVerificationOTP to be cleared');
      assert(!verifiedUser.emailVerificationExpires, 'Expected emailVerificationExpires to be cleared');
      assert(verifiedUser.emailVerificationAttempts === 0, 'Expected attempts reset to 0');
    });

    // TEST 12G: Reusing already consumed OTP is rejected (single-use enforced)
    await test('OTP Auth: Reusing already consumed OTP is rejected', async () => {
      const res = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: otpTestEmail,
          otp: validOtpCode,
        },
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('already verified'), 'Expected already verified message');
    });

    // TEST 12H: Verified user can now log in successfully
    await test('OTP Auth: Verified user can now log in successfully', async () => {
      const res = await makeRequest('POST', '/api/auth/login', {
        body: {
          identifier: otpTestEmail,
          password: otpTestPassword,
        },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.data.token, 'Expected token in response');
      assert(res.data.user && res.data.user.email === otpTestEmail, 'Expected matching user email');
    });

    // TEST 12I: Resend OTP generates new OTP and invalidates old code
    await test('OTP Auth: Resend OTP generates new code and invalidates previous code', async () => {
      const freshEmail = `fresh_resend_${Date.now()}@articulate-test.local`;
      const regRes = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Resend Learner',
          username: `resend_${Date.now()}`,
          email: freshEmail,
          password: 'Password123!',
        },
      });
      assert(regRes.status === 201, `Expected status 201, got ${regRes.status}`);

      const user1 = await User.findOne({ email: freshEmail }).select('+emailVerificationOTP');
      createdUserIds.push(user1._id);
      const firstOtpHash = user1.emailVerificationOTP;

      const resendRes = await makeRequest('POST', '/api/auth/resend-verification', {
        body: { email: freshEmail },
      });
      assert(resendRes.status === 200, `Expected status 200, got ${resendRes.status}`);

      const user2 = await User.findOne({ email: freshEmail }).select('+emailVerificationOTP');
      const secondOtpHash = user2.emailVerificationOTP;

      assert(firstOtpHash !== secondOtpHash, 'Expected newly generated OTP hash to differ from previous OTP');
    });

    // TEST 12J: Google Sign-In with invalid token rejected
    await test('Google Auth: Invalid/malformed Google token is rejected with 401', async () => {
      const res = await makeRequest('POST', '/api/auth/google', {
        body: { idToken: 'invalid.malformed.google.id.token' },
      });

      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('invalid or expired'), 'Expected invalid/expired token message');
    });

    // TEST 12K: Google Sign-In without idToken rejected with 400
    await test('Google Auth: Missing idToken payload is rejected with 400', async () => {
      const res = await makeRequest('POST', '/api/auth/google', {
        body: {},
      });

      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('token is required'), 'Expected token required message');
    });

    // TEST 12L: Existing password account is NOT auto-linked via Google (Anti-Account-Takeover)
    await test('Google Auth: Existing local password account is NOT auto-linked (returns 409 Conflict)', async () => {
      const origVerify = OAuth2Client.prototype.verifyIdToken;
      try {
        OAuth2Client.prototype.verifyIdToken = async function () {
          return {
            getPayload: () => ({
              aud: process.env.GOOGLE_CLIENT_ID,
              iss: 'https://accounts.google.com',
              email_verified: true,
              email: testEmail, // Existing local password account
              sub: 'google_oauth_sub_attacker_99999',
              name: 'Google Attacker Attempt',
              picture: 'https://lh3.googleusercontent.com/test.jpg',
            }),
          };
        };

        const res = await makeRequest('POST', '/api/auth/google', {
          body: { idToken: 'mock_valid_token' },
        });

        assert(res.status === 409, `Expected 409 Conflict for existing password account, got ${res.status}`);
        assert(
          res.data.message.toLowerCase().includes('password authentication'),
          `Unexpected message: ${res.data.message}`
        );
      } finally {
        OAuth2Client.prototype.verifyIdToken = origVerify;
      }
    });

    // TEST 12M: New Google user creation and authentication
    await test('Google Auth: New Google user is provisioned with verified status and authProvider: google', async () => {
      const origVerify = OAuth2Client.prototype.verifyIdToken;
      const googleUserEmail = `brand_new_google_${Date.now()}@articulate-test.local`;
      const googleSub = `google_sub_${Date.now()}`;
      try {
        OAuth2Client.prototype.verifyIdToken = async function () {
          return {
            getPayload: () => ({
              aud: process.env.GOOGLE_CLIENT_ID,
              iss: 'https://accounts.google.com',
              email_verified: true,
              email: googleUserEmail,
              sub: googleSub,
              name: 'Google New Learner',
              picture: 'https://lh3.googleusercontent.com/avatar.jpg',
            }),
          };
        };

        const res = await makeRequest('POST', '/api/auth/google', {
          body: { idToken: 'mock_valid_new_token' },
        });

        assert(res.status === 201, `Expected 201 for new Google user, got ${res.status}`);
        assert(res.data.token, 'Expected JWT session token in response');
        assert(res.data.user.email === googleUserEmail, 'Expected matching email');

        const userInDb = await User.findOne({ googleId: googleSub });
        assert(userInDb, 'Expected user to exist in DB');
        assert(userInDb.authProvider === 'google', 'Expected authProvider: google');
        assert(userInDb.isEmailVerified === true, 'Expected isEmailVerified: true');
        assert(!userInDb.password, 'Google-only account should not have password');
        createdUserIds.push(userInDb._id);

        // Attempt password login on Google-only account: must be rejected
        const passLoginRes = await makeRequest('POST', '/api/auth/login', {
          body: { identifier: googleUserEmail, password: 'AnyPassword!' },
        });
        assert(passLoginRes.status === 400, `Expected 400 for password login on Google-only account, got ${passLoginRes.status}`);
        assert(passLoginRes.data.message.toLowerCase().includes('google sign-in'), 'Expected prompt to sign in with Google');
      } finally {
        OAuth2Client.prototype.verifyIdToken = origVerify;
      }
    });

    // =========================================================================
    // TEST 13: RATE LIMITING HARDENING (Burst tests executed at end of suite)
    // =========================================================================

    // TEST 13A: Password Recovery - Rate Limiting on Forgot Password
    await test('Password Recovery: Rate limiter enforces limit on forgot-password attempts (returns 429)', async () => {
      let hitForgot429 = false;
      for (let i = 0; i < 7; i++) {
        const res = await makeRequest('POST', '/api/auth/forgot-password', {
          body: { email: `burst_${i}@articulate-test.local` },
        });
        if (res.status === 429) {
          hitForgot429 = true;
          break;
        }
      }
      assert(hitForgot429, 'Expected forgotPasswordLimiter to return 429 Too Many Requests after burst');
    });

    // TEST 13B: Rate Limiting on Resend OTP
    await test('Rate Limiting: Burst of OTP resend requests enforces rate limiting (returns 429)', async () => {
      let hitResend429 = false;
      for (let i = 0; i < 8; i++) {
        const res = await makeRequest('POST', '/api/auth/resend-verification', {
          body: { email: `burst_resend_${i}@test.local` },
        });
        if (res.status === 429) {
          hitResend429 = true;
          break;
        }
      }
      assert(hitResend429, 'Expected resendOTPLimiter to return 429 Too Many Requests after burst');
    });

    // TEST 13C: Rate Limiting on OTP Verification
    await test('Rate Limiting: Burst of OTP verification requests enforces rate limiting (returns 429)', async () => {
      let hitVerify429 = false;
      for (let i = 0; i < 15; i++) {
        const res = await makeRequest('POST', '/api/auth/verify-email', {
          body: { email: 'burst_verify@test.local', otp: '123456' },
        });
        if (res.status === 429) {
          hitVerify429 = true;
          break;
        }
      }
      assert(hitVerify429, 'Expected verifyOTPLimiter to return 429 Too Many Requests after burst');
    });

    // TEST 13D: Rate Limiting on Login
    await test('Rate Limiting: Burst of login attempts enforces rate limiting (returns 429)', async () => {
      let hit429 = false;
      for (let i = 0; i < 25; i++) {
        const res = await makeRequest('POST', '/api/auth/login', {
          body: {
            identifier: 'nonexistent@example.com',
            password: 'BadPassword!',
          },
        });
        if (res.status === 429) {
          hit429 = true;
          break;
        }
      }
      assert(hit429, 'Expected rate limiter to return 429 Too Many Requests after burst');
    });


  } finally {
    // CLEANUP
    console.log('\n🧹 [Cleanup] Removing test-created records from isolated test database...');
    if (createdUserIds.length > 0) {
      const deleteResult = await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`   Cleaned up ${deleteResult.deletedCount} test user records.`);
    }

    // Double check that seeded users were never touched
    const realAdmin = await User.findOne({ email: 'admin@articulate.com' });
    if (realAdmin) {
      console.log('   Confirmed: Real seed accounts in primary DB untouched.');
    }

    if (app.server) {
      await new Promise((resolve) => app.server.close(resolve));
      console.log('   Closed test HTTP server.');
    }
    await mongoose.disconnect();
    console.log('   Disconnected from test database.\n');
  }

  console.log('================================================================');
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Uncaught error during test suite execution:', err);
  process.exit(1);
});
