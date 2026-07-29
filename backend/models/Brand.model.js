import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['fashion', 'grocery'], required: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, required: true }],
  subcategories: [{ type: mongoose.Schema.Types.ObjectId }],
  logo: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

brandSchema.index({ type: 1, categories: 1, subcategories: 1 });

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
