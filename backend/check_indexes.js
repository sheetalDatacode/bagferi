import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealingindia';
    await mongoose.connect(uri);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    console.log('\nFetching current indexes for "users" collection:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    await mongoose.disconnect();
    console.log('\nDisconnected.');
  } catch (error) {
    console.error('Error checking indexes:', error);
    process.exit(1);
  }
};

run();
