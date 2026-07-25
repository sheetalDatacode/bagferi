import express from 'express';
import { staffLogin } from '../controllers/staffAuth.controller.js';

const router = express.Router();

router.post('/login', staffLogin);

export default router;
