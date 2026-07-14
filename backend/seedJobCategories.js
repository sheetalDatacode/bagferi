import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import JobCategory from './models/JobCategory.model.js';

dotenv.config();

const categoriesToSeed = [
  {
    name: "Real Estate",
    subcategories: [
      "Sales Executive",
      "Telecaller",
      "Property Consultant",
      "Accountant",
      "CRM Executive",
      "Back Office Executive",
      "Office Helper",
      "Site Visit Executive",
      "Driver",
      "Security Guard"
    ],
    isActive: true,
    order: 1
  },
  {
    name: "Textile Industry",
    subcategories: [
      "Salesman",
      "Accounting",
      "Office helper",
      "Folding",
      "Cutting",
      "Stitching",
      "Stone workers",
      "Mill workers",
      "Embroidery worker",
      "Designer",
      "Cutting master",
      "Printing master",
      "Part Time accountant",
      "Driver",
      "Delivery boy",
      "Godawan helper",
      "Press man",
      "Machine operator",
      "Telecaller",
      "Security guard"
    ],
    isActive: true,
    order: 2
  }
];

const seedJobCategories = async () => {
  try {
    console.log('Connecting to MongoDB...');
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const catData of categoriesToSeed) {
      const existing = await JobCategory.findOne({ name: { $regex: new RegExp(`^${catData.name}$`, 'i') } });
      
      if (existing) {
        console.log(`Updating existing category: ${catData.name}`);
        existing.subcategories = catData.subcategories;
        existing.order = catData.order;
        await existing.save();
      } else {
        console.log(`Creating new category: ${catData.name}`);
        await JobCategory.create(catData);
      }
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding job categories:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

seedJobCategories();
