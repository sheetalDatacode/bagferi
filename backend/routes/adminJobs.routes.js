import express from 'express';
import {
    getAllJobs,
    toggleJobVisibility,
    getJobStats
} from '../controllers/adminJob.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectAdmin);

router.get('/', getAllJobs);
router.get('/stats', getJobStats);
router.patch('/:id/toggle', toggleJobVisibility);

export default router;
