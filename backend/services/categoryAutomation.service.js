import B2BCategory from '../models/B2BCategory.model.js';

/**
 * Ensures a category exists, and optionally a subcategory and subSubcategory, and field options.
 * @param {Object} data - { category, subcategory, subSubcategory, fieldUpdates }
 * @param {Array} data.fieldUpdates - Array of { label, value } to ensure value is in options if field is select/multi-select
 * @returns {Promise<Object>} { categoryId, subcategoryId, subSubcategoryId }
 */
export const ensureCategoryStructure = async ({ category, subcategory, subSubcategory, fieldUpdates = [] }) => {
  try {
    if (!category) return { categoryId: null, subcategoryId: null, subSubcategoryId: null };

    // Find or create level 1
    let catDoc = await B2BCategory.findOne({ 
        name: { $regex: new RegExp(`^${category}$`, 'i') }, 
        parent: null 
    });

    if (!catDoc) {
      catDoc = await B2BCategory.create({
        name: category.trim(),
        level: 1,
        parent: null
      });
    }

    let subDoc = null;
    let subSubDoc = null;

    if (subcategory) {
        // Find or create level 2
        subDoc = await B2BCategory.findOne({
            name: { $regex: new RegExp(`^${subcategory}$`, 'i') },
            parent: catDoc._id
        });

        if (!subDoc) {
            subDoc = await B2BCategory.create({
                name: subcategory.trim(),
                level: 2,
                parent: catDoc._id
            });
        }
    }

    if (subDoc && subSubcategory) {
        // Find or create level 3
        subSubDoc = await B2BCategory.findOne({
            name: { $regex: new RegExp(`^${subSubcategory}$`, 'i') },
            parent: subDoc._id
        });

        if (!subSubDoc) {
            subSubDoc = await B2BCategory.create({
                name: subSubcategory.trim(),
                level: 3,
                parent: subDoc._id
            });
        }
    }

    // Apply field updates to the deepest level provided
    const targetDoc = subSubDoc || subDoc || catDoc;

    if (fieldUpdates && fieldUpdates.length > 0 && targetDoc) {
        let modified = false;
        
        // Ensure targetDoc.fields is initialized
        if (!targetDoc.fields) targetDoc.fields = [];

        for (const update of fieldUpdates) {
          const { label, value } = update;
          if (!label || !value) continue;

          let field = targetDoc.fields.find(f => f.label.toLowerCase() === label.toLowerCase());
          
          if (!field) {
            // Auto-create field if it doesn't exist
            field = { label: label.trim(), type: 'select', options: [] };
            targetDoc.fields.push(field);
            modified = true;
          }

          if (field.type === 'select' || field.type === 'multi-select') {
            const values = Array.isArray(value) ? value : [value];
            for (const val of values) {
              const valStr = String(val).trim();
              if (valStr && !field.options.some(opt => opt.toLowerCase() === valStr.toLowerCase())) {
                field.options.push(valStr);
                modified = true;
              }
            }
          }
        }

        if (modified) {
          targetDoc.markModified('fields');
          await targetDoc.save();
        }
    }

    return {
        categoryId: catDoc ? catDoc._id : null,
        subcategoryId: subDoc ? subDoc._id : null,
        subSubcategoryId: subSubDoc ? subSubDoc._id : null
    };
  } catch (error) {
    console.error('Error in ensureCategoryStructure:', error);
    return { categoryId: null, subcategoryId: null, subSubcategoryId: null };
  }
};
