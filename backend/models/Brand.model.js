import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['fashion', 'grocery'], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId },
  logo: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

brandSchema.index({ type: 1, category: 1, subcategory: 1 });

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
