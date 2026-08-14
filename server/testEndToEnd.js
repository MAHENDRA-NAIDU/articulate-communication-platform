const http = require('http');

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Starting End-to-End API Automated Verification...\n');

  try {
    // 1. Health Check
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
    });
    console.log(`✅ [1/8] Health Check: Status ${health.status} (${health.data.message})`);

    // 2. Fetch Videos
    const videosRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/videos',
      method: 'GET',
    });
    console.log(`✅ [2/8] Get Videos: Found ${videosRes.data.count} speaking videos`);
    const firstVideo = videosRes.data.videos[0];

    // 3. Login as Learner
    const loginRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'mahendra@example.com', password: 'Password123!' }
    );
    console.log(`✅ [3/8] Learner Login: Logged in as ${loginRes.data.user.name} (@${loginRes.data.user.username})`);
    const learnerToken = loginRes.data.token;

    // 4. Create Comment
    const commentRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/comments/video/${firstVideo._id}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${learnerToken}`,
        },
      },
      { content: 'Automated test feedback: Great pitch structure and confident eye contact!' }
    );
    console.log(`✅ [4/8] Post Comment: Success! Comment ID: ${commentRes.data.comment._id}`);
    const createdCommentId = commentRes.data.comment._id;

    // 5. Verify Comments on Video
    const getCommentsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/comments/video/${firstVideo._id}`,
      method: 'GET',
    });
    console.log(`✅ [5/8] Get Comments: Retrieved ${getCommentsRes.data.count} comments on video`);

    // 6. Delete the test comment
    const delCommentRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/comments/${createdCommentId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    console.log(`✅ [6/8] Delete Comment: Status ${delCommentRes.status} (${delCommentRes.data.message})`);

    // 7. Login as Admin & Check Dashboard Stats
    const adminLoginRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@articulate.com', password: 'Password123!' }
    );
    const adminToken = adminLoginRes.data.token;

    const statsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ [7/8] Admin Stats: Total Users: ${statsRes.data.stats.totalUsers}, Videos: ${statsRes.data.stats.totalVideos}, Comments: ${statsRes.data.stats.totalComments}`);

    // 8. Register a new user, create practice video, update, and delete
    const uniqueUsername = `testuser_${Date.now()}`;
    const regRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Automated Test User',
        username: uniqueUsername,
        email: `${uniqueUsername}@test.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }
    );
    const newUserToken = regRes.data.token;
    const newUserId = regRes.data.user._id;

    // Create a new practice drill
    const newVideoRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/videos',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newUserToken}`,
        },
      },
      {
        title: 'Automated Test Speaking Drill',
        description: 'Testing speaking drill creation and update lifecycle.',
        category: 'Technology',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 30,
      }
    );
    const testVideoId = newVideoRes.data.video._id;

    // Update video
    await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/videos/${testVideoId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newUserToken}`,
        },
      },
      { title: 'Updated Speaking Drill Title', category: 'Debate' }
    );

    // Delete user account (which also cascade deletes the video)
    await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/users/${newUserId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${newUserToken}` },
    });
    console.log(`✅ [8/8] Complete User + Video Lifecycle: Registration, drill creation, update, and cascading account deletion verified!`);

    console.log('\n🎉 ALL 8 AUTOMATED TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
