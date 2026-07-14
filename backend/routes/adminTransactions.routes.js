import express from 'express';
import { getAllTransactions } from '../controllers/adminTransactions.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllTransactions);

export default router;
