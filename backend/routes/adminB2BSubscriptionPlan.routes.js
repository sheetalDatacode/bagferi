import express from 'express';
import AdminB2BSubscriptionPlanController from '../controllers/b2bSubscriptionPlan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All admin routes are protected and authorized for admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all plans (with optional includeInactive query param)
router.get('/', AdminB2BSubscriptionPlanController.getPlans);

// Get active plans only
router.get('/active', AdminB2BSubscriptionPlanController.getActivePlans);

// Initialize default plans (3, 6, 12 months)
router.post('/initialize', AdminB2BSubscriptionPlanController.initializeDefaultPlans);

// Get plan by ID
router.get('/:id', AdminB2BSubscriptionPlanController.getPlanById);

// Create new plan
router.post('/', AdminB2BSubscriptionPlanController.createPlan);

// Update plan
router.put('/:id', AdminB2BSubscriptionPlanController.updatePlan);

// Delete plan (soft delete)
router.delete('/:id', AdminB2BSubscriptionPlanController.deletePlan);

export default router;
