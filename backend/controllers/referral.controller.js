import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
    getReferralSummaryForAuthUser,
    transferUserPointsToVendor,
    validateReferralCode,
} from '../services/referral.service.js';

export const getMyReferralSummary = asyncHandler(async (req, res) => {
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${req.get('host')}`;
    const data = await getReferralSummaryForAuthUser(req.user, baseUrl);
    res.status(200).json({
        success: true,
        data,
    });
});

export const validateReferralCodePublic = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const referral = await validateReferralCode(code);

    if (!referral) {
        return res.status(404).json({
            success: false,
            message: 'Referral code not found',
        });
    }

    return res.status(200).json({
        success: true,
        data: {
            referralCode: referral.referralCode,
            referrerType: referral.userModel,
        },
    });
});

export const transferPointsToVendor = asyncHandler(async (req, res) => {
    if (req.user?.role !== 'user') {
        return res.status(403).json({
            success: false,
            message: 'Only users can transfer points to vendors',
        });
    }

    const { vendorId, points } = req.body;
    const result = await transferUserPointsToVendor({
        userId: req.user.id,
        vendorId,
        points,
    });

    res.status(200).json({
        success: true,
        message: 'Points transferred successfully',
        data: result,
    });
});

/**
 * Public: Referral share page with OG tags for social preview
 * GET /api/referrals/share/:code
 */
export const getReferralSharePage = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const fUrl = (process.env.FRONTEND_URL || 'https://dealingindia.com').replace(/\/+$/, '');
    const redirectUrl = `${fUrl}/register?ref=${code}`;
    
    // SEO / OG Content
    const title = "Join Dealing India - B2B Marketplace";
    const description = "Sign up using my referral link to unlock exclusive bulk deals and start earning reward points on India's premiere B2B platform.";
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' || req.get('host').includes('dealingindia.com') ? 'https' : 'http';
    const bUrl = `${protocol}://${req.get('host')}`;
    const shareUrl = `${bUrl}${req.originalUrl || req.url}`;
    // OG_LOGO_URL can be set to a Cloudinary/CDN URL so WhatsApp can always fetch the image
    const image = process.env.OG_LOGO_URL || `${bUrl}/upload/dealing-india-logo.png`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="2; url=${redirectUrl}">
    
    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / Meta -->
    <meta property="og:site_name" content="Dealing India">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Dealing India Logo">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@dealingindia">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:image:alt" content="Dealing India Logo">
</head>
<body style="background: #0b0b0f; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
    <div style="text-align: center; max-width: 400px; width: 100%;">
        <div style="margin-bottom: 30px;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(124, 58, 237, 0.2); border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
        </div>
        
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 10px 0;">Dealing India Referral</h1>
        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0 0 30px 0;">Redirecting you to the invitation page...</p>
        
        <a href="${redirectUrl}" style="display: inline-block; background: #7C3AED; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; transition: transform 0.2s;">
            Accept Invitation
        </a>
    </div>
    <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        a:active { transform: scale(0.95); }
    </style>
</body>
</html>
    `.trim();

    res.set('Content-Type', 'text/html');
    res.send(html);
});
