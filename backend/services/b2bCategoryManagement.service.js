import B2BCategory from '../models/B2BCategory.model.js';

/**
 * Get all B2B categories
 * @returns {Promise<Array>} Array of categories with subcategories
 */
export const getAllB2BCategories = async () => {
  try {
    const categories = await B2BCategory.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    return categories;
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
 * Create a new B2B category with subcategory
 * @param {Object} categoryData - { name, subcategoryName, fields }
 * @returns {Promise<Object>} Created category
 */
export const createB2BCategory = async ({ name, subcategoryName, fields = [] }) => {

  const cleanFields = (fields || []).map(f => ({
    label: f.label?.trim(),
    type: f.type,
    options: Array.isArray(f.options) ? f.options.filter(o => o?.trim()) : [],
    required: !!f.required
  }));

  let category = await B2BCategory.findOne({ name });

  if (category) {
    category.subcategories.push({
      name: subcategoryName.trim(),
      fields: cleanFields
    });
    await category.save();
    return category;
  }

  return await B2BCategory.create({
    name: name.trim(),
    subcategories: [{
      name: subcategoryName.trim(),
      fields: cleanFields
    }]
  });
};

/**
 * Update B2B category name
 * @param {String} categoryId - Category ID
 * @param {String} newName - New category name
 * @returns {Promise<Object>} Updated category
 */
export const updateB2BCategory = async (categoryId, newName) => {
  try {
    if (!newName || !newName.trim()) {
      throw new Error('Category name cannot be empty');
    }

    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    category.name = newName.trim();
    await category.save();

    return category.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Category with this name already exists');
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

    await B2BCategory.findByIdAndDelete(categoryId);
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Add subcategory to existing B2B category
 * @param {String} categoryId - Category ID
 * @param {String} subcategoryName - Subcategory name
 * @param {Array} fields - Subcategory fields
 * @returns {Promise<Object>} Updated category
 */
export const addB2BSubcategory = async (categoryId, subcategoryName, fields = []) => {
  try {
    if (!subcategoryName || !subcategoryName.trim()) {
      throw new Error('Subcategory name is required');
    }

    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    const trimmedSubcategoryName = subcategoryName.trim();
    const subcategoryExists = category.subcategories.some(
      (sub) => sub.name.toLowerCase() === trimmedSubcategoryName.toLowerCase()
    );

    if (subcategoryExists) {
      throw new Error('Subcategory already exists in this category');
    }

    const cleanFields = (fields || []).map(f => ({
      label: f.label?.trim(),
      type: f.type,
      options: Array.isArray(f.options) ? f.options.filter(o => o?.trim()) : [],
      required: !!f.required
    }));

    category.subcategories.push({
      name: trimmedSubcategoryName,
      fields: cleanFields
    });
    await category.save();

    return category.toObject();
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Delete subcategory from B2B category
 * @param {String} categoryId - Category ID
 * @param {String} subcategoryName - Subcategory name to delete
 * @returns {Promise<Object>} Updated category
 */
export const deleteB2BSubcategory = async (categoryId, subcategoryName) => {
  try {
    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    category.subcategories = category.subcategories.filter(
      (sub) => sub.name.toLowerCase() !== subcategoryName.toLowerCase()
    );

    await category.save();

    return category.toObject();
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};

/**
 * Update subcategory name and fields
 * @param {String} categoryId - Category ID
 * @param {Number} index - Index of subcategory in array
 * @param {Object} updateData - { name, fields }
 * @returns {Promise<Object>} Updated category
 */
export const updateB2BSubcategory = async (categoryId, index, updateData) => {
  try {
    const { name, fields } = updateData;

    if (name && !name.trim()) {
      throw new Error('Subcategory name cannot be empty');
    }

    const category = await B2BCategory.findById(categoryId);
    if (!category) {
      throw new Error('B2B Category not found');
    }

    if (index < 0 || index >= category.subcategories.length) {
      throw new Error('Invalid subcategory index');
    }

    if (name) {
      const trimmedNewName = name.trim();
      // Check if new name already exists (excluding current index)
      const subcategoryExists = category.subcategories.some(
        (sub, idx) => idx !== index && sub.name.toLowerCase() === trimmedNewName.toLowerCase()
      );

      if (subcategoryExists) {
        throw new Error('Subcategory with this name already exists');
      }
      category.subcategories[index].name = trimmedNewName;
    }

    if (fields) {
      const cleanFields = (fields || []).map(f => ({
        label: f.label?.trim(),
        type: f.type,
        options: Array.isArray(f.options) ? f.options.filter(o => o?.trim()) : [],
        required: !!f.required
      }));
      category.subcategories[index].fields = cleanFields;
    }

    await category.save();

    return category.toObject();
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid category ID');
    }
    throw error;
  }
};
