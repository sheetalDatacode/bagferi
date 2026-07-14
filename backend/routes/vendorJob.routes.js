import express from 'express';
import {
    createJob,
    getMyJobs,
    updateJob,
    deleteJob
} from '../controllers/vendorJob.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectVendor);

router.get('/', getMyJobs);
router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
