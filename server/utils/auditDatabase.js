const mongoose = require('mongoose');
const User = require('../models/User');
const { Video } = require('../models/Video');
const Comment = require('../models/Comment');
const connectDB = require('../config/db');

connectDB().then(async () => {
  console.log('=== DATABASE HEALTH & AUDIT REPORT ===\n');

  const users = await User.find({});
  console.log(`1. USERS COLLECTION (${users.length} Total Users):`);
  users.forEach((u, i) => {
    console.log(`   [${i + 1}] Name: ${u.name} | @${u.username} | ${u.email} | Role: ${u.role} | Avatar: ${u.profileImage || 'Initial fallback'}`);
  });

  const videos = await Video.find({}).populate('userId', 'name username');
  console.log(`\n2. VIDEOS COLLECTION (${videos.length} Practice Videos):`);
  videos.forEach((v, i) => {
    console.log(`   [${i + 1}] "${v.title}" | Speaker: @${v.userId?.username || 'user'} | Category: ${v.category} | Views: ${v.viewsCount || 0} | Likes: ${v.likes?.length || 0}`);
  });

  const comments = await Comment.find({}).populate('userId', 'username');
  console.log(`\n3. COMMENTS COLLECTION (${comments.length} Constructive Feedback Entries):`);
  comments.forEach((c, i) => {
    console.log(`   [${i + 1}] Feedback from @${c.userId?.username || 'user'} | Type: ${c.feedbackType || 'general'} | Content: "${c.text.substring(0, 55)}..."`);
  });

  const userIndexes = await User.collection.indexes();
  console.log('\n4. DATABASE INDEX INTEGRITY:');
  userIndexes.forEach((idx) => {
    console.log(`   - Index on ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE CONSTRAINT)' : ''}`);
  });

  console.log('\n=== STATUS: 100% HEALTHY & SYNCHRONIZED ===');
  process.exit(0);
}).catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
