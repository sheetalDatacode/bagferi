import express from 'express';
import AdminB2BAddonPlanController from '../controllers/adminB2BAddonPlan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Admin-only protection
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', AdminB2BAddonPlanController.getPlans);
router.get('/:id', AdminB2BAddonPlanController.getPlanById);
router.post('/', AdminB2BAddonPlanController.createPlan);
router.put('/:id', AdminB2BAddonPlanController.updatePlan);
router.delete('/:id', AdminB2BAddonPlanController.deletePlan);

export default router;
