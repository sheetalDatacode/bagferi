import express from 'express';
import { getAllUsers, getDistinctCities, deleteUser } from '../controllers/adminUser.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes here are for admin panel user management
router.get('/cities', authenticate, authorize('admin'), getDistinctCities);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);
router.get('/', authenticate, authorize('admin'), getAllUsers);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

export default router;

