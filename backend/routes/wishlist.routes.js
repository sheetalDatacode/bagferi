import express from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Wishlist routes are protected and available to both users and vendors (buyers)
router.use(authenticate);
router.use(authorize('user', 'vendor'));

router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);

export default router;
