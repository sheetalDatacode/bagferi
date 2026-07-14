import express from 'express';
import {
    getAllLotSlots,
    updateLotSlotStatus,
    getLotSlotById
} from '../controllers/adminLotSlot.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllLotSlots);
router.get('/:id', getLotSlotById);
router.patch('/:id/status', updateLotSlotStatus);

export default router;
