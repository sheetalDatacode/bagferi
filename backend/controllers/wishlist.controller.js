import Wishlist from '../models/Wishlist.model.js';
import mongoose from 'mongoose';

/**
 * @desc    Get user's wishlist
 * @route   GET /api/wishlist
 * @access  Private (User/Vendor)
 */
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Find all wishlist items for this user and populate the product details
    const wishlistItems = await Wishlist.find({ userId })
      .populate({
        path: 'productId',
        populate: [
          { path: 'vendorId', select: 'storeName enquiryStatus address phone' }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter out items where the product might have been deleted
    const validItems = wishlistItems.filter(item => item.productId !== null);

    res.status(200).json({
      success: true,
      count: validItems.length,
      data: validItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle product in wishlist (Add/Remove)
 * @route   POST /api/wishlist/toggle
 * @access  Private (User/Vendor)
 */
export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid Product ID' });
    }

    // Check if it's already in the wishlist
    const existingItem = await Wishlist.findOne({ userId, productId });

    if (existingItem) {
      // Remove it
      await Wishlist.deleteOne({ _id: existingItem._id });
      return res.status(200).json({
        success: true,
        message: 'Product removed from wishlist',
        isAdded: false,
      });
    } else {
      // Add it
      const newItem = await Wishlist.create({ userId, productId });
      return res.status(201).json({
        success: true,
        message: 'Product added to wishlist',
        isAdded: true,
        data: newItem,
      });
    }
  } catch (error) {
    next(error);
  }
};
