import express from 'express';
import {
    getAllProperties,
    updatePropertyStatus,
    getPropertyById
} from '../controllers/adminProperty.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllProperties);
router.get('/:id', getPropertyById);
router.patch('/:id/status', updatePropertyStatus);

export default router;
