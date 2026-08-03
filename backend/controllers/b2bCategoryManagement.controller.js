import {
  getAllB2BCategories,
  getB2BCategoryById,
  createB2BCategory,
  updateB2BCategory,
  deleteB2BCategory
} from '../services/b2bCategoryManagement.service.js';
import redisService from '../services/redis.service.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';

/**
 * Helper to clear B2B category-related cache
 */
const clearB2BCategoryCache = async () => {
  try {
    await redisService.clearPattern('bagferi:public:b2b-categories:*');
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
    const { name, parent, level, fields } = req.body;
    let image = null;
    let imagePublicId = null;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Handle image upload if a file is present
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'b2b_categories');
        image = result.secure_url;
        imagePublicId = result.public_id;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Image upload failed',
        });
      }
    }

    let parsedFields = [];
    if (fields) {
      try {
        parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      } catch(e) {
        // ignore
      }
    }

    const category = await createB2BCategory({
      name,
      parent: parent || null,
      level: level ? parseInt(level) : 1,
      image,
      imagePublicId,
      fields: parsedFields
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
 * Update B2B category
 * PUT /api/admin/b2b-categories/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parent, level, fields } = req.body;
    
    let updateData = {};
    if (name) updateData.name = name;
    if (parent !== undefined) updateData.parent = parent || null;
    if (level) updateData.level = parseInt(level);
    
    if (fields) {
      try {
        updateData.fields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      } catch(e) {
        // ignore
      }
    }

    // Handle image upload if a file is present
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'b2b_categories');
        updateData.image = result.secure_url;
        updateData.imagePublicId = result.public_id;
        
        // delete old image
        const oldCat = await getB2BCategoryById(id);
        if (oldCat && oldCat.imagePublicId) {
          cloudinary.uploader.destroy(oldCat.imagePublicId).catch(err => console.error(err));
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Image upload failed',
        });
      }
    }

    const category = await updateB2BCategory(id, updateData);

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
