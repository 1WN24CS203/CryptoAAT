import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const clearDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cryptoaat');
    console.log('Connected. Deleting all user accounts...');
    const result = await User.deleteMany({});
    console.log(`\n===================================`);
    console.log(`SUCCESS: Deleted ${result.deletedCount} user account(s) from database.`);
    console.log(`===================================\n`);
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

clearDB();
