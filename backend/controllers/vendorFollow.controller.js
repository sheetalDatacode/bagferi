import VendorFollow from '../models/VendorFollow.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Toggle follow status for a vendor
 * POST /api/follow/toggle
 * Body: { vendorId: string }
 */
export const toggleFollow = asyncHandler(async (req, res) => {
  let userId = req.user?.id; // Primary: User's original document ID
  const vendorIdFromAuth = req.user?.vendorId; // If logged in as a vendor
  const { vendorId } = req.body;

  if (!userId && !vendorIdFromAuth) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!vendorId) {
    return res.status(400).json({ success: false, message: 'Vendor ID is required' });
  }

  // 1. Resolve to a correct User ID
  // If the requester is a vendor, we MUST find or create their corresponding 'User' document
  // to maintain data integrity (VendorFollow.userId always points to 'User' collection)
  if (vendorIdFromAuth) {
    const vendorDoc = await Vendor.findById(vendorIdFromAuth).select('email name phone').lean();
    if (vendorDoc) {
      let linkedUser = await User.findOne({ email: vendorDoc.email });
      if (!linkedUser) {
        // Auto-create a User document for the vendor if it doesn't exist
        linkedUser = await User.create({
          name: vendorDoc.name,
          email: vendorDoc.email,
          phone: vendorDoc.phone,
          password: Math.random().toString(36).slice(-10), // Random password as they use vendor login
          role: 'user',
          currentMarketplace: 'b2b'
        });
      }
      userId = linkedUser._id;
    }
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Check if vendor exists
  const targetVendor = await Vendor.findById(vendorId).select('_id email').lean();
  if (!targetVendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  // Prevent self-follow (ID and Email check)
  const isSelf = userId.toString() === vendorId.toString() || 
                 userId.toString() === vendorIdFromAuth?.toString();
  
  if (isSelf) {
    return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
  }

  // Secondary Self-follow check (By email if vendor data available)
  const currentUserDoc = await User.findById(userId).select('email').lean();
  if (currentUserDoc && targetVendor.email && 
      currentUserDoc.email.toLowerCase() === targetVendor.email.toLowerCase()) {
    return res.status(400).json({ success: false, message: 'You cannot follow yourself (email match)' });
  }

  // Check if already following
  const existingFollow = await VendorFollow.findOne({ userId, vendorId });

  if (existingFollow) {
    // Unfollow
    await VendorFollow.findByIdAndDelete(existingFollow._id);
    const count = await VendorFollow.countDocuments({ vendorId });
    return res.status(200).json({
      success: true,
      message: 'Unfollowed successfully',
      data: { isFollowing: false, followerCount: count }
    });
  } else {
    // Follow
    await VendorFollow.create({ userId, vendorId });
    const count = await VendorFollow.countDocuments({ vendorId });
    return res.status(201).json({
      success: true,
      message: 'Followed successfully',
      data: { isFollowing: true, followerCount: count }
    });
  }
});

/**
 * Get total followers count for a vendor
 * GET /api/follow/vendor/:vendorId
 */
export const getVendorFollowers = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const currentUserId = req.user?.id || req.user?.vendorId;

  if (!vendorId) {
    return res.status(400).json({ success: false, message: 'Vendor ID is required' });
  }

  const count = await VendorFollow.countDocuments({ vendorId });
  
  let isFollowing = false;
  if (currentUserId) {
    const follow = await VendorFollow.exists({ userId: currentUserId, vendorId });
    isFollowing = !!follow;
  }

  res.status(200).json({
    success: true,
    data: { followerCount: count, isFollowing }
  });
});

/**
 * Get list of vendors followed by a user
 * GET /api/follow/user/:userId
 */
export const getUserFollowedVendors = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user?.id || req.user?.vendorId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  const follows = await VendorFollow.find({ userId })
    .populate({
      path: 'vendorId',
      select: 'storeName storeLogo storeDescription phone whatsapp businessType'
    })
    .sort({ createdAt: -1 });

  // Map to just vendor details
  const vendors = follows
    .filter(f => f.vendorId) // Remove any null references
    .map(f => f.vendorId);

  res.status(200).json({
    success: true,
    data: { vendors }
  });
});

/**
 * Get list of users following the current logged-in vendor
 * GET /api/follow/vendor-followers
 */
export const getVendorFollowersList = asyncHandler(async (req, res) => {
  const vendorId = req.user?.vendorId || req.user?.id;

  if (!vendorId) {
    return res.status(401).json({ success: false, message: 'Vendor authentication required' });
  }

  // Double check if indeed a vendor
  const vendorDoc = await Vendor.findById(vendorId);
  if (!vendorDoc) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const followers = await VendorFollow.aggregate([
    { 
      $match: { 
        vendorId: { 
          $in: [
            mongoose.Types.ObjectId.isValid(vendorId) ? new mongoose.Types.ObjectId(vendorId) : null,
            vendorId,
            vendorId.toString()
          ].filter(Boolean)
        } 
      } 
    },
    {
      $addFields: {
        convertedUserId: {
          $convert: {
            input: '$userId',
            to: 'objectId',
            onError: '$userId',
            onNull: '$userId'
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        let: { cId: '$convertedUserId', uId: '$userId' },
        pipeline: [
          { $match: { $expr: { $or: [{ $eq: ['$_id', '$$cId'] }, { $eq: ['$_id', '$$uId'] }] } } }
        ],
        as: 'userData'
      }
    },
    {
      $lookup: {
        from: 'vendors',
        let: { cId: '$convertedUserId', uId: '$userId' },
        pipeline: [
          { $match: { $expr: { $or: [{ $eq: ['$_id', '$$cId'] }, { $eq: ['$_id', '$$uId'] }] } } }
        ],
        as: 'vendorData'
      }
    },
    { $sort: { createdAt: -1 } }
  ]);

  const users = (followers || []).map(f => {
    const user = f.userData?.[0];
    if (user) {
      // Filter out self-follows in list (ID and Email match check)
      const isSelf = user._id.toString() === vendorId.toString() || 
                     (vendorDoc?.email && user.email?.toLowerCase() === vendorDoc.email.toLowerCase());
      
      if (isSelf) return null;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role || 'user',
        followedAt: f.createdAt
      };
    }
    
    const v = f.vendorData?.[0];
    if (v) {
      // Filter out self-follows in list (ID and Email match check)
      const isSelf = v._id.toString() === vendorId.toString() || 
                     (vendorDoc?.email && v.email?.toLowerCase() === vendorDoc.email.toLowerCase());
      
      if (isSelf) return null;

      return {
        _id: v._id,
        name: v.storeName || v.name,
        email: v.email,
        phone: v.phone,
        avatar: v.storeLogo,
        role: 'vendor',
        followedAt: f.createdAt
      };
    }
    return null;
  }).filter(Boolean);

  res.status(200).json({
    success: true,
    data: { 
      followers: users,
      total: users.length
    }
  });
});

