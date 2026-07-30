import mongoose from 'mongoose';
import GroceryProduct from './models/GroceryProduct.model.js';
import ShopUnit from './models/ShopUnit.model.js';
import Vendor from './models/Vendor.model.js';
import GroceryCategory from './models/GroceryCategory.model.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bagferi');
  
  // 1. Get all grocery categories
  const categories = await GroceryCategory.find({}).lean();
  console.log('--- CATEGORIES ---');
  categories.forEach(c => console.log(`${c._id} - ${c.name} (parent: ${c.parent})`));

  // 2. Get all shop units and their delivery zones
  const shops = await ShopUnit.find({}).lean();
  console.log('\n--- SHOPS ---');
  shops.forEach(s => {
    console.log(`Shop: ${s.name}, VendorId: ${s.vendorId}`);
    console.log(`DeliveryZones:`, s.deliveryZones);
  });

  // 3. Get all grocery products
  const products = await GroceryProduct.find({}).lean();
  console.log('\n--- GROCERY PRODUCTS ---');
  products.forEach(p => {
    console.log(`Product: ${p.name}, VendorId: ${p.vendorId}, Category: ${p.category}, Subcategory: ${p.subcategory}, isActive: ${p.isActive}, isVisible: ${p.isVisible}`);
  });

  process.exit(0);
}

run().catch(console.error);
