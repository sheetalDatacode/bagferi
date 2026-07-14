import ReferralSettings from '../models/ReferralSettings.model.js';

const ENV_DEFAULTS = {
    vendorReferrerRewardPoints: Number(process.env.REFERRER_REWARD_POINTS || 50),
    userReferrerRewardPoints: Number(process.env.REFERRER_REWARD_POINTS || 50),
    newUserRewardPoints: Number(process.env.NEW_USER_REWARD_POINTS || 25),
    referralMilestoneMin: Number(process.env.REFERRAL_MILESTONE_MIN || 10),
};

const sanitizeNumber = (value, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
};

const toResponse = (doc) => ({
    vendorReferrerRewardPoints: sanitizeNumber(doc?.vendorReferrerRewardPoints, ENV_DEFAULTS.vendorReferrerRewardPoints),
    userReferrerRewardPoints: sanitizeNumber(doc?.userReferrerRewardPoints, ENV_DEFAULTS.userReferrerRewardPoints),
    newUserRewardPoints: sanitizeNumber(doc?.newUserRewardPoints, ENV_DEFAULTS.newUserRewardPoints),
    referralMilestoneMin: sanitizeNumber(doc?.referralMilestoneMin, ENV_DEFAULTS.referralMilestoneMin),
});

export const getOrCreateReferralSettings = async () => {
    let settings = await ReferralSettings.findOne({ key: 'global' });
    if (!settings) {
        settings = await ReferralSettings.create({
            key: 'global',
            ...ENV_DEFAULTS,
        });
    }
    return settings;
};

export const getReferralSettings = async () => {
    const settings = await getOrCreateReferralSettings();
    return toResponse(settings);
};

export const updateReferralSettings = async (payload = {}) => {
    const settings = await getOrCreateReferralSettings();

    settings.vendorReferrerRewardPoints = sanitizeNumber(
        payload.vendorReferrerRewardPoints,
        settings.vendorReferrerRewardPoints
    );
    settings.userReferrerRewardPoints = sanitizeNumber(
        payload.userReferrerRewardPoints,
        settings.userReferrerRewardPoints
    );
    settings.newUserRewardPoints = sanitizeNumber(
        payload.newUserRewardPoints,
        settings.newUserRewardPoints
    );
    settings.referralMilestoneMin = sanitizeNumber(
        payload.referralMilestoneMin,
        settings.referralMilestoneMin
    );

    await settings.save();
    return toResponse(settings);
};
