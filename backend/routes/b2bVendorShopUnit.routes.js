import express from 'express';
import { getMyUnit, createOrUpdateUnit } from '../controllers/shopUnit.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';
import { requireActiveSubscription } from '../middleware/subscriptionRestriction.middleware.js';

const router = express.Router();

router.use(protectVendor);

router.get('/', getMyUnit);
router.post('/', createOrUpdateUnit);

export default router;
