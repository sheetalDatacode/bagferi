import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import Banner from '../models/Banner.model.js';

dotenv.config();

const banners = [
    {
        type: 'hero',
        bannerType: 'hero',
        title: 'Aura Electronics - The Future of Tech',
        subtitle: 'Shop our latest premium collection',
        image: '/upload/banners/b2c_1.png',
        link: '/category/electronics',
        order: 1,
        isActive: true
    },
    {
        type: 'hero',
        bannerType: 'hero',
        title: 'Moda Viva - Trendsetting Fashion',
        subtitle: 'Dress to impress with our new arrivals',
        image: '/upload/banners/b2c_2.png',
        link: '/category/fashion',
        order: 2,
        isActive: true
    },
    {
        type: 'hero',
        bannerType: 'b2b',
        title: 'Global Wholesale Sourcing',
        subtitle: 'Industrial machinery, bulk supplies & equipment',
        image: '/upload/banners/b2b_1.png',
        link: '/b2b/catalog',
        order: 1,
        isActive: true
    },
    {
        type: 'hero',
        bannerType: 'b2b',
        title: 'Trusted Logistics & Sourcing',
        subtitle: 'Connect with verified manufacturers globally',
        image: '/upload/banners/b2b_2.png',
        link: '/b2b/login',
        order: 2,
        isActive: true
    }
];

const seedBanners = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Cleaning up existing default banners...');
        await Banner.deleteMany({});

        console.log('Seeding banners...');
        await Banner.insertMany(banners);
        console.log('Successfully seeded 4 banners with web-accessible URLs');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding banners:', error);
        process.exit(1);
    }
};

seedBanners();
