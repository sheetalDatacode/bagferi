/**
 * Migration script to fix banner slots index issue
 * This script:
 * 1. Drops old slotNumber_1 index (if exists)
 * 2. Ensures compound index slotNumber_1_bannerType_1 exists
 * 3. Updates existing slots without bannerType to 'hero'
 * 4. Creates B2B slots if they don't exist
 */

import mongoose from 'mongoose';
import BannerSlot from '../models/BannerSlot.model.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

async function fixBannerSlotsIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.db.collection('bannerslots');

    // Step 1: List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Step 2: Drop old slotNumber_1 index if it exists
    const oldIndexName = 'slotNumber_1';
    if (indexes.some(idx => idx.name === oldIndexName)) {
      console.log(`\n🗑️  Dropping old index: ${oldIndexName}...`);
      await collection.dropIndex(oldIndexName);
      console.log(`✅ Dropped index: ${oldIndexName}`);
    } else {
      console.log(`\n✅ Old index ${oldIndexName} doesn't exist`);
    }

    // Step 3: Ensure compound index exists
    console.log('\n📌 Creating/ensuring compound index: slotNumber_1_bannerType_1...');
    try {
      await collection.createIndex(
        { slotNumber: 1, bannerType: 1 },
        { unique: true, name: 'slotNumber_1_bannerType_1' }
      );
      console.log('✅ Compound index created/verified');
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log('✅ Compound index already exists');
      } else {
        throw error;
      }
    }

    // Step 4: Update existing slots without bannerType to 'hero'
    console.log('\n🔄 Updating existing slots without bannerType to "hero"...');
    const updateResult = await BannerSlot.updateMany(
      {
        $or: [
          { bannerType: { $exists: false } },
          { bannerType: null }
        ]
      },
      { $set: { bannerType: 'hero' } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} slots to 'hero' type`);

    // Step 5: Create B2B slots if they don't exist
    console.log('\n🔄 Creating B2B slots...');
    const defaultB2BSlots = [
      { slotNumber: 1, bannerType: 'b2b', price: 2999, isActive: true },
      { slotNumber: 2, bannerType: 'b2b', price: 2799, isActive: true },
      { slotNumber: 3, bannerType: 'b2b', price: 2499, isActive: true },
      { slotNumber: 4, bannerType: 'b2b', price: 2299, isActive: true },
      { slotNumber: 5, bannerType: 'b2b', price: 1999, isActive: true },
      { slotNumber: 6, bannerType: 'b2b', price: 1799, isActive: true },
      { slotNumber: 7, bannerType: 'b2b', price: 1499, isActive: true },
      { slotNumber: 8, bannerType: 'b2b', price: 1299, isActive: true },
      { slotNumber: 9, bannerType: 'b2b', price: 1199, isActive: true },
      { slotNumber: 10, bannerType: 'b2b', price: 999, isActive: true },
    ];

    let createdCount = 0;
    for (const slotData of defaultB2BSlots) {
      try {
        const existingSlot = await BannerSlot.findOne({
          slotNumber: slotData.slotNumber,
          bannerType: 'b2b'
        });

        if (!existingSlot) {
          await BannerSlot.create(slotData);
          createdCount++;
          console.log(`  ✅ Created B2B slot ${slotData.slotNumber}`);
        } else {
          console.log(`  ⏭️  B2B slot ${slotData.slotNumber} already exists`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating B2B slot ${slotData.slotNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${createdCount} new B2B slots`);

    // Final count
    const heroSlotsCount = await BannerSlot.countDocuments({ bannerType: 'hero' });
    const b2bSlotsCount = await BannerSlot.countDocuments({ bannerType: 'b2b' });
    console.log(`\n📊 Final counts:`);
    console.log(`  - Hero slots: ${heroSlotsCount}`);
    console.log(`  - B2B slots: ${b2bSlotsCount}`);
    console.log(`  - Total slots: ${heroSlotsCount + b2bSlotsCount}`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixBannerSlotsIndex()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
