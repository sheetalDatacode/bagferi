import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'select', 'multi-select'], required: true },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: false }
}, { _id: false });

const groceryCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, default: null },
  imagePublicId: { type: String, default: null },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'GroceryCategory', default: null },
  level: { type: Number, required: true, enum: [1, 2, 3], default: 1 },
  fields: { type: [fieldSchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure name is unique within the same parent
groceryCategorySchema.index({ name: 1, parent: 1 }, { unique: true });

export default mongoose.model('GroceryCategory', groceryCategorySchema);
