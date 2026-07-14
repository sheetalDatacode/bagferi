import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const ProductSchema = new mongoose.Schema({
  formType: String,
  isActive: Boolean,
  isVisible: Boolean
}, { collection: 'products' });

const Product = mongoose.model('Product', ProductSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const stats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$formType', count: { $sum: 1 } } }
    ]);

    console.log('Product Stats (Active):');
    console.log(JSON.stringify(stats, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

run();
