import Brand from '../models/Brand.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';

export const createBrand = async (req, res) => {
  try {
    const { name, type, category, subcategory, categories, subcategories } = req.body;
    let logo = '';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'brands');
      logo = result.secure_url;
    }

    let parsedCategories = [];
    if (categories) {
      parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    } else if (category) {
      parsedCategories = [category];
    }

    let parsedSubcategories = [];
    if (subcategories) {
      parsedSubcategories = typeof subcategories === 'string' ? JSON.parse(subcategories) : subcategories;
    } else if (subcategory) {
      parsedSubcategories = [subcategory];
    }

    const brand = new Brand({
      name,
      type,
      categories: parsedCategories,
      subcategories: parsedSubcategories,
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
    if (category) filter.categories = category;
    if (subcategory) filter.subcategories = subcategory;

    const brands = await Brand.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, category, subcategory, categories, subcategories, isActive } = req.body;
    let updateData = { name, type, isActive };

    if (categories) {
      updateData.categories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    } else if (category) {
      updateData.categories = [category];
    }

    if (subcategories) {
      updateData.subcategories = typeof subcategories === 'string' ? JSON.parse(subcategories) : subcategories;
    } else if (subcategory) {
      updateData.subcategories = [subcategory];
    }

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
