import express from 'express';
import { 
    getGroceryCategories, 
    getGroceryCategory, 
    createGroceryCategory, 
    updateGroceryCategory, 
    deleteGroceryCategory 
} from '../controllers/groceryCategory.controller.js';
import { 
    getGroceryProducts, 
    getGroceryProductById, 
    createGroceryProduct, 
    updateGroceryProduct, 
    deleteGroceryProduct,
    getVendorGroceryProducts,
    getGroceryProductFilters,
    updateGroceryProductStatus,
    getGroceryProductSuggestions
} from '../controllers/groceryProduct.controller.js';
import { upload } from '../utils/upload.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Public Routes
router.get('/categories', getGroceryCategories);
router.get('/categories/:id', getGroceryCategory);
router.get('/products/suggestions', getGroceryProductSuggestions);
router.get('/products', getGroceryProducts);
router.get('/products/filters', getGroceryProductFilters);
router.get('/products/:id', getGroceryProductById);

router.get('/products/test-db', async (req, res) => {
    try {
        const GroceryProduct = (await import('../models/GroceryProduct.model.js')).default;
        const GroceryCategory = (await import('../models/GroceryCategory.model.js')).default;
        const products = await GroceryProduct.find({}).lean();
        const categories = await GroceryCategory.find({}).lean();
        res.json({
            success: true,
            totalProducts: products.length,
            categoriesCount: categories.length,
            categories: categories.map(c => ({ id: c._id, name: c.name, parent: c.parent })),
            products: products.map(p => ({ id: p._id, name: p.name, category: p.category, subcategory: p.subcategory, vendorId: p.vendorId }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin Routes (Categories & Products management)
router.post('/categories', authenticate, authorize('admin'), upload.single('image'), createGroceryCategory);
router.put('/categories/:id', authenticate, authorize('admin'), upload.single('image'), updateGroceryCategory);
router.delete('/categories/:id', authenticate, authorize('admin'), deleteGroceryCategory);

// Admin can also manage products
router.put('/admin/products/:id', authenticate, authorize('admin'), upload.single('image'), updateGroceryProduct);
router.patch('/admin/products/:id/status', authenticate, authorize('admin'), updateGroceryProductStatus);
router.delete('/admin/products/:id', authenticate, authorize('admin'), deleteGroceryProduct);

// Vendor Routes (Product management)
router.get('/vendor/products', authenticate, authorize('vendor'), getVendorGroceryProducts);
router.post('/vendor/products', authenticate, authorize('vendor'), upload.single('image'), createGroceryProduct);
router.put('/vendor/products/:id', authenticate, authorize('vendor'), upload.single('image'), updateGroceryProduct);
router.delete('/vendor/products/:id', authenticate, authorize('vendor'), deleteGroceryProduct);

export default router;
