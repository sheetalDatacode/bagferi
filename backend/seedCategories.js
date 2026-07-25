import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Adjust path as needed based on your backend structure
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import B2BCategory from './models/B2BCategory.model.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bagferi')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedCategories = async () => {
  try {
    // Clear existing categories
    await B2BCategory.deleteMany({});
    console.log('Cleared existing categories');

    const images = {
      mensFashion: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80',
      womensFashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80',
      topwear: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',
      bottomwear: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80',
      ethnic: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80',
      western: 'https://images.unsplash.com/photo-1515347619362-673471ba6596?w=500&q=80'
    };

    // 1. MENS FASHION TREE
    const mensRoot = await B2BCategory.create({
      name: "Men's Fashion",
      image: images.mensFashion,
      level: 1,
      parent: null
    });
    console.log(`Created Root Category: ${mensRoot.name}`);

    // Men's Topwear
    const mensTopwear = await B2BCategory.create({
      name: 'Topwear',
      image: images.topwear,
      level: 2,
      parent: mensRoot._id
    });
    
    await B2BCategory.insertMany([
      { name: 'T-Shirts', image: images.topwear, level: 3, parent: mensTopwear._id },
      { name: 'Casual Shirts', image: images.topwear, level: 3, parent: mensTopwear._id },
      { name: 'Jackets', image: images.topwear, level: 3, parent: mensTopwear._id }
    ]);

    // Men's Bottomwear
    const mensBottomwear = await B2BCategory.create({
      name: 'Bottomwear',
      image: images.bottomwear,
      level: 2,
      parent: mensRoot._id
    });

    await B2BCategory.insertMany([
      { name: 'Jeans', image: images.bottomwear, level: 3, parent: mensBottomwear._id },
      { name: 'Trousers', image: images.bottomwear, level: 3, parent: mensBottomwear._id },
      { name: 'Shorts', image: images.bottomwear, level: 3, parent: mensBottomwear._id }
    ]);

    // 2. WOMENS FASHION TREE
    const womensRoot = await B2BCategory.create({
      name: "Women's Fashion",
      image: images.womensFashion,
      level: 1,
      parent: null
    });
    console.log(`Created Root Category: ${womensRoot.name}`);

    // Women's Western Wear
    const womensWestern = await B2BCategory.create({
      name: 'Western Wear',
      image: images.western,
      level: 2,
      parent: womensRoot._id
    });

    await B2BCategory.insertMany([
      { name: 'Dresses', image: images.western, level: 3, parent: womensWestern._id },
      { name: 'Tops', image: images.western, level: 3, parent: womensWestern._id }
    ]);

    // Women's Ethnic Wear
    const womensEthnic = await B2BCategory.create({
      name: 'Ethnic Wear',
      image: images.ethnic,
      level: 2,
      parent: womensRoot._id
    });

    await B2BCategory.insertMany([
      { name: 'Sarees', image: images.ethnic, level: 3, parent: womensEthnic._id },
      { name: 'Kurtas & Suits', image: images.ethnic, level: 3, parent: womensEthnic._id }
    ]);

    console.log('\n✅ Seeding completed successfully with Clothes categories!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
