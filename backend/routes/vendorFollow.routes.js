import express from 'express';
import { toggleFollow, getVendorFollowers, getUserFollowedVendors, getVendorFollowersList } from '../controllers/vendorFollow.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Toggle follow/unfollow
router.post('/toggle', authenticate, toggleFollow);

// Get vendor followers list (private)
router.get('/vendor-followers', authenticate, getVendorFollowersList);

// Get vendor followers count and status (public/mixed)
router.get('/vendor/:vendorId', (req, res, next) => {

  // Try to authenticate but don't fail if not logged in
  authenticate(req, res, (err) => {
    // Ignore authentication errors (e.g., token expired/missing) for this public route
    getVendorFollowers(req, res, next);
  });
});

// Get followed vendors for a user
router.get('/user/:userId', authenticate, getUserFollowedVendors);

export default router;
