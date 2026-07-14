import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import SupportConfig from './models/SupportConfig.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dealing-india';

async function checkConfig() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const configs = await SupportConfig.find();
        console.log(`Number of SupportConfig documents found: ${configs.length}`);
        
        configs.forEach((c, i) => {
            console.log(`\nDocument ${i + 1} (ID: ${c._id}):`);
            console.log(`- userTermsAndConditions length: ${c.userTermsAndConditions?.length || 0}`);
            console.log(`- vendorTermsAndConditions length: ${c.vendorTermsAndConditions?.length || 0}`);
            console.log(`- heroTitle: ${c.heroTitle}`);
            console.log(`- updatedAt: ${c.updatedAt}`);
        });

        if (configs.length > 1) {
            console.log('\nWARNING: Multiple config documents found! This might cause inconsistency.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkConfig();
