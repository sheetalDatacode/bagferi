import express from 'express';
import AdminB2BSettingsController from '../controllers/adminB2BSettings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', AdminB2BSettingsController.getSettings);
router.post('/', AdminB2BSettingsController.updateSettings);

export default router;
