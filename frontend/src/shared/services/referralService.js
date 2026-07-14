import api from '../utils/api';

export const getMyReferralSummary = async () => {
    const response = await api.get('/referrals/me');
    return response?.data || response;
};

export const validateReferralCode = async (code) => {
    const response = await api.get(`/referrals/validate/${encodeURIComponent(code)}`);
    return response?.data || response;
};

export const transferPointsToVendor = async (vendorId, points) => {
    const response = await api.post('/referrals/transfer-to-vendor', { vendorId, points });
    return response?.data || response;
};
