import Brand from '../models/Brand.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';

export const createBrand = async (req, res) => {
  try {
    const { name, type, category, subcategory } = req.body;
    let logo = '';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'brands');
      logo = result.secure_url;
    }

    const brand = new Brand({
      name,
      type,
      category,
      subcategory: subcategory || undefined,
      logo
    });

    await brand.save();

    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBrands = async (req, res) => {
  try {
    const { type, category, subcategory } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const brands = await Brand.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, category, subcategory, isActive } = req.body;
    let updateData = { name, type, category, subcategory, isActive };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'brands');
      updateData.logo = result.secure_url;
    }

    const brand = await Brand.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    res.status(200).json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
