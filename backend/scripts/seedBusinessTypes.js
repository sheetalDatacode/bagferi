import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import connectDB from '../config/database.js';

dotenv.config();

const seedBusinessTypes = async () => {
    try {
        await connectDB();

        // We no longer clear existing types to avoid data loss on update
        // The script now handles existence checks


        const types = [
            { name: 'Textile', slug: 'textile', description: 'Textile and Garments manufacturing and trading' },
            { name: 'Property Broker', slug: 'property-broker', description: 'Real estate brokerage and consulting' },
            { name: 'Property Developer', slug: 'property-developer', description: 'Real estate development and construction' },
            { name: 'Gray Market / Gray Broker', slug: 'gray-market-broker', description: 'Gray market trading and brokerage' },
            { name: 'Agency/ Agent( Broker)', slug: 'agency-agent-broker', description: 'Agent based brokerage and agency services' },
            { name: 'SUPPORT & SERVICES', slug: 'support-and-service', description: 'Support and maintenance services' },
        ];

        for (const type of types) {
            // Check if exists first for better reliability
            let createdType = await BusinessType.findOne({ slug: type.slug });
            if (!createdType) {
                createdType = await BusinessType.create(type);
            } else {
                createdType.name = type.name;
                createdType.description = type.description;
                await createdType.save();
            }

            let enabledModules = ['subscription', 'profile', 'settings'];
            let maxImages = 5;

            if (type.slug === 'textile') {
                enabledModules.push('product', 'banner');
            } else if (['property-broker', 'gray-market-broker', 'agency-agent-broker', 'support-and-service'].includes(type.slug)) {
                enabledModules.push('property');
                maxImages = 5;
            } else if (type.slug === 'property-developer') {
                enabledModules.push('property');
                maxImages = 50;
            }

            // Update or create settings
            await BusinessTypeSettings.findOneAndUpdate(
                { businessTypeId: createdType._id },
                { 
                    enabledModules, 
                    maxImagesPerProperty: maxImages 
                },
                { upsert: true, new: true }
            );

            console.log(`✅ Processed ${type.name}`);
        }

        console.log('🚀 Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding business types:', error);
        process.exit(1);
    }
};

seedBusinessTypes();
