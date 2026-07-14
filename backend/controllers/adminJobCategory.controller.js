import JobCategory from '../models/JobCategory.model.js';

// Get all job categories
export const getAllJobCategories = async (req, res) => {
    try {
        const categories = await JobCategory.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching job categories:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Create new category
export const createJobCategory = async (req, res) => {
    try {
        const { name, subcategories, isActive, order } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const existing = await JobCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }

        const category = await JobCategory.create({
            name,
            subcategories: subcategories || [],
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0
        });

        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (error) {
        console.error('Error creating job category:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update category
export const updateJobCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subcategories, isActive, order } = req.body;

        const category = await JobCategory.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        if (name && name.toLowerCase() !== category.name.toLowerCase()) {
            const existing = await JobCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Category name already exists' });
            }
        }

        if (name) category.name = name;
        if (subcategories) category.subcategories = subcategories;
        if (isActive !== undefined) category.isActive = isActive;
        if (order !== undefined) category.order = order;

        await category.save();

        res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
    } catch (error) {
        console.error('Error updating job category:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete category
export const deleteJobCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await JobCategory.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        await category.deleteOne();

        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting job category:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
