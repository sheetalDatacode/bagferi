import mongoose from 'mongoose';
import dotenv from 'dotenv';
import B2BSettings from './backend/models/B2BSettings.model.js';

dotenv.config({ path: './backend/.env' });

async function removeNoReturn() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bagferi');
        console.log('Connected to DB');

        const settings = await B2BSettings.findOne();
        if (settings && settings.homeFeatures) {
            settings.homeFeatures = settings.homeFeatures.filter(f => f.title !== 'No return');
            await settings.save();
            console.log('Successfully removed No return');
        } else {
            console.log('No settings or homeFeatures found');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

removeNoReturn();
