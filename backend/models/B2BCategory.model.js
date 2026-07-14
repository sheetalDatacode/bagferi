import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'select', 'multi-select'], required: true },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: false }
}, { _id: false });

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: { type: [fieldSchema], default: [] }
}, { _id: false });

const b2bCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  subcategories: { type: [subcategorySchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('B2BCategory', b2bCategorySchema);
