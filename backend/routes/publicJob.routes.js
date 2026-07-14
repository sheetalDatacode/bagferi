import express from 'express';
import {
    getPublicJobs,
    getJobCategories
} from '../controllers/publicJob.controller.js';

const router = express.Router();

router.get('/', getPublicJobs);
router.get('/categories', getJobCategories);

export default router;
