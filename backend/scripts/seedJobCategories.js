import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import JobCategory from '../models/JobCategory.model.js';

const seedData = [
    {
        name: 'Real Estate',
        order: 1,
        subcategories: [
            'Sales Executive',
            'Telecaller',
            'Property Consultant',
            'Accountant',
            'CRM Executive',
            'Back Office Executive',
            'Office Helper',
            'Site Visit Executive',
            'Driver',
            'Security Guard'
        ]
    },
    {
        name: 'Textile Industry',
        order: 2,
        subcategories: [
            'Salesman',
            'Accounting',
            'Office Helper',
            'Folding',
            'Cutting',
            'Stitching',
            'Stone Workers',
            'Mill Workers',
            'Embroidery Worker',
            'Designer',
            'Cutting Master',
            'Printing Master',
            'Part Time Accountant',
            'Driver',
            'Delivery Boy',
            'Godawan Helper',
            'Press Man',
            'Machine Operator',
            'Telecaller',
            'Security Guard'
        ]
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        for (const data of seedData) {
            const existing = await JobCategory.findOne({ name: data.name });
            if (existing) {
                existing.subcategories = data.subcategories;
                await existing.save();
                console.log(`Updated ${data.name}`);
            } else {
                await JobCategory.create(data);
                console.log(`Created ${data.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
