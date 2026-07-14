import crypto from 'crypto';
import mongoose from 'mongoose';
import ReferralCode from '../models/ReferralCode.model.js';
import ReferralHistory from '../models/ReferralHistory.model.js';
import Wallet from '../models/Wallet.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import vendorWalletService from './vendorWallet.service.js';
import { getReferralSettings } from './referralSettings.service.js';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'https://yourdomain.com';

const normalizeReferralCode = (code = '') => String(code || '').trim().toUpperCase();

const createRandomCode = (prefix) => {
    const random = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${prefix}${random}`;
};

const generateUniqueCode = async (ownerModel) => {
    const prefix = ownerModel === 'Vendor' ? 'VEN' : 'USR';

    for (let i = 0; i < 10; i += 1) {
        const candidate = createRandomCode(prefix);
        const exists = await ReferralCode.exists({ referralCode: candidate });
        if (!exists) return candidate;
    }

    throw new Error('Unable to generate unique referral code');
};

const getOwnerMetaFromAuth = (authUser) => {
    if (authUser?.role === 'vendor') {
        return { userId: authUser.vendorId || authUser.id, userModel: 'Vendor' };
    }
    return { userId: authUser?.id, userModel: 'User' };
};

export const ensureReferralCodeForOwner = async ({ userId, userModel }) => {
    if (!userId || !userModel) {
        throw new Error('Invalid referral owner');
    }

    const existing = await ReferralCode.findOne({ userId, userModel });
    if (existing) return existing;

    const referralCode = await generateUniqueCode(userModel);
    return ReferralCode.create({ userId, userModel, referralCode, referralCount: 0 });
};

const getOrCreateUserWallet = async (userId) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, pointsBalance: 0, pointsHistory: [] });
    }
    return wallet;
};

const creditUserPoints = async ({ userId, points, description, sourceType, sourceId, session = null }) => {
    const wallet = await getOrCreateUserWallet(userId);
    wallet.pointsBalance += points;
    wallet.pointsHistory.push({
        type: 'credit',
        points,
        balanceAfter: wallet.pointsBalance,
        description,
        sourceType,
        sourceId,
        createdAt: new Date(),
    });
    await wallet.save(session ? { session } : {});
    return wallet;
};

const debitUserPoints = async ({ userId, points, description, sourceType, sourceId, session = null }) => {
    const wallet = await getOrCreateUserWallet(userId);
    if (wallet.pointsBalance < points) {
        throw new Error('Insufficient reward points');
    }
    wallet.pointsBalance -= points;
    wallet.pointsHistory.push({
        type: 'debit',
        points,
        balanceAfter: wallet.pointsBalance,
        description,
        sourceType,
        sourceId,
        createdAt: new Date(),
    });
    await wallet.save(session ? { session } : {});
    return wallet;
};

export const validateReferralCode = async (referralCode) => {
    const code = normalizeReferralCode(referralCode);
    if (!code) return null;
    return ReferralCode.findOne({ referralCode: code }).lean();
};

export const processSuccessfulUserReferral = async ({ referredUserId, referralCode, referredModel = 'User' }) => {
    const settings = await getReferralSettings();
    const normalizedCode = normalizeReferralCode(referralCode);
    if (!normalizedCode) return null;

    const referredUserObjectId = new mongoose.Types.ObjectId(referredUserId);
    const referrerCode = await ReferralCode.findOne({ referralCode: normalizedCode });
    if (!referrerCode) {
        throw new Error('Invalid referral code');
    }

    if (referrerCode.userModel === referredModel && String(referrerCode.userId) === String(referredUserObjectId)) {
        throw new Error('Self referral is not allowed');
    }

    const existingHistory = await ReferralHistory.findOne({ referredUserId: referredUserObjectId });
    if (existingHistory) {
        throw new Error('Referral for this user/vendor is already recorded');
    }

    const history = await ReferralHistory.create({
        referrerId: referrerCode.userId,
        referrerModel: referrerCode.userModel,
        referredUserId: referredUserObjectId,
        referredModel,
        referralCode: normalizedCode,
        date: new Date(),
        status: 'completed',
    });

    referrerCode.referralCount += 1;
    await referrerCode.save();

    if (referrerCode.userModel === 'User') {
        await creditUserPoints({
            userId: referrerCode.userId,
            points: settings.userReferrerRewardPoints,
            description: 'Referral reward points',
            sourceType: 'referral_reward',
            sourceId: history._id.toString(),
        });
    } else {
        await vendorWalletService.creditWallet(
            referrerCode.userId,
            settings.vendorReferrerRewardPoints,
            'Referral reward points',
            history._id.toString(),
            'referral_reward'
        );
    }

    if (referredModel === 'User') {
        await creditUserPoints({
            userId: referredUserObjectId,
            points: settings.newUserRewardPoints,
            description: 'Welcome referral points',
            sourceType: 'referral_welcome',
            sourceId: history._id.toString(),
        });
    } else {
        await vendorWalletService.creditWallet(
            referredUserObjectId,
            settings.newUserRewardPoints,
            'Welcome referral points',
            history._id.toString(),
            'referral_welcome'
        );
    }

    return {
        referrerId: referrerCode.userId,
        referrerType: referrerCode.userModel,
        referralCount: referrerCode.referralCount,
        milestoneUnlocked: referrerCode.userModel === 'Vendor' && referrerCode.referralCount >= settings.referralMilestoneMin,
    };
};

export const getReferralSummaryForAuthUser = async (user, providedBaseUrl = null) => {
    const settings = await getReferralSettings();
    const owner = getOwnerMetaFromAuth(user);
    const referral = await ensureReferralCodeForOwner(owner);

    const history = await ReferralHistory.find({
        referrerId: owner.userId,
        referrerModel: owner.userModel,
    })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('referredUserId', 'name email');

    const backendUrl = (providedBaseUrl || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const shareLink = `${backendUrl}/api/referrals/share/${referral.referralCode}`;
    const referralLink = `${FRONTEND_BASE_URL}/register?ref=${referral.referralCode}`;
    const message = encodeURIComponent(
        `Join India's premiere B2B marketplace! Sign up using my link to unlock exclusive bulk deals and start earning reward points: ${shareLink}`
    );

    let walletData = { pointsBalance: 0 };
    if (owner.userModel === 'User') {
        const wallet = await getOrCreateUserWallet(owner.userId);
        walletData = { pointsBalance: wallet.pointsBalance };
    } else {
        const vendorWallet = await vendorWalletService.getOrCreateWallet(owner.userId);
        walletData = { pointsBalance: vendorWallet.balance };
    }

    let linkedUserPoints = null;
    if (owner.userModel === 'Vendor') {
        const vendor = await Vendor.findById(owner.userId).select('email').lean();
        if (vendor?.email) {
            const user = await User.findOne({ email: vendor.email.toLowerCase() }).select('_id email').lean();
            if (user?._id) {
                const linkedWallet = await getOrCreateUserWallet(user._id);
                linkedUserPoints = {
                    email: user.email,
                    pointsBalance: linkedWallet.pointsBalance,
                };
            }
        }
    }

    return {
        referralCode: referral.referralCode,
        referralCount: referral.referralCount,
        milestoneUnlocked: owner.userModel === 'Vendor' && referral.referralCount >= settings.referralMilestoneMin,
        milestoneThreshold: settings.referralMilestoneMin,
        referralLink,
        whatsappShareLink: `https://wa.me/?text=${message}`,
        wallet: walletData,
        linkedUserWallet: linkedUserPoints,
        history: history.map((item) => ({
            _id: item._id,
            referredUserId: item.referredUserId?._id,
            referredUserName: item.referredUserId?.name || null,
            referredUserEmail: item.referredUserId?.email || null,
            status: item.status,
            date: item.date || item.createdAt,
        })),
    };
};

export const transferUserPointsToVendor = async ({ userId, vendorId, points }) => {
    const amount = Number(points);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Points must be greater than 0');
    }

    const vendor = await Vendor.findById(vendorId).select('_id');
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    const referenceId = `RPT-${Date.now().toString(36).toUpperCase()}`;

    const updatedWallet = await debitUserPoints({
        userId,
        points: amount,
        description: 'Transferred points to vendor',
        sourceType: 'transfer_to_vendor',
        sourceId: referenceId,
    });

    await vendorWalletService.creditWallet(
        vendor._id,
        amount,
        'Received points transfer from user',
        referenceId,
        'manual'
    );

    return {
        referenceId,
        userPointsBalance: updatedWallet.pointsBalance,
    };
};
