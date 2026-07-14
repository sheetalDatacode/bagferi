import B2BCategory from '../models/B2BCategory.model.js';

/**
 * Ensures a category exists, and optionally a subcategory and field options.
 * @param {Object} data - { category, subcategory, fieldUpdates }
 * @param {Array} data.fieldUpdates - Array of { label, value } to ensure value is in options if field is select/multi-select
 */
export const ensureCategoryStructure = async ({ category, subcategory, fieldUpdates = [] }) => {
  try {
    if (!category) return;

    let catDoc = await B2BCategory.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });

    if (!catDoc) {
      // Create new category
      catDoc = await B2BCategory.create({
        name: category.trim(),
        subcategories: subcategory ? [{ name: subcategory.trim(), fields: [] }] : []
      });
    } else if (subcategory) {
      // Check if subcategory exists
      const subIndex = catDoc.subcategories.findIndex(
        s => s.name.toLowerCase() === subcategory.toLowerCase()
      );

      if (subIndex === -1) {
        catDoc.subcategories.push({ name: subcategory.trim(), fields: [] });
        await catDoc.save();
      } else if (fieldUpdates && fieldUpdates.length > 0) {
        // Check field options
        let modified = false;
        const sub = catDoc.subcategories[subIndex];

        for (const update of fieldUpdates) {
          const { label, value } = update;
          if (!label || !value) continue;

          const field = sub.fields.find(f => f.label.toLowerCase() === label.toLowerCase());
          if (field && (field.type === 'select' || field.type === 'multi-select')) {
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
          catDoc.markModified('subcategories');
          await catDoc.save();
        }
      }
    }

    return catDoc;
  } catch (error) {
    console.error('Error in ensureCategoryStructure:', error);
    // Don't throw, we don't want to block product creation if category auto-add fails
  }
};
