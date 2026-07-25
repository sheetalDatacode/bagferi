import express from 'express';
import AdminB2BSettingsController from '../controllers/adminB2BSettings.controller.js';

const router = express.Router();

// Publicly accessible settings
router.get('/', AdminB2BSettingsController.getSettings);

export default router;
