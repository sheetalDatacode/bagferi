import express from 'express';
import { getProducts, getProduct, getB2BSuggestions } from '../controllers/publicProduct.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/products/b2b-suggestions
 * @desc    Get B2B search suggestions
 * @access  Public
 */
router.get('/b2b-suggestions', asyncHandler(getB2BSuggestions));

/**
 * @route   GET /api/products
 * @desc    Get all public products with filters
 * @access  Public
 */
router.get('/', asyncHandler(getProducts));

/**
 * @route   GET /api/products/:id
 * @desc    Get public product by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(getProduct));

export default router;
