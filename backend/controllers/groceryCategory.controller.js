import GroceryCategory from '../models/GroceryCategory.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import redisService from '../services/redis.service.js';

const clearCache = async () => {
  try {
    await redisService.clearPattern('public:grocery-categories:*');
  } catch (error) {
    console.error('Error clearing grocery category cache:', error);
  }
};

export const getGroceryCategories = async (req, res, next) => {
  try {
    // Fetch all categories and build tree

    // Fetch all categories and build tree
    const allCategories = await GroceryCategory.find({ isActive: true }).lean();
    const tree = allCategories.filter(c => c.level === 1).map(c1 => {
        return {
            ...c1,
            subcategories: allCategories.filter(c2 => c2.parent && c2.parent.toString() === c1._id.toString())
        }
    });

    res.status(200).json({
      success: true,
      message: 'Grocery categories retrieved successfully',
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroceryCategory = async (req, res, next) => {
  try {
    const category = await GroceryCategory.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const createGroceryCategory = async (req, res, next) => {
  try {
    const { name, parent, level, fields } = req.body;
    let image = null, imagePublicId = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'grocery_categories');
      image = result.secure_url;
      imagePublicId = result.public_id;
    }

    const category = await GroceryCategory.create({
      name, parent: parent || null, level: level || 1, image, imagePublicId,
      fields: fields ? (typeof fields === 'string' ? JSON.parse(fields) : fields) : []
    });
    await clearCache();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateGroceryCategory = async (req, res, next) => {
  try {
    const { name, parent, level, fields, isActive } = req.body;
    let updateData = {};
    if (name) updateData.name = name;
    if (parent !== undefined) updateData.parent = parent || null;
    if (level) updateData.level = level;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (fields) updateData.fields = typeof fields === 'string' ? JSON.parse(fields) : fields;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'grocery_categories');
      updateData.image = result.secure_url;
      updateData.imagePublicId = result.public_id;
      
      const oldCat = await GroceryCategory.findById(req.params.id);
      if (oldCat?.imagePublicId) {
        await deleteFromCloudinary(oldCat.imagePublicId);
      }
    }

    const category = await GroceryCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    await clearCache();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteGroceryCategory = async (req, res, next) => {
  try {
    const cat = await GroceryCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Check if it has children
    const children = await GroceryCategory.countDocuments({ parent: cat._id });
    if (children > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete category with subcategories' });
    }

    if (cat.imagePublicId) await deleteFromCloudinary(cat.imagePublicId);
    await GroceryCategory.findByIdAndDelete(req.params.id);
    await clearCache();
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};
