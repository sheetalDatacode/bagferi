import B2BCategory from '../models/B2BCategory.model.js';
/**
 * Get all B2B categories as a flat list or tree
 * @returns {Promise<Array>} Array of categories
 */
export const getAllB2BCategories = async () => {
  try {
    const categories = await B2BCategory.find({ isActive: true })
      .sort({ level: 1, createdAt: -1 })
      .lean();

    // Build tree
    const categoryMap = {};
    const rootCategories = [];

    // Initialize map
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = { ...cat, subcategories: [] };
    });

    // Populate subcategories
    categories.forEach(cat => {
      if (cat.parent) {
        const parentId = cat.parent.toString();
        if (categoryMap[parentId]) {
          categoryMap[parentId].subcategories.push(categoryMap[cat._id.toString()]);
        } else {
          // Parent not found (maybe inactive), treat as root or ignore
          rootCategories.push(categoryMap[cat._id.toString()]);
        }
      } else {
        rootCategories.push(categoryMap[cat._id.toString()]);
      }
    });

    return rootCategories;
  } catch (error) {
    throw error;
  }
};

/**
 * Get B2B category by ID
 * @param {String} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
export const getB2BCategoryById = async (categoryId) => {
  try {
    const category = await B2BCategory.findById(categoryId).lean();
    if (!category) {
      throw new Error('B2B Category not found');
    }
    return category;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Create a new B2B category
 * @param {Object} categoryData
 * @returns {Promise<Object>} Created category
 */
export const createB2BCategory = async ({ name, image, imagePublicId, parent, level, fields = [] }) => {
  const cleanFields = (fields || []).map(f => ({
    label: f.label?.trim(),
    type: f.type,
    options: Array.isArray(f.options) ? f.options.filter(o => o?.trim()) : [],
    required: !!f.required
  }));

  const newCategory = new B2BCategory({
    name: name.trim(),
    image: image || null,
    imagePublicId: imagePublicId || null,
    parent: parent || null,
    level: level || 1,
    fields: cleanFields
  });

  return await newCategory.save();
};

/**
 * Update B2B category
 * @param {String} categoryId - Category ID
 * @param {Object} updateData
 * @returns {Promise<Object>} Updated category
 */
export const updateB2BCategory = async (categoryId, updateData) => {
  try {
    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    if (updateData.name) category.name = updateData.name.trim();
    if (updateData.image !== undefined) category.image = updateData.image;
    if (updateData.imagePublicId !== undefined) category.imagePublicId = updateData.imagePublicId;
    if (updateData.parent !== undefined) category.parent = updateData.parent;
    if (updateData.level !== undefined) category.level = updateData.level;
    
    if (updateData.fields) {
      category.fields = updateData.fields.map(f => ({
        label: f.label?.trim(),
        type: f.type,
        options: Array.isArray(f.options) ? f.options.filter(o => o?.trim()) : [],
        required: !!f.required
      }));
    }

    await category.save();
    return category.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Category with this name already exists under the same parent');
    }
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Delete B2B category
 * @param {String} categoryId - Category ID
 * @returns {Promise<void>}
 */
export const deleteB2BCategory = async (categoryId) => {
  try {
    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    // Check if it has children
    const children = await B2BCategory.countDocuments({ parent: categoryId });
    if (children > 0) {
      throw new Error('Cannot delete category because it has subcategories. Delete them first.');
    }

    // Delete image from cloudinary if exists
    if (category.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(category.imagePublicId);
      } catch (err) {
        console.error('Error deleting category image from cloudinary:', err);
      }
    }

    await B2BCategory.findByIdAndDelete(categoryId);
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};
