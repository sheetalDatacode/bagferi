import express from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, updateCartBulk } from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Require login for all cart routes

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.put('/update-bulk', updateCartBulk);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
