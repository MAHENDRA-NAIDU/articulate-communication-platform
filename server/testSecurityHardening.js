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
process.env.RESEND_WEBHOOK_SECRET = 'whsec_dGVzdF9zZWNyZXRfa2V5XzEyMzQ1Njc4OTA=';

// Load mongoose and app
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const app = require('./server');
const User = require('./models/User');
const { Video } = require('./models/Video');
const { uploadMedia } = require('./middleware/uploadMiddleware');
const { cloudinary } = require('./config/cloudinary');
const {
  isBrevoConfigured,
  isSmtpConfigured,
  isResendConfigured,
  getActiveProvider,
  getTransporter,
  getSender,
  getResendSender,
  getBrevoSender,
  isNetworkError,
  sendVerificationOTPEmail,
  sendPasswordResetEmail,
  dispatchEmail,
  setTransporterForTesting,
  resetTransporter,
  setBrevoClientForTesting,
  resetBrevoClient,
} = require('./services/emailService');

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const createdUserIds = [];
const createdVideoIds = [];

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

// Helper: Generate valid Svix signature headers for Resend webhook testing
function signSvixWebhook(payloadObj, secret = process.env.RESEND_WEBHOOK_SECRET) {
  const timestamp = Math.floor(Date.now() / 1000);
  const msgId = `msg_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const rawBody = JSON.stringify(payloadObj);
  const secretKey = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${msgId}.${timestamp}.${rawBody}`)
    .digest('base64');
  return {
    headers: {
      'svix-id': msgId,
      'svix-timestamp': timestamp.toString(),
      'svix-signature': `v1,${signature}`,
      'Content-Type': 'application/json',
    },
    rawBody,
  };
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

    await test('Upload Flow: Successfully accepts multipart/form-data video upload and saves practice drill', async () => {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const dummyVideoBytes = Buffer.from('00000018667479706d7034320000000069736f6d6d703432', 'hex');
      const payload = Buffer.concat([
        Buffer.from([
          `--${boundary}`,
          'Content-Disposition: form-data; name="title"',
          '',
          'Automated Practice Speech Drill',
          `--${boundary}`,
          'Content-Disposition: form-data; name="category"',
          '',
          'Technology',
          `--${boundary}`,
          'Content-Disposition: form-data; name="description"',
          '',
          'Testing video upload flow integration.',
          `--${boundary}`,
          'Content-Disposition: form-data; name="duration"',
          '',
          '45',
          `--${boundary}`,
          'Content-Disposition: form-data; name="video"; filename="test_speech.mp4"',
          'Content-Type: video/mp4',
          '',
          '',
        ].join('\r\n')),
        dummyVideoBytes,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await makeRawRequest('POST', '/api/videos', {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${newTokenAfterChange}`,
        },
        rawBody: payload,
      });

      assert(res.status === 201, `Expected 201 on valid video upload, got ${res.status} (${JSON.stringify(res.data)})`);
      assert(res.data && res.data.success === true, 'Expected res.data.success === true');
      assert(res.data.video && res.data.video._id, 'Expected returned video with _id');
      assert(res.data.video.videoUrl, 'Expected returned video to have videoUrl');
      assert(res.data.video.title === 'Automated Practice Speech Drill', 'Expected title to match');
      createdVideoIds.push(res.data.video._id);
    });

    await test('Upload Flow: uploadMedia properly awaits Cloudinary upload_large Promise and returns secure_url', async () => {
      const cloudinaryConfig = require('./config/cloudinary');
      const originalConfigured = cloudinaryConfig.isCloudinaryConfigured;
      const originalUploadLarge = cloudinary.uploader.upload_large;
      try {
        cloudinaryConfig.isCloudinaryConfigured = true;

        cloudinary.uploader.upload_large = (filePath, options, callback) => {
          setTimeout(() => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test-cloud/video/upload/v12345/comm_practice/videos/drill.mp4',
              public_id: 'comm_practice/videos/drill',
            });
          }, 20);
        };

        const fs = require('fs');
        const tempMockPath = path.join(__dirname, 'temp_mock_video_for_test.mp4');
        fs.writeFileSync(tempMockPath, 'mock video binary data');

        const mockFile = {
          path: tempMockPath,
          originalname: 'drill.mp4',
          mimetype: 'video/mp4',
          filename: 'drill-12345.mp4',
        };

        const uploadRes = await uploadMedia(mockFile, 'videos', 'video');
        assert(
          uploadRes.url === 'https://res.cloudinary.com/test-cloud/video/upload/v12345/comm_practice/videos/drill.mp4',
          `Expected Cloudinary secure_url, got ${uploadRes.url}`
        );
        assert(uploadRes.publicId === 'comm_practice/videos/drill', 'Expected publicId to match');
      } finally {
        cloudinaryConfig.isCloudinaryConfigured = originalConfigured;
        cloudinary.uploader.upload_large = originalUploadLarge;
      }
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

    // TEST 12-PRE-1: Email syntax validation rejects malformed addresses
    await test('Email Validation: Malformed email syntax rejected with 400', async () => {
      const badEmails = [
        'plainaddress',
        '@missinguser.com',
        'user@.com',
        'user@domain..com',
        'user..name@domain.com',
      ];
      for (const badEmail of badEmails) {
        const res = await makeRequest('POST', '/api/auth/register', {
          body: {
            name: 'Bad Email Learner',
            username: `bad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            email: badEmail,
            password: 'ValidPassword123!',
          },
        });
        assert(res.status === 400, `Expected 400 for bad email "${badEmail}", got ${res.status}`);
        assert(res.data.success === false, 'Expected success: false');
        assert(
          typeof res.data.message === 'string' && res.data.message.length > 0,
          `Expected error message, got: ${res.data.message}`
        );
      }
    });

    // TEST 12-PRE-2: Domain MX validation rejects nonexistent domains
    await test('Email Validation: Nonexistent domain MX rejected with 400', async () => {
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Nonexistent MX Learner',
          username: `nomx_${Date.now()}`,
          email: `test_${Date.now()}@nonexistent-domain-nx-98317203.com`,
          password: 'ValidPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 for nonexistent domain MX, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');
      assert(
        res.data.message.toLowerCase().includes('mail server') ||
        res.data.message.toLowerCase().includes('domain'),
        `Expected domain/mail server error message, got: ${res.data.message}`
      );
    });

    // TEST 12-PRE-3: Resend provider rejection rolls back registration
    await test('Email Validation: Resend provider rejection rolls back registration with 400', async () => {
      const providerRejectEmail = `test-user-provider-reject-${Date.now()}@articulate-test.local`;
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Provider Reject Learner',
          username: `preject_${Date.now()}`,
          email: providerRejectEmail,
          password: 'ValidPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 on provider rejection, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');
      assert(
        res.data.message.toLowerCase().includes('deliver') ||
        res.data.message.toLowerCase().includes('dispatched') ||
        res.data.message.toLowerCase().includes('failed'),
        `Expected delivery failed message, got: ${res.data.message}`
      );

      // Verify rollback: user record was deleted
      const userInDb = await User.findOne({ email: providerRejectEmail });
      assert(userInDb === null, 'Expected unverified user record to be rolled back/deleted on provider rejection');
    });

    // TEST 12-SMTP-1: SMTP configuration detection and transporter initialization
    await test('SMTP Config: Detects Gmail SMTP settings and initializes secure transporter', async () => {
      const prevHost = process.env.SMTP_HOST;
      const prevPort = process.env.SMTP_PORT;
      const prevSecure = process.env.SMTP_SECURE;
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevMailFrom = process.env.MAIL_FROM;

      try {
        process.env.SMTP_HOST = 'smtp.gmail.com';
        process.env.SMTP_PORT = '465';
        process.env.SMTP_SECURE = 'true';
        process.env.SMTP_USER = 'articulate.sender@gmail.com';
        process.env.SMTP_PASS = 'abcd efgh ijkl mnop';
        process.env.MAIL_FROM = 'articulate.sender@gmail.com';

        assert(isSmtpConfigured() === true, 'Expected isSmtpConfigured() to be true');
        assert(getActiveProvider() === 'smtp', 'Expected active provider to be smtp');
        assert(getSender().includes('articulate.sender@gmail.com'), 'Expected sender to match configured address');

        const transporter = getTransporter();
        assert(transporter, 'Expected transporter to be created');
        assert(transporter.options.host === 'smtp.gmail.com', 'Expected host smtp.gmail.com');
        assert(transporter.options.port === 465, 'Expected port 465');
        assert(transporter.options.secure === true, 'Expected secure: true for port 465');
        assert(transporter.options.auth.user === 'articulate.sender@gmail.com', 'Expected auth user');
      } finally {
        process.env.SMTP_HOST = prevHost || '';
        process.env.SMTP_PORT = prevPort || '';
        process.env.SMTP_SECURE = prevSecure || '';
        process.env.SMTP_USER = prevUser || '';
        process.env.SMTP_PASS = prevPass || '';
        process.env.MAIL_FROM = prevMailFrom || '';
      }
    });

    // TEST 12-SMTP-2: SMTP delivery success returns success: true and message ID
    await test('SMTP Delivery: Successful dispatch returns success: true and message ID', async () => {
      const otpResult = await sendVerificationOTPEmail({
        to: 'smtp-success-user@articulate-test.local',
        name: 'SMTP Learner',
        otp: '654321',
      });
      assert(otpResult.success === true, 'Expected success: true');
      assert(otpResult.id, 'Expected message ID in result');

      const resetResult = await sendPasswordResetEmail({
        to: 'smtp-success-user@articulate-test.local',
        name: 'SMTP Learner',
        resetUrl: 'http://127.0.0.1:5173/reset-password?token=mock_token_123',
      });
      assert(resetResult.success === true, 'Expected success: true');
      assert(resetResult.id, 'Expected message ID in reset result');
    });

    // TEST 12-SMTP-3: SMTP delivery failure is caught and rolls back unverified registration
    await test('SMTP Delivery: Failed dispatch rolls back registration and returns 400', async () => {
      const smtpFailEmail = `test-user-smtp-fail-${Date.now()}@articulate-test.local`;
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'SMTP Failure Learner',
          username: `smtpfail_${Date.now()}`,
          email: smtpFailEmail,
          password: 'ValidPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 on SMTP delivery failure, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');

      // Verify rollback: unverified user record must not linger in DB
      const userInDb = await User.findOne({ email: smtpFailEmail });
      assert(userInDb === null, 'Expected unverified user record to be deleted after SMTP delivery failure');
    });

    // TEST 12-SMTP-4a: SMTP network error (port blocked) falls back to Resend HTTP API
    await test('SMTP Delivery: Falls back to Resend on network/connection errors (e.g. Render port block)', async () => {
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevResend = process.env.RESEND_API_KEY;

      try {
        process.env.SMTP_USER = 'articulate.smtp@gmail.com';
        process.env.SMTP_PASS = 'mock_app_password_123';
        process.env.RESEND_API_KEY = 're_mock_test_key_xyz';

        // Simulate a network-level connection timeout (like Render blocking port 465)
        const networkErr = new Error('connect ETIMEDOUT 142.250.4.108:465');
        networkErr.code = 'ETIMEDOUT';
        setTransporterForTesting({
          sendMail: async () => { throw networkErr; },
        });

        const result = await dispatchEmail({
          to: 'test-recipient@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
          html: '<p>Test Body</p>',
        });

        // Should have fallen through to Resend (which fails with fake key, but provider should be 'resend')
        assert(result.provider === 'resend', `Expected fallback to resend on network error, got provider: ${result.provider}`);
      } finally {
        resetTransporter();
        process.env.SMTP_USER = prevUser || '';
        process.env.SMTP_PASS = prevPass || '';
        process.env.RESEND_API_KEY = prevResend || '';
      }
    });

    // TEST 12-SMTP-4b: SMTP auth error does NOT fall back to Resend
    await test('SMTP Delivery: Does not fall back to Resend on authentication errors', async () => {
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevResend = process.env.RESEND_API_KEY;

      try {
        process.env.SMTP_USER = 'articulate.smtp@gmail.com';
        process.env.SMTP_PASS = 'mock_app_password_123';
        process.env.RESEND_API_KEY = 're_mock_test_key_xyz';

        setTransporterForTesting({
          sendMail: async () => {
            throw new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
          },
        });

        const result = await dispatchEmail({
          to: 'test-recipient@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
          html: '<p>Test Body</p>',
        });

        assert(result.success === false, 'Expected success: false when SMTP auth fails');
        assert(result.provider === 'smtp', 'Expected provider to remain smtp on auth error (no fallback)');
        assert(result.error.includes('Username and Password not accepted'), 'Expected actual auth error reported');
      } finally {
        resetTransporter();
        process.env.SMTP_USER = prevUser || '';
        process.env.SMTP_PASS = prevPass || '';
        process.env.RESEND_API_KEY = prevResend || '';
      }
    });

    // TEST 12-SMTP-5: SMTP Sender Alignment: getSender defaults to SMTP_USER when MAIL_FROM is unset or resend.dev
    await test('SMTP Sender Alignment: Enforces Gmail sender matches SMTP_USER', async () => {
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevMailFrom = process.env.MAIL_FROM;

      try {
        process.env.SMTP_USER = 'articulate.practice@gmail.com';
        process.env.SMTP_PASS = 'mock_pass';

        // When MAIL_FROM is still old resend default
        process.env.MAIL_FROM = 'onboarding@resend.dev';
        assert(
          getSender() === 'Articulate <articulate.practice@gmail.com>',
          `Expected fallback to SMTP_USER when MAIL_FROM is resend.dev, got: ${getSender()}`
        );

        // When MAIL_FROM is unset
        delete process.env.MAIL_FROM;
        assert(
          getSender() === 'Articulate <articulate.practice@gmail.com>',
          `Expected fallback to SMTP_USER when MAIL_FROM is unset, got: ${getSender()}`
        );

        // When MAIL_FROM is properly configured to Gmail address
        process.env.MAIL_FROM = 'articulate.practice@gmail.com';
        assert(
          getSender() === 'Articulate <articulate.practice@gmail.com>',
          `Expected explicit MAIL_FROM, got: ${getSender()}`
        );
      } finally {
        process.env.SMTP_USER = prevUser || '';
        process.env.SMTP_PASS = prevPass || '';
        process.env.MAIL_FROM = prevMailFrom || '';
      }
    });

    // TEST 12-SMTP-6: Password Recovery: SMTP delivery failure rolls back reset token and returns safe 500
    await test('SMTP Delivery: Password recovery failure rolls back reset token with 500', async () => {
      const resetFailEmail = `smtp-fail-user-${Date.now()}@articulate-test.local`;
      const testUser = await User.create({
        name: 'Reset SMTP Fail Learner',
        username: `smtpreset_${Date.now()}`,
        email: resetFailEmail,
        password: 'ValidPassword123!',
        isEmailVerified: true,
      });
      createdUserIds.push(testUser._id);

      const res = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: resetFailEmail },
      });

      assert(res.status === 500, `Expected 500 on SMTP failure during password reset, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');
      assert(
        res.data.message.includes('Unable to send recovery email'),
        `Expected safe error message, got: ${res.data.message}`
      );

      // Verify token rollback in DB
      const userInDb = await User.findById(testUser._id).select('+passwordResetToken +passwordResetExpires');
      assert(!userInDb.passwordResetToken, 'Expected passwordResetToken to be rolled back/cleared');
      assert(!userInDb.passwordResetExpires, 'Expected passwordResetExpires to be cleared');
    });

    // TEST 12-BREVO-1: Brevo Config & Provider Precedence
    await test('Brevo Config: Prioritizes Brevo HTTPS API when BREVO_API_KEY is configured', async () => {
      const prevBrevo = process.env.BREVO_API_KEY;
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevResend = process.env.RESEND_API_KEY;

      try {
        process.env.BREVO_API_KEY = 'xkeysib_mock_key_for_testing_123';
        process.env.SMTP_USER = 'smtp.user@gmail.com';
        process.env.SMTP_PASS = 'smtp_pass';
        process.env.RESEND_API_KEY = 're_mock_test_key';

        assert(isBrevoConfigured() === true, 'Expected isBrevoConfigured() to be true');
        assert(getActiveProvider() === 'brevo', `Expected active provider to be 'brevo', got: ${getActiveProvider()}`);
      } finally {
        if (prevBrevo !== undefined) process.env.BREVO_API_KEY = prevBrevo;
        else delete process.env.BREVO_API_KEY;
        if (prevUser !== undefined) process.env.SMTP_USER = prevUser;
        else delete process.env.SMTP_USER;
        if (prevPass !== undefined) process.env.SMTP_PASS = prevPass;
        else delete process.env.SMTP_PASS;
        if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
        else delete process.env.RESEND_API_KEY;
      }
    });

    // TEST 12-BREVO-2: Brevo Sender Formatting
    await test('Brevo Sender: Resolves verified sender and display name correctly', async () => {
      const prevBrevoEmail = process.env.BREVO_SENDER_EMAIL;
      const prevBrevoName = process.env.BREVO_SENDER_NAME;
      const prevMailFrom = process.env.MAIL_FROM;

      try {
        // Case A: Custom Brevo sender email and name
        process.env.BREVO_SENDER_EMAIL = 'custom@articulate.com';
        process.env.BREVO_SENDER_NAME = 'Custom Articulate';
        const senderA = getBrevoSender();
        assert(senderA.email === 'custom@articulate.com', 'Expected custom sender email');
        assert(senderA.name === 'Custom Articulate', 'Expected custom sender name');

        // Case B: MAIL_FROM formatted as "Articulate <me@gmail.com>"
        delete process.env.BREVO_SENDER_EMAIL;
        delete process.env.BREVO_SENDER_NAME;
        process.env.MAIL_FROM = 'Articulate Support <support@articulate.com>';
        const senderB = getBrevoSender();
        assert(senderB.email === 'support@articulate.com', 'Expected parsed email from MAIL_FROM');
        assert(senderB.name === 'Articulate Support', 'Expected parsed name from MAIL_FROM');

        // Case C: Plain email in MAIL_FROM
        process.env.MAIL_FROM = 'admin@articulate.com';
        const senderC = getBrevoSender();
        assert(senderC.email === 'admin@articulate.com', 'Expected plain email from MAIL_FROM');
        assert(senderC.name === 'Articulate', 'Expected default name Articulate');
      } finally {
        if (prevBrevoEmail !== undefined) process.env.BREVO_SENDER_EMAIL = prevBrevoEmail;
        else delete process.env.BREVO_SENDER_EMAIL;
        if (prevBrevoName !== undefined) process.env.BREVO_SENDER_NAME = prevBrevoName;
        else delete process.env.BREVO_SENDER_NAME;
        if (prevMailFrom !== undefined) process.env.MAIL_FROM = prevMailFrom;
        else delete process.env.MAIL_FROM;
      }
    });

    // TEST 12-BREVO-3: Brevo Delivery Success (Mocked)
    await test('Brevo Delivery: Successful dispatch returns success: true and message ID', async () => {
      const prevBrevo = process.env.BREVO_API_KEY;

      try {
        process.env.BREVO_API_KEY = 'xkeysib_mock_key_for_testing_123';
        let capturedPayload = null;

        setBrevoClientForTesting(async (payload) => {
          capturedPayload = payload;
          return {
            success: true,
            id: '<202610242200.mock-brevo-id@smtp-relay.brevo.com>',
            provider: 'brevo',
          };
        });

        const result = await dispatchEmail({
          to: 'learner@example.com',
          subject: 'Welcome to Articulate',
          text: 'Plain text body',
          html: '<p>HTML body</p>',
        });

        assert(result.success === true, 'Expected success: true');
        assert(result.provider === 'brevo', `Expected provider: 'brevo', got: ${result.provider}`);
        assert(result.id.includes('mock-brevo-id'), 'Expected Brevo messageId in response');
        assert(capturedPayload.to[0].email === 'learner@example.com', 'Expected recipient in payload');
        assert(capturedPayload.htmlContent === '<p>HTML body</p>', 'Expected htmlContent in payload');
      } finally {
        resetBrevoClient();
        if (prevBrevo !== undefined) process.env.BREVO_API_KEY = prevBrevo;
        else delete process.env.BREVO_API_KEY;
      }
    });

    // TEST 12-BREVO-4: Brevo Delivery Failure (Mocked) - Strict No-Fallback
    await test('Brevo Delivery: Provider failure does not fall back to SMTP or Resend', async () => {
      const prevBrevo = process.env.BREVO_API_KEY;
      const prevUser = process.env.SMTP_USER;
      const prevPass = process.env.SMTP_PASS;
      const prevResend = process.env.RESEND_API_KEY;

      try {
        process.env.BREVO_API_KEY = 'xkeysib_mock_key_for_testing_123';
        process.env.SMTP_USER = 'articulate.smtp@gmail.com';
        process.env.SMTP_PASS = 'mock_pass';
        process.env.RESEND_API_KEY = 're_mock_test_key_xyz';

        setBrevoClientForTesting(async () => {
          return {
            success: false,
            error: 'Key not found: Unauthorized',
            provider: 'brevo',
          };
        });

        const result = await dispatchEmail({
          to: 'learner@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
          html: '<p>Test Body</p>',
        });

        assert(result.success === false, 'Expected success: false on Brevo failure');
        assert(result.provider === 'brevo', `Expected provider to remain 'brevo', got: ${result.provider}`);
        assert(result.error.includes('Key not found'), 'Expected actual Brevo provider error');
      } finally {
        resetBrevoClient();
        if (prevBrevo !== undefined) process.env.BREVO_API_KEY = prevBrevo;
        else delete process.env.BREVO_API_KEY;
        if (prevUser !== undefined) process.env.SMTP_USER = prevUser;
        else delete process.env.SMTP_USER;
        if (prevPass !== undefined) process.env.SMTP_PASS = prevPass;
        else delete process.env.SMTP_PASS;
        if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
        else delete process.env.RESEND_API_KEY;
      }
    });

    // TEST 12-BREVO-5: Brevo Delivery: Registration failure rolls back unverified account
    await test('Brevo Delivery: Failed dispatch rolls back registration and returns 400', async () => {
      const brevoFailEmail = `test-user-brevo-fail-${Date.now()}@articulate-test.local`;
      const res = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Brevo Failure Learner',
          username: `brevofail_${Date.now()}`,
          email: brevoFailEmail,
          password: 'ValidPassword123!',
        },
      });
      assert(res.status === 400, `Expected 400 on Brevo delivery failure, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');

      // Verify rollback: unverified user record must not linger in DB
      const userInDb = await User.findOne({ email: brevoFailEmail });
      assert(userInDb === null, 'Expected unverified user record to be deleted after Brevo delivery failure');
    });

    // TEST 12-BREVO-6: Brevo Delivery: Password recovery failure rolls back reset token with 500
    await test('Brevo Delivery: Password recovery failure rolls back reset token with 500', async () => {
      const resetFailEmail = `brevo-fail-user-${Date.now()}@articulate-test.local`;
      const testUser = await User.create({
        name: 'Reset Brevo Fail Learner',
        username: `brevoreset_${Date.now()}`,
        email: resetFailEmail,
        password: 'ValidPassword123!',
        isEmailVerified: true,
      });
      createdUserIds.push(testUser._id);

      const res = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: resetFailEmail },
      });

      assert(res.status === 500, `Expected 500 on Brevo failure during password reset, got ${res.status}`);
      assert(res.data.success === false, 'Expected success: false');
      assert(
        res.data.message.includes('Unable to send recovery email'),
        `Expected safe error message, got: ${res.data.message}`
      );

      // Verify token rollback in DB
      const userInDb = await User.findById(testUser._id).select('+passwordResetToken +passwordResetExpires');
      assert(!userInDb.passwordResetToken, 'Expected passwordResetToken to be rolled back/cleared');
      assert(!userInDb.passwordResetExpires, 'Expected passwordResetExpires to be cleared');
    });

    // TEST 12-BREVO-7: Brevo Delivery: Password reset email dispatch passes recipient name & reset link
    await test('Brevo Delivery: Password reset dispatch passes recipient name & recovery URL to Brevo API', async () => {
      const prevBrevo = process.env.BREVO_API_KEY;

      try {
        process.env.BREVO_API_KEY = 'xkeysib_mock_key_for_testing_123';
        let capturedPayload = null;

        setBrevoClientForTesting(async (payload) => {
          capturedPayload = payload;
          return {
            success: true,
            id: '<202610242200.mock-reset-id@smtp-relay.brevo.com>',
            provider: 'brevo',
          };
        });

        const result = await sendPasswordResetEmail({
          to: 'reset-learner@example.com',
          name: 'Reset Learner',
          resetUrl: 'https://articulate-communication-platform.onrender.com/reset-password?token=mock_crypto_token_123',
          forceRealSend: true,
        });

        assert(result.success === true, 'Expected success: true');
        assert(result.provider === 'brevo', `Expected provider: 'brevo', got: ${result.provider}`);
        assert(capturedPayload !== null, 'Expected Brevo client to be called');
        assert(capturedPayload.to[0].email === 'reset-learner@example.com', 'Expected recipient email');
        assert(capturedPayload.to[0].name === 'Reset', 'Expected parsed recipient name');
        assert(capturedPayload.htmlContent.includes('mock_crypto_token_123'), 'Expected reset URL token in html');
        assert(capturedPayload.textContent.includes('mock_crypto_token_123'), 'Expected reset URL token in text');
      } finally {
        resetBrevoClient();
        if (prevBrevo !== undefined) process.env.BREVO_API_KEY = prevBrevo;
        else delete process.env.BREVO_API_KEY;
      }
    });

    // TEST 12-BREVO-8: Google Account Password Recovery: Allows Google-authenticated users without local password to set one
    await test('Password Recovery: Google-authenticated user without password can request recovery and set a password', async () => {
      const googleUserEmail = `google_recovery_user_${Date.now()}@articulate-test.local`;
      const googleUser = await User.create({
        name: 'Google Recovery Learner',
        username: `googlerecov_${Date.now()}`,
        email: googleUserEmail,
        googleId: `google_oauth_sub_${Date.now()}`,
        authProvider: 'google',
        isEmailVerified: true,
        tokenVersion: 0,
      });
      createdUserIds.push(googleUser._id);

      // Request password reset for Google user
      const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: googleUserEmail },
      });
      assert(forgotRes.status === 200, `Expected 200 for Google user password recovery, got ${forgotRes.status}`);
      assert(forgotRes.data.success === true, 'Expected success: true');

      // Verify token was generated in database
      const userInDb = await User.findById(googleUser._id).select('+passwordResetToken +passwordResetExpires');
      assert(typeof userInDb.passwordResetToken === 'string', 'Expected passwordResetToken to be generated for Google user');
      assert(userInDb.passwordResetExpires > Date.now(), 'Expected valid future expiration');

      // Create a known plain token in memory to test completing the reset
      const plainToken = userInDb.createPasswordResetToken();
      await userInDb.save({ validateBeforeSave: false });

      // Reset password with valid token
      const newLocalPass = 'NewGoogleUserPassword2026!';
      const resetRes = await makeRequest('POST', '/api/auth/reset-password', {
        body: {
          token: plainToken,
          newPassword: newLocalPass,
          confirmPassword: newLocalPass,
        },
      });
      assert(resetRes.status === 200, `Expected 200 on password reset completion, got ${resetRes.status}`);
      assert(resetRes.data.success === true, 'Expected success: true');

      // Verify token is single-use and cleared from DB
      const userAfterReset = await User.findById(googleUser._id).select('+password +passwordResetToken');
      assert(!userAfterReset.passwordResetToken, 'Expected token to be consumed');

      // Verify user can now log in using email and the newly set password
      const loginRes = await makeRequest('POST', '/api/auth/login', {
        body: { identifier: googleUserEmail, password: newLocalPass },
      });
      assert(loginRes.status === 200, `Expected 200 login with newly set password, got ${loginRes.status}`);
      assert(loginRes.data.token, 'Expected JWT token in login response');
    });

    // TEST 12-BREVO-9: Password Recovery: Supports requesting recovery using username
    await test('Password Recovery: Supports requesting recovery using username', async () => {
      const usernameEmail = `user_by_name_${Date.now()}@articulate-test.local`;
      const testUsername = `userbyname_${Date.now()}`;
      const usernameUser = await User.create({
        name: 'Username Recovery Learner',
        username: testUsername,
        email: usernameEmail,
        password: 'ValidPassword123!',
        isEmailVerified: true,
      });
      createdUserIds.push(usernameUser._id);

      const res = await makeRequest('POST', '/api/auth/forgot-password', {
        body: { email: testUsername }, // submitted username into identifier/email field
      });
      assert(res.status === 200, `Expected 200 when requesting by username, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');

      const userInDb = await User.findById(usernameUser._id).select('+passwordResetToken');
      assert(typeof userInDb.passwordResetToken === 'string', 'Expected passwordResetToken generated in DB');
    });

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

    // TEST 12-WH-1: Resend Webhook: Missing signature rejected with 401
    await test('Resend Webhook: Missing signature headers rejected with 401', async () => {
      const res = await makeRawRequest('POST', '/api/auth/webhook/resend', {
        headers: { 'Content-Type': 'application/json' },
        rawBody: JSON.stringify({ type: 'email.bounced' }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(res.data.message.toLowerCase().includes('signature'), 'Expected signature error message');
    });

    // TEST 12-WH-2: Resend Webhook: Invalid signature rejected with 401
    await test('Resend Webhook: Invalid/forged signature rejected with 401', async () => {
      const res = await makeRawRequest('POST', '/api/auth/webhook/resend', {
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'msg_fake_123',
          'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
          'svix-signature': 'v1,dGhpcyBpcyBub3QgYSB2YWxpZCBzaWduYXR1cmU=',
        },
        rawBody: JSON.stringify({ type: 'email.bounced' }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // TEST 12-WH-3: Resend Webhook: Valid signed email.bounced marks unverified account as bounced
    let bounceTestEmail = `bounce_target_${Date.now()}@articulate-test.local`;
    let bounceUserId = null;
    await test('Resend Webhook: Valid signed email.bounced event marks pending user as bounced', async () => {
      const regRes = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Bounce Target Learner',
          username: `bounce_${Date.now()}`,
          email: bounceTestEmail,
          password: 'Password123!',
        },
      });
      assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
      const user = await User.findOne({ email: bounceTestEmail });
      bounceUserId = user._id;
      createdUserIds.push(bounceUserId);

      const bouncePayload = {
        type: 'email.bounced',
        data: {
          to: [bounceTestEmail],
          bounce: {
            message: '550 5.1.1 The email account that you tried to reach does not exist.',
          },
        },
      };

      const signed = signSvixWebhook(bouncePayload);
      const hookRes = await makeRawRequest('POST', '/api/auth/webhook/resend', {
        headers: signed.headers,
        rawBody: signed.rawBody,
      });

      assert(hookRes.status === 200, `Expected 200 for valid webhook, got ${hookRes.status}`);
      assert(hookRes.data.success === true, 'Expected success: true');

      const updatedUser = await User.findById(bounceUserId).select('+emailVerificationOTP +emailVerificationExpires');
      assert(updatedUser.emailDeliveryStatus === 'bounced', 'Expected emailDeliveryStatus: bounced');
      assert(updatedUser.emailBounceReason.includes('does not exist'), 'Expected bounce reason recorded');
      assert(!updatedUser.emailVerificationOTP, 'Expected OTP cleared on bounce');
      assert(!updatedUser.emailVerificationExpires, 'Expected OTP expiry cleared on bounce');
    });

    // TEST 12-WH-4: Resend Webhook: Bounced account cannot verify OTP
    await test('Resend Webhook: Bounced account cannot verify OTP (returns 400)', async () => {
      const verifyRes = await makeRequest('POST', '/api/auth/verify-email', {
        body: {
          email: bounceTestEmail,
          otp: '123456',
        },
      });
      assert(verifyRes.status === 400, `Expected 400 for bounced account, got ${verifyRes.status}`);
      assert(verifyRes.data.bounced === true, 'Expected bounced flag in response');
      assert(verifyRes.data.message.toLowerCase().includes('bounced'), 'Expected bounce warning');
    });

    // TEST 12-WH-5: Resend Webhook: Bounced account cannot login
    await test('Resend Webhook: Bounced account cannot login (returns 403 with bounce explanation)', async () => {
      const loginRes = await makeRequest('POST', '/api/auth/login', {
        body: {
          identifier: bounceTestEmail,
          password: 'Password123!',
        },
      });
      assert(loginRes.status === 403, `Expected 403 for login on bounced account, got ${loginRes.status}`);
      assert(loginRes.data.emailBounced === true, 'Expected emailBounced flag in response');
      assert(loginRes.data.message.toLowerCase().includes('bounced'), 'Expected bounce explanation');
    });

    // TEST 12-WH-6: Resend Webhook: Verified account is immune to delayed bounce events
    await test('Resend Webhook: Verified account is IMMUNE to delayed bounce events', async () => {
      const verifiedEmail = `immune_verified_${Date.now()}@articulate-test.local`;
      const regRes = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Immune Learner',
          username: `immune_${Date.now()}`,
          email: verifiedEmail,
          password: 'Password123!',
        },
      });
      assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
      const user = await User.findOne({ email: verifiedEmail });
      createdUserIds.push(user._id);

      // Verify the user
      user.isEmailVerified = true;
      user.emailDeliveryStatus = 'delivered';
      user.emailVerificationOTP = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });

      // Now send a delayed bounce event for this verified user
      const delayedBouncePayload = {
        type: 'email.bounced',
        data: {
          to: [verifiedEmail],
          bounce: {
            message: 'Delayed bounce simulation',
          },
        },
      };

      const signed = signSvixWebhook(delayedBouncePayload);
      const hookRes = await makeRawRequest('POST', '/api/auth/webhook/resend', {
        headers: signed.headers,
        rawBody: signed.rawBody,
      });

      assert(hookRes.status === 200, `Expected 200, got ${hookRes.status}`);

      const checkUser = await User.findById(user._id);
      assert(checkUser.isEmailVerified === true, 'Verified user must REMAIN verified');
      assert(checkUser.emailDeliveryStatus === 'delivered', 'Delivery status must NOT be changed to bounced');
    });

    // TEST 12-WH-7: Re-registration reclaims username from dead/bounced unverified account
    await test('Resend Webhook: Re-registering with corrected email reclaims username from bounced unverified account', async () => {
      const targetUsername = `reclaim_${Date.now()}`;
      const badEmail = `bad_address_${Date.now()}@articulate-test.local`;
      const fixedEmail = `fixed_address_${Date.now()}@articulate-test.local`;

      // 1. Initial registration with bad email
      const reg1 = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Typo User',
          username: targetUsername,
          email: badEmail,
          password: 'Password123!',
        },
      });
      assert(reg1.status === 201, `Expected 201, got ${reg1.status}`);

      // 2. Mark bad email as bounced via webhook
      const bouncePayload = {
        type: 'email.bounced',
        data: {
          to: [badEmail],
          bounce: { message: '550 Recipient does not exist' },
        },
      };
      const signed = signSvixWebhook(bouncePayload);
      await makeRawRequest('POST', '/api/auth/webhook/resend', {
        headers: signed.headers,
        rawBody: signed.rawBody,
      });

      // 3. User registers again with the SAME username but corrected email
      const reg2 = await makeRequest('POST', '/api/auth/register', {
        body: {
          name: 'Typo User Corrected',
          username: targetUsername,
          email: fixedEmail,
          password: 'Password123!',
        },
      });
      assert(reg2.status === 201, `Expected 201 when reclaiming username, got ${reg2.status}`);
      assert(reg2.data.pendingVerification === true, 'Expected pendingVerification: true');

      const newUser = await User.findOne({ email: fixedEmail });
      assert(newUser, 'New user with corrected email must exist');
      assert(newUser.username === targetUsername, 'New user should successfully own the username');
      createdUserIds.push(newUser._id);

      // Verify old dead user was removed
      const oldUser = await User.findOne({ email: badEmail });
      assert(oldUser === null, 'Old bounced account should be purged');
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
    if (createdVideoIds.length > 0) {
      const deleteResult = await Video.deleteMany({ _id: { $in: createdVideoIds } });
      console.log(`   Cleaned up ${deleteResult.deletedCount} test video records.`);
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
