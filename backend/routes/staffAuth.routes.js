import express from 'express';
import { sendStaffOTP, verifyStaffOTP } from '../controllers/staffAuth.controller.js';

const router = express.Router();

router.post('/send-otp', sendStaffOTP);
router.post('/verify-otp', verifyStaffOTP);

export default router;
