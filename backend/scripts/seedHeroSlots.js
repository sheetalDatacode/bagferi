import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import BannerSlot from '../models/BannerSlot.model.js';

dotenv.config();

const heroSlots = [
    { slotNumber: 1, bannerType: 'hero', price: 1999, isActive: true },
    { slotNumber: 2, bannerType: 'hero', price: 1799, isActive: true },
    { slotNumber: 3, bannerType: 'hero', price: 1499, isActive: true },
    { slotNumber: 4, bannerType: 'hero', price: 1299, isActive: true },
    { slotNumber: 5, bannerType: 'hero', price: 999, isActive: true },
];

const seedHeroSlots = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        for (const slotData of heroSlots) {
            const existing = await BannerSlot.findOne({
                slotNumber: slotData.slotNumber,
                bannerType: 'hero'
            });

            if (!existing) {
                await BannerSlot.create(slotData);
                console.log(`✅ Created Hero slot ${slotData.slotNumber}`);
            } else {
                console.log(`⏭️  Hero slot ${slotData.slotNumber} already exists`);
            }
        }

        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding slots:', error);
        process.exit(1);
    }
};

seedHeroSlots();
