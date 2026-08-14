const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const { Video } = require('../models/Video');
const Comment = require('../models/Comment');

const sampleUsers = [
  {
    name: 'Administrator',
    username: 'admin',
    email: 'admin@articulate.com',
    password: 'Password123!',
    role: 'admin',
    bio: 'Platform Administrator & Community Moderator. Fostering a respectful, constructive speaking environment.',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mahendra Naidu',
    username: 'mahendra',
    email: 'mahendra@example.com',
    password: 'Password123!',
    role: 'user',
    bio: 'Practicing my communication every day. Aspiring software engineer and speaker building articulate presentation skills.',
    profileImage: '/avatars/mahendra.jpg',
  },
  {
    name: 'Ananya Sharma',
    username: 'ananya',
    email: 'ananya@example.com',
    password: 'Password123!',
    role: 'user',
    bio: 'Final year college student. Preparing for campus placements, technical interviews and group discussions.',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'David Chen',
    username: 'david_chen',
    email: 'david@example.com',
    password: 'Password123!',
    role: 'user',
    bio: 'Tech lead refining executive presence, concise storytelling, and impromptu speaking skills.',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  },
  {
    name: 'Priya Patel',
    username: 'priya_speaks',
    email: 'priya@example.com',
    password: 'Password123!',
    role: 'user',
    bio: 'Debate club member practicing structured argumentation, vocal variety, and pause mastery.',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  },
];

// Open access sample video clips that stream smoothly
const sampleVideosData = [
  {
    userIndex: 1, // Mahendra Naidu
    title: 'Self Introduction for Software Engineering Campus Placements',
    description:
      'Practicing a 90-second elevator pitch introducing my background in Computer Science, project highlights in React/Node, and why I am passionate about backend scalability. Looking for feedback on my speaking pace and eye contact.',
    category: 'Self Introduction',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 42,
    aiAnalysis: {
      status: 'none',
      transcript: 'Hello everyone, my name is Mahendra Naidu and I am passionate about engineering scalable web applications...',
      wordsPerMinute: 135,
      fillerWords: [{ word: 'um', count: 2 }, { word: 'like', count: 1 }],
      clarityScore: 88,
      feedbackNotes: ['Great energy and composure', 'Keep posture upright and maintain eye contact'],
    },
  },
  {
    userIndex: 2, // Ananya
    title: 'Answering: "Tell Me About a Time You Overcame a Conflict"',
    description:
      'Using the STAR technique (Situation, Task, Action, Result) to structure a behavioral interview answer. Would love tips on whether the resolution sounds diplomatic and clear.',
    category: 'Interview Practice',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 89,
  },
  {
    userIndex: 3, // David
    title: 'Explaining Cloud Computing to a Non-Technical Audience',
    description:
      'Trying an analogy-driven explanation of microservices and cloud virtualization for everyday people. Practicing simplifying jargon and keeping listeners engaged.',
    category: 'Technology',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 65,
  },
  {
    userIndex: 4, // Priya
    title: 'Group Discussion Opener: "Is Remote Work Better for Innovation?"',
    description:
      'Practicing how to initiate a group discussion confidently with a balanced opening statement and inviting others to contribute their perspectives.',
    category: 'Group Discussion',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 110,
  },
  {
    userIndex: 1, // Mahendra Naidu
    title: 'Daily Speaking Drill #14: Describing My Morning Routine',
    description:
      'A spontaneous 2-minute impromptu speaking exercise without notes to practice fluency, sentence flow, and vocal transitions.',
    category: 'Daily Life',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 31,
  },
  {
    userIndex: 2, // Ananya
    title: 'Debate Practice: Ethical Implications of Generative AI in Creative Arts',
    description:
      'Presenting the affirmative stance on copyright protection for digital artists against unauthorized training datasets. Feedback on vocal modulation welcomed!',
    category: 'Debate',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    duration: 15,
    views: 74,
  },
];

const sampleComments = [
  {
    videoIndex: 0,
    userIndex: 2, // Ananya
    content:
      'Great flow Mahendra! Your explanation of your React project was very crisp. One suggestion: try pausing for a brief second before stating your key achievements—it helps the interviewer digest the numbers better!',
  },
  {
    videoIndex: 0,
    userIndex: 3, // David
    content:
      'Solid eye contact throughout. Your tone is warm and professional. Watch out for saying "um" when transitioning between your degree and your projects.',
  },
  {
    videoIndex: 1,
    userIndex: 1, // Mahendra Naidu
    content:
      'Really liked how you emphasized the "Result" part of the STAR model. That is usually where people rush, but you highlighted what both sides learned effectively.',
  },
  {
    videoIndex: 1,
    userIndex: 4, // Priya
    content:
      'Very clear articulation! Your body language is confident and calm. Excellent preparation for behavioral rounds.',
  },
  {
    videoIndex: 2,
    userIndex: 2, // Ananya
    content:
      'The restaurant kitchen analogy for cloud compute instances made total sense! Even beginners could grasp it easily.',
  },
  {
    videoIndex: 3,
    userIndex: 1, // Mahendra Naidu
    content:
      'Inviting other members right after laying out the 2 main pillars was very smooth. That shows true collaborative leadership in a GD.',
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('[Seed] Clearing existing data...');
    await User.deleteMany({});
    await Video.deleteMany({});
    await Comment.deleteMany({});

    console.log('[Seed] Inserting users...');
    const createdUsers = [];
    for (const u of sampleUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`[Seed] Created ${createdUsers.length} users (including Admin).`);

    console.log('[Seed] Inserting sample practice videos...');
    const createdVideos = [];
    for (const vData of sampleVideosData) {
      const author = createdUsers[vData.userIndex];
      const video = await Video.create({
        userId: author._id,
        title: vData.title,
        description: vData.description,
        category: vData.category,
        videoUrl: vData.videoUrl,
        thumbnailUrl: vData.thumbnailUrl,
        duration: vData.duration,
        views: vData.views,
        aiAnalysis: vData.aiAnalysis || {
          status: 'none',
          transcript: '',
          wordsPerMinute: 0,
          fillerWords: [],
          clarityScore: 0,
          feedbackNotes: [],
        },
      });
      createdVideos.push(video);
    }
    console.log(`[Seed] Created ${createdVideos.length} practice videos.`);

    console.log('[Seed] Inserting constructive feedback comments...');
    for (const cData of sampleComments) {
      const author = createdUsers[cData.userIndex];
      const video = createdVideos[cData.videoIndex];
      await Comment.create({
        userId: author._id,
        videoId: video._id,
        content: cData.content,
      });
    }
    console.log(`[Seed] Created ${sampleComments.length} feedback comments.`);

    console.log('\n========================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('Admin Account:');
    console.log('  Email:    admin@articulate.com');
    console.log('  Password: Password123!');
    console.log('Demo Learner Account:');
    console.log('  Email:    mahendra@example.com (or username: mahendra)');
    console.log('  Name:     Mahendra Naidu');
    console.log('  Password: Password123!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
