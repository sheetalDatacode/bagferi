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
    getVendorGroceryProducts
} from '../controllers/groceryProduct.controller.js';
import { upload } from '../utils/upload.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Public Routes
router.get('/categories', getGroceryCategories);
router.get('/categories/:id', getGroceryCategory);
router.get('/products', getGroceryProducts);
router.get('/products/:id', getGroceryProductById);

// Admin Routes (Categories & Products management)
router.post('/categories', authenticate, authorize('admin'), upload.single('image'), createGroceryCategory);
router.put('/categories/:id', authenticate, authorize('admin'), upload.single('image'), updateGroceryCategory);
router.delete('/categories/:id', authenticate, authorize('admin'), deleteGroceryCategory);

// Admin can also manage products
router.put('/admin/products/:id', authenticate, authorize('admin'), upload.single('image'), updateGroceryProduct);
router.delete('/admin/products/:id', authenticate, authorize('admin'), deleteGroceryProduct);

// Vendor Routes (Product management)
router.get('/vendor/products', authenticate, authorize('vendor'), getVendorGroceryProducts);
router.post('/vendor/products', authenticate, authorize('vendor'), upload.single('image'), createGroceryProduct);
router.put('/vendor/products/:id', authenticate, authorize('vendor'), upload.single('image'), updateGroceryProduct);
router.delete('/vendor/products/:id', authenticate, authorize('vendor'), deleteGroceryProduct);

export default router;
