const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/communication_practice';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('\n======================================================');
    console.error('❌ [Database Connection Error]');
    console.error(`Unable to connect to MongoDB at: ${mongoUri}`);
    console.error(`Reason: ${error.message}`);
    console.error('------------------------------------------------------');
    console.error('👉 To start MongoDB on Windows:');
    console.error('   1. Open PowerShell or Command Prompt as Administrator');
    console.error('   2. Run: net start MongoDB');
    console.error('   (or start MongoDB Server in Windows Services app)');
    console.error('======================================================\n');
    process.exit(1);
  }
};

module.exports = connectDB;
