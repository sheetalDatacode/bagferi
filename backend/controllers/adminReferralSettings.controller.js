import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
    getReferralSettings,
    updateReferralSettings,
} from '../services/referralSettings.service.js';

export const getAdminReferralSettings = asyncHandler(async (req, res) => {
    const data = await getReferralSettings();
    res.status(200).json({
        success: true,
        data,
    });
});

export const updateAdminReferralSettings = asyncHandler(async (req, res) => {
    const data = await updateReferralSettings(req.body || {});
    res.status(200).json({
        success: true,
        data,
    });
});
