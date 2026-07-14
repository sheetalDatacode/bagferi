import {
  getAllB2BCategories,
  getB2BCategoryById,
  createB2BCategory,
  updateB2BCategory,
  deleteB2BCategory,
  addB2BSubcategory,
  deleteB2BSubcategory,
  updateB2BSubcategory,
} from '../services/b2bCategoryManagement.service.js';
import redisService from '../services/redis.service.js';

/**
 * Helper to clear B2B category-related cache
 */
const clearB2BCategoryCache = async () => {
  try {
    await redisService.clearPattern('public:b2b-categories:*');
  } catch (error) {
    console.error('Error clearing B2B category cache:', error);
  }
};

/**
 * Get all B2B categories
 * GET /api/admin/b2b-categories
 */
export const getB2BCategories = async (req, res, next) => {
  try {
    const categories = await getAllB2BCategories();

    res.status(200).json({
      success: true,
      message: 'B2B categories retrieved successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get B2B category by ID
 * GET /api/admin/b2b-categories/:id
 */
export const getB2BCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await getB2BCategoryById(id);

    res.status(200).json({
      success: true,
      message: 'B2B category retrieved successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new B2B category
 * POST /api/admin/b2b-categories
 */
export const create = async (req, res, next) => {
  try {
    const { name, subcategoryName, fields } = req.body;

    const category = await createB2BCategory({
      name,
      subcategoryName,
      fields
    });

    // Clear cache
    await clearB2BCategoryCache();

    res.status(201).json({
      success: true,
      message: 'B2B category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update B2B category name
 * PUT /api/admin/b2b-categories/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const category = await updateB2BCategory(id, name);

    // Clear cache
    await clearB2BCategoryCache();

    res.status(200).json({
      success: true,
      message: 'B2B category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete B2B category
 * DELETE /api/admin/b2b-categories/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteB2BCategory(id);

    // Clear cache
    await clearB2BCategoryCache();

    res.status(200).json({
      success: true,
      message: 'B2B category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add subcategory to B2B category
 * POST /api/admin/b2b-categories/:id/subcategories
 */
export const addSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subcategoryName, fields } = req.body;

    if (!subcategoryName || !subcategoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name is required',
      });
    }

    const category = await addB2BSubcategory(id, subcategoryName, fields);

    // Clear cache
    await clearB2BCategoryCache();

    res.status(200).json({
      success: true,
      message: 'Subcategory added successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete subcategory from B2B category
 * DELETE /api/admin/b2b-categories/:id/subcategories
 */
export const removeSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subcategoryName } = req.body;

    if (!subcategoryName || !subcategoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name is required',
      });
    }

    const category = await deleteB2BSubcategory(id, subcategoryName);

    // Clear cache
    await clearB2BCategoryCache();

    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subcategory name
 * PUT /api/admin/b2b-categories/:id/subcategories
 */
export const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { index, newName, fields } = req.body;

    if (index === undefined || index === null) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory index is required',
      });
    }

    const category = await updateB2BSubcategory(id, parseInt(index), {
      name: newName,
      fields
    });

    // Clear cache
    await clearB2BCategoryCache();

    res.status(200).json({
      success: true,
      message: 'Subcategory updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
