import express from 'express';
import {
    getAllJobCategories,
    createJobCategory,
    updateJobCategory,
    deleteJobCategory
} from '../controllers/adminJobCategory.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectAdmin);

router.get('/', getAllJobCategories);
router.post('/', createJobCategory);
router.put('/:id', updateJobCategory);
router.delete('/:id', deleteJobCategory);

export default router;
