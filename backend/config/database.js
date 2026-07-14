import mongoose from 'mongoose';
import dotenv from 'dotenv';

import dns from 'dns';
dotenv.config();

// Set Google DNS to fix querySrv ECONNREFUSED issues with some ISPs
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Note: useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
      // but keeping for compatibility
    });

    // console.log(`✅ MongoDB Connected Successfully!`);
    // console.log(`   Host: ${conn.connection.host}`);
    // console.log(`   Database: ${conn.connection.name}`);
    // console.log(`   Port: ${conn.connection.port || 'default'}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Please check your MONGODB_URI in .env file');
    process.exit(1);
  }
};

export default connectDB;

