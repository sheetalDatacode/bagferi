import Reel from '../models/Reel.model.js';
import ReelReport from '../models/ReelReport.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';
import ReelView from '../models/ReelView.model.js';
import YouTubePlaylistMap from '../models/YouTubePlaylistMap.model.js';
import Vendor from '../models/Vendor.model.js';
import User from '../models/User.model.js';
import Music from '../models/Music.model.js';
import B2BSettings from '../models/B2BSettings.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadToCloudinary, deleteFromCloudinary, uploadUrlToCloudinary } from '../utils/cloudinary.util.js';
import { publishReelToYouTube, fetchPlaylistItems, fetchVideoById, deleteVideoFromYouTube } from '../services/youtubeReel.service.js';
import notificationService from '../services/notification.service.js';
import { ensureCategoryStructure } from '../services/categoryAutomation.service.js';
import subscriptionRulesService from '../services/subscriptionRules.service.js';

const REEL_ACTIVE_HOURS = 24; // kept for backwards compatibility only

/** 
 * Live-heal legacy dynamic URLs for Admin Preview.
 * Fixes: e_mute -> ac_none, l_audio -> l_video, nested layers, missing flags etc.
 */
function fixLegacyDynamicUrl(reel) {
  if (!reel.videoUrl || !reel.videoUrl.includes('cloudinary.com')) return reel.videoUrl;

  // If it's already a frozen file, no need to touch it
  if (!reel.videoUrl.includes('/e_mute/') && !reel.videoUrl.includes('/ac_none/') && !reel.videoUrl.includes('l_video:') && !reel.videoUrl.includes('l_audio:')) {
    return reel.videoUrl;
  }

  // If we have originalVideoUrl, it's safer to reconstruct if possible
  if (reel.originalVideoUrl && reel.videoUrl.includes('fl_layer_apply')) {
    const parts = reel.originalVideoUrl.split('/upload/');
    if (parts.length === 2) {
      const base = parts[0];
      const pathPart = parts[1].startsWith('/') ? parts[1].substring(1) : parts[1];

      // Extract the music ID from the current broken URL if possible
      const musicMatch = reel.videoUrl.match(/l_(?:video|audio):([^/,]+)/);
      if (musicMatch) {
        const musicIdPart = musicMatch[1];
        // Reconstruct with ac_none
        return `${base}/upload/ac_none/l_video:${musicIdPart}/fl_layer_apply/${pathPart}`;
      }
    }
  }

  // Backup: manual string replacements if reconstruction fails
  return reel.videoUrl
    .replace(/\/e_mute\//g, '/ac_none/')
    .replace(/l_audio:/g, 'l_video:')
    .replace(/:upload:video:/g, ':') // Fix nested upload:video: prefix
    .replace(/:upload:/g, ':');
}

/** Detect if URL is YouTube or Direct Video */
function detectReelLinkType(url) {
  if (!url) return { reelType: 'upload', externalLinkType: 'cloudinary' };

  const isYouTube = url.includes('youtube.com/') || url.includes('youtu.be/') || url.includes('youtube-nocookie.com/');
  if (isYouTube) return { reelType: 'link', externalLinkType: 'youtube' };

  const isCloudinary = url.includes('cloudinary.com/');
  if (isCloudinary) return { reelType: 'upload', externalLinkType: 'cloudinary' };

  return { reelType: 'link', externalLinkType: 'direct' };
}


/** Get uploader display name */
async function getUploaderName(uploaderId, uploaderType) {
  if (uploaderType === 'vendor') {
    const v = await Vendor.findById(uploaderId).select('storeName name').lean();
    return v?.storeName || v?.name || 'Vendor';
  }
  const u = await User.findById(uploaderId).select('name').lean();
  return u?.name || 'User';
}

export const uploadReel = asyncHandler(async (req, res) => {
  const { title, description, categoryId, categoryName, productId, propertyId, price, minimum, videoLink } = req.body;

  const role = req.user.role;
  if (role !== 'vendor' && role !== 'user') {
    return res.status(403).json({ success: false, message: 'Only vendors or users can upload reels' });
  }
  const uploaderId = req.user.vendorId || req.user.id;
  const uploaderType = role === 'vendor' ? 'vendor' : 'user';
  const uploaderName = await getUploaderName(uploaderId, uploaderType);

  if (!req.file && !videoLink) {
    return res.status(400).json({ success: false, message: 'Video file or link is required' });
  }
  if (!title || !categoryName) {
    return res.status(400).json({ success: false, message: 'Title and category are required' });
  }

  let uploadResult = { secure_url: null, public_id: null, duration: null };
  let reelType = 'upload';
  let externalLinkType = 'cloudinary';

  // 🔹 Global Setting Check for File Uploads
  if (!videoLink) {
    const settings = await B2BSettings.findOne().sort({ createdAt: -1 }).lean();
    if (settings && settings.enableVideoFileUpload === false) {
      return res.status(403).json({ success: false, message: 'Video file uploads are currently disabled by admin. Please use YouTube links.' });
    }
  }

  // 🔹 Daily Limit for File Uploads (Vendor only)
  if (!videoLink && uploaderType === 'vendor') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await Reel.countDocuments({
      uploaderId,
      uploaderType: 'vendor',
      reelType: 'upload',
      createdAt: { $gte: today }
    });
    if (count >= 1) {
      return res.status(403).json({ success: false, message: 'Only 1 reel upload allowed per day. Please use YouTube links or try again tomorrow.' });
    }
  }

  if (videoLink) {
    // Basic validation
    try { new URL(videoLink); } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid video link format' });
    }
    const detected = detectReelLinkType(videoLink);
    reelType = detected.reelType;
    externalLinkType = detected.externalLinkType;
    uploadResult.secure_url = videoLink;
  } else {
    // Handle File Upload
    const result = await uploadToCloudinary(req.file.buffer, 'reels', {
      resource_type: 'video',
      timeout: 300000, // Increased to 300s (5 min) for large video/image upload
      eager_async: true,
    });
    if (!result?.secure_url) {
      return res.status(500).json({ success: false, message: 'Video upload failed' });
    }
    uploadResult = result;
  }

  // Enforce max duration of 60 seconds (best-effort, based on Cloudinary metadata)
  const maxSeconds = 60;
  if (uploadResult.duration && uploadResult.duration > maxSeconds + 0.5) {
    // Attempt to clean up uploaded asset, but don't block on failure
    if (uploadResult.public_id) {
      deleteFromCloudinary(uploadResult.public_id).catch(() => { });
    }
    return res.status(400).json({
      success: false,
      message: `Reel video must be ${maxSeconds} seconds or shorter`,
    });
  }

  const reel = await Reel.create({
    title: String(title).trim().slice(0, 100),
    description: description ? String(description).trim().slice(0, 500) : '',
    categoryId: categoryId || null,
    categoryName: String(categoryName).trim(),
    productId: productId || null,
    propertyId: propertyId || null,
    price: Number(price) || 0,
    uploaderId,
    uploaderType,
    uploaderName,
    reelType,
    externalLinkType,
    videoUrl: uploadResult.secure_url,
    originalVideoUrl: uploadResult.secure_url,
    videoPublicId: uploadResult.public_id || null,
    durationSeconds: uploadResult.duration || null,
    status: 'pending',
    minimum: minimum ? String(minimum).trim().slice(0, 50) : '',
  });

  // 🔹 Consume addon if necessary (Middleware flagged this)
  if (uploaderType === 'vendor' && req.subscriptionLimits?.reels?.useAddon) {
    try {
      const vendorAddonService = (await import('../services/vendorAddon.service.js')).default;
      await vendorAddonService.consumeAddonUnit(uploaderId, 'reels');
    } catch (addonError) {
      console.error('Error consuming reel addon:', addonError);
    }
  }

  // 🔹 Notify Admins about new reel waiting for moderation
  try {
    const io = req.app.get('io');
    await notificationService.sendBulkNotification({
      type: 'reel_moderation',
      title: 'New Reel Submitted',
      message: `${uploaderName} uploaded a new reel: "${title.slice(0, 30)}${title.length > 30 ? '...' : ''}". Review pending.`,
      actionUrl: '/admin/reels?status=pending',
      metadata: { reelId: reel._id, uploaderName, reelType }
    }, 'admins', [], io);
  } catch (adminNotifErr) {
    console.error('[Reel Upload] Admin notification failed:', adminNotifErr.message);
  }

  res.status(201).json({
    success: true,
    message: 'Reel submitted for moderation',
    data: { reel: reel.toObject() },
  });
});

/**
 * My reels (vendor or user)
 * GET /api/reels/my
 */
export const getMyReels = asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (role !== 'vendor' && role !== 'user') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const uploaderId = req.user.vendorId || req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const { reelType, search, categoryName } = req.query;
  const query = {
    uploaderId,
    $nor: [
      { reelType: 'link', externalLinkType: 'youtube', isYouTubeLinkValid: false }
    ]
  };
  if (reelType) query.reelType = reelType;
  if (categoryName) query.categoryName = new RegExp(categoryName, 'i');
  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
  }

  const [reels, total] = await Promise.all([
    Reel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Reel.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: { reels },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Admin: list reels for moderation (pending first, filters)
 * GET /api/admin/reels
 */
export const adminListReels = asyncHandler(async (req, res) => {
  const { status, categoryName, categoryId, reelType, onlyBroken, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (onlyBroken === 'true') {
    filter.isYouTubeLinkValid = false;
  }

  if (status) filter.status = status;
  if (reelType) filter.reelType = reelType;
  if (categoryId) filter.categoryId = categoryId;
  if (categoryName) filter.categoryName = new RegExp(categoryName, 'i');

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { uploaderName: new RegExp(search, 'i') }
    ];
  }

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const [reels, total] = await Promise.all([
    Reel.find(filter).populate('musicId').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Reel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      reels: reels.map(r => ({ ...r, videoUrl: fixLegacyDynamicUrl(r) }))
    },
    pagination: { page: parseInt(page), limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * Admin: get one reel (for preview)
 * GET /api/admin/reels/:id
 */
export const adminGetReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).populate('musicId').lean();
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  const updatedReel = { ...reel, videoUrl: fixLegacyDynamicUrl(reel) };
  res.status(200).json({ success: true, data: { reel: updatedReel } });
});

/**
 * Admin: approve reel → upload to YouTube, add to category playlist, set approved
 * POST /api/admin/reels/:id/approve
 */
export const adminApproveReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (reel.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Reel is already ${reel.status}` });
  }

  let youtubeVideoId = null;
  let youtubePlaylistId = null;
  let youtubeUploadFailed = false;
  let youtubeUploadError = null;

  try {
    // Skip YouTube upload for external links
    if (reel.reelType === 'link') {
      console.log(`[Admin Approve] Reel ${reel._id} is a link (${reel.externalLinkType}), skipping YouTube upload.`);
    } else {
      // Proactively freeze URLs that are still dynamic
      if (reel.videoUrl?.includes('cloudinary.com') && (reel.videoUrl.includes('/e_mute/') || reel.videoUrl.includes('/ac_none/') || reel.videoUrl.includes('l_video:') || reel.videoUrl.includes('l_audio:'))) {
        try {
          const processedResult = await uploadUrlToCloudinary(reel.videoUrl, 'reels/processed', {
            resource_type: 'video',
          });
          reel.videoUrl = processedResult.secure_url;
          reel.videoPublicId = processedResult.public_id;
        } catch (err) {
          console.error('[Admin Approve] Failed to freeze dynamic URL:', err.message);
        }
      }

      const result = await publishReelToYouTube(reel);
      youtubeVideoId = result?.youtubeVideoId || null;
      youtubePlaylistId = result?.youtubePlaylistId || null;
    }
  } catch (err) {
    youtubeUploadFailed = true;
    youtubeUploadError = err.message || 'YouTube upload failed';
    // Log so production admins can see why upload failed (e.g. missing env, unreachable videoUrl)
    console.error('[Reel approve] YouTube upload failed:', err.message, {
      reelId: reel._id,
      videoUrl: reel.videoUrl ? 'set' : 'missing',
      details: err.response?.data || null,
    });
  }

  reel.status = 'approved';
  reel.approvedAt = new Date();
  reel.approvedBy = req.user.adminId || req.user.id;
  reel.youtubeVideoId = youtubeVideoId;
  reel.youtubePlaylistId = youtubePlaylistId;
  reel.youtubeUploadFailed = youtubeUploadFailed;
  reel.youtubeUploadError = youtubeUploadError;
  await reel.save();

  // Send notification to uploader
  try {
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipientId: reel.uploaderId,
      recipientType: reel.uploaderType,
      type: 'reel_status',
      title: 'Reel Approved',
      message: `Your reel "${reel.title}" has been approved and is now live!`,
      actionUrl: '/b2b-vendor/reels',
      metadata: { reelId: reel._id }
    }, io);
  } catch (notifErr) {
    console.error('[Reel Approve] Notification failed:', notifErr.message);
  }

  res.status(200).json({
    success: true,
    message: youtubeUploadFailed
      ? 'Reel approved but YouTube upload failed. Video will play from platform until 24h.'
      : 'Reel approved and published to YouTube',
    data: {
      reel: reel.toObject(),
      youtubeUploadFailed,
      youtubeUploadError: youtubeUploadFailed ? youtubeUploadError : undefined,
    },
  });
});

/**
 * Admin: Bulk approve reels
 * POST /api/admin/reels/bulk-approve
 * Body: { ids: string[] }
 */
export const adminBulkApproveReels = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Reel IDs are required' });
  }

  const results = {
    total: ids.length,
    approved: 0,
    failed: 0,
    errors: []
  };

  const adminId = req.user.adminId || req.user.id;
  const io = req.app.get('io');

  // Loop through each ID and process
  for (const id of ids) {
    try {
      const reel = await Reel.findById(id);
      if (!reel) {
        results.failed++;
        results.errors.push({ id, message: 'Reel not found' });
        continue;
      }
      if (reel.status !== 'pending') {
        results.failed++;
        results.errors.push({ id, message: `Reel is already ${reel.status}` });
        continue;
      }

      let youtubeVideoId = null;
      let youtubePlaylistId = null;
      let youtubeUploadFailed = false;
      let youtubeUploadError = null;

      try {
        if (reel.reelType === 'link') {
          // Skip YouTube upload for external links
        } else {
          // Proactively freeze dynamic URLs if needed
          if (reel.videoUrl?.includes('cloudinary.com') && (reel.videoUrl.includes('/e_mute/') || reel.videoUrl.includes('/ac_none/') || reel.videoUrl.includes('l_video:') || reel.videoUrl.includes('l_audio:'))) {
            try {
              const processedResult = await uploadUrlToCloudinary(reel.videoUrl, 'reels/processed', { resource_type: 'video' });
              reel.videoUrl = processedResult.secure_url;
              reel.videoPublicId = processedResult.public_id;
            } catch (err) {
              console.error(`[Admin Bulk Approve] Failed to freeze dynamic URL for ${id}:`, err.message);
            }
          }
          const result = await publishReelToYouTube(reel);
          youtubeVideoId = result?.youtubeVideoId || null;
          youtubePlaylistId = result?.youtubePlaylistId || null;
        }
      } catch (err) {
        youtubeUploadFailed = true;
        youtubeUploadError = err.message || 'YouTube upload failed';
      }

      reel.status = 'approved';
      reel.approvedAt = new Date();
      reel.approvedBy = adminId;
      reel.youtubeVideoId = youtubeVideoId;
      reel.youtubePlaylistId = youtubePlaylistId;
      reel.youtubeUploadFailed = youtubeUploadFailed;
      reel.youtubeUploadError = youtubeUploadError;
      await reel.save();

      // Notify uploader
      try {
        await notificationService.createNotification({
          recipientId: reel.uploaderId,
          recipientType: reel.uploaderType,
          type: 'reel_status',
          title: 'Reel Approved',
          message: `Your reel "${reel.title}" has been approved and is now live!`,
          actionUrl: '/b2b-vendor/reels',
          metadata: { reelId: reel._id }
        }, io);
      } catch (notifErr) {
        // Notification failure shouldn't fail the approval
      }

      results.approved++;
    } catch (err) {
      results.failed++;
      results.errors.push({ id, message: err.message });
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk processing complete. Approved: ${results.approved}, Failed: ${results.failed}`,
    data: results
  });
});

/**
 * Admin: retry YouTube upload for an approved reel (no status change)
 * POST /api/admin/reels/:id/retry-youtube
 */
export const adminRetryYouTubeUpload = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel must be approved to retry YouTube upload' });
  }
  if (reel.youtubeVideoId) {
    return res.status(400).json({ success: false, message: 'Reel already uploaded to YouTube' });
  }

  let youtubeVideoId = null;
  let youtubePlaylistId = null;
  let youtubeUploadFailed = false;
  let youtubeUploadError = null;

  try {
    // Proactively freeze URLs that are still dynamic
    if (reel.videoUrl?.includes('cloudinary.com') && (reel.videoUrl.includes('/e_mute/') || reel.videoUrl.includes('/ac_none/') || reel.videoUrl.includes('l_video:') || reel.videoUrl.includes('l_audio:'))) {
      try {
        const processedResult = await uploadUrlToCloudinary(reel.videoUrl, 'reels/processed', {
          resource_type: 'video',
        });
        reel.videoUrl = processedResult.secure_url;
        reel.videoPublicId = processedResult.public_id;
      } catch (err) {
        console.error('[Reel retry] Failed to freeze dynamic URL:', err.message);
      }
    }

    const result = await publishReelToYouTube(reel);
    youtubeVideoId = result?.youtubeVideoId || null;
    youtubePlaylistId = result?.youtubePlaylistId || null;
  } catch (err) {
    youtubeUploadFailed = true;
    youtubeUploadError = err.message || 'YouTube upload failed';
    console.error('[Reel retry] YouTube upload failed:', err.message, {
      reelId: reel._id,
      videoUrl: reel.videoUrl ? 'set' : 'missing',
      details: err.response?.data || null,
    });
  }

  reel.youtubeVideoId = youtubeVideoId;
  reel.youtubePlaylistId = youtubePlaylistId;
  reel.youtubeUploadFailed = youtubeUploadFailed;
  reel.youtubeUploadError = youtubeUploadError;
  await reel.save();

  return res.status(200).json({
    success: true,
    message: youtubeUploadFailed
      ? 'YouTube retry failed. Video will continue playing from the platform.'
      : 'Reel uploaded to YouTube successfully',
    data: {
      reel: reel.toObject(),
      youtubeUploadFailed,
      youtubeUploadError: youtubeUploadFailed ? youtubeUploadError : undefined,
    },
  });
});

/**
 * Admin: reject reel
 * POST /api/admin/reels/:id/reject
 * Body: { reason?: string }
 */
export const adminRejectReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (reel.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Reel is already ${reel.status}` });
  }
  reel.status = 'rejected';
  reel.rejectReason = req.body?.reason?.trim() || null;
  await reel.save();

  // Send notification to uploader
  try {
    const io = req.app.get('io');
    await notificationService.createNotification({
      recipientId: reel.uploaderId,
      recipientType: reel.uploaderType,
      type: 'reel_status',
      title: 'Reel Rejected',
      message: `Your reel "${reel.title}" was rejected. Reason: ${reel.rejectReason || 'No reason provided.'}`,
      actionUrl: '/b2b-vendor/reels',
      metadata: { reelId: reel._id, reason: reel.rejectReason }
    }, io);
  } catch (notifErr) {
    console.error('[Reel Reject] Notification failed:', notifErr.message);
  }

  res.status(200).json({ success: true, message: 'Reel rejected', data: { reel: reel.toObject() } });
});

/**
 * Admin: delete reel
 * DELETE /api/admin/reels/:id
 */
export const adminDeleteReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // 1. Delete from YouTube if approved
  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[adminDeleteReel] YouTube delete failed:', err.message);
    });
  }

  // 2. Delete from Cloudinary
  if (reel.videoPublicId) {
    await deleteFromCloudinary(reel.videoPublicId, 'video').catch(() => { });
  }
  if (reel.thumbnailUrl && reel.thumbnailUrl.includes('cloudinary.com')) {
    await deleteFromCloudinary(reel.thumbnailUrl, 'image').catch(() => { });
  }

  // 3. Delete from DB (Likes, Comments, Reel)
  await ReelLike.deleteMany({ reelId: reel._id });
  await ReelComment.deleteMany({ reelId: reel._id });
  await ReelView.deleteMany({ reelId: reel._id });
  await Reel.findByIdAndDelete(reel._id);

  res.status(200).json({ success: true, message: 'Reel deleted successfully' });
});

/**
 * Delete my reel (vendor or user)
 * DELETE /api/reels/:id
 */
export const deleteMyReel = asyncHandler(async (req, res) => {
  const uploaderId = req.user.vendorId || req.user.id;
  const reel = await Reel.findById(req.params.id);

  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Ensure ownership
  if (reel.uploaderId.toString() !== uploaderId.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this reel' });
  }

  // 1. Delete from YouTube if approved
  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[deleteMyReel] YouTube delete failed:', err.message);
    });
  }

  // 2. Delete from Cloudinary
  if (reel.videoPublicId) {
    await deleteFromCloudinary(reel.videoPublicId, 'video').catch(() => { });
  }
  if (reel.thumbnailUrl && reel.thumbnailUrl.includes('cloudinary.com')) {
    await deleteFromCloudinary(reel.thumbnailUrl, 'image').catch(() => { });
  }

  // 3. Delete from DB (Likes, Comments, Reel)
  await ReelLike.deleteMany({ reelId: reel._id });
  await ReelComment.deleteMany({ reelId: reel._id });
  await ReelView.deleteMany({ reelId: reel._id });
  await Reel.findByIdAndDelete(reel._id);

  res.status(200).json({ success: true, message: 'Reel deleted successfully' });
});


/**
 * Vendor: Replace song in copyrighted reel
 * POST /api/reels/:id/replace-song
 * Body: { musicId: string }
 */
export const replaceSong = asyncHandler(async (req, res) => {
  const { musicId } = req.body;
  if (!musicId) return res.status(400).json({ success: false, message: 'Music selection is required' });

  const reel = await Reel.findById(req.params.id);
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

  // Admin can replace song OR the owner (vendor/user)
  const isOwner = (req.user.vendorId || req.user.id) === reel.uploaderId.toString();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const music = await Music.findById(musicId);
  if (!music || !music.isActive) {
    return res.status(404).json({ success: false, message: 'Approved music not found' });
  }

  // Ensure originalVideoUrl is clean (no transformations)
  // We MUST use the original video as the base every time
  if (!reel.originalVideoUrl || reel.originalVideoUrl.includes('/e_mute/') || reel.originalVideoUrl.includes('l_video:')) {
    // If originalVideoUrl is somehow missing or corrupted, try to heal it or fallback to videoUrl (carefully)
    const baseSource = reel.originalVideoUrl || reel.videoUrl;
    const parts = baseSource.split('/upload/');
    if (parts.length === 2) {
      const versionMatch = parts[1].match(/(v\d+\/.*)$/);
      if (versionMatch) {
        reel.originalVideoUrl = `${parts[0]}/upload/${versionMatch[1]}`;
      }
    }
    if (!reel.originalVideoUrl) {
      return res.status(400).json({ success: false, message: 'Original video source not found for processing' });
    }
  }

  const musicPublicId = music.publicId.replace(/\//g, ':');
  const [base, pathPart] = reel.originalVideoUrl.split('/upload/');
  const versionPath = pathPart.startsWith('/') ? pathPart.substring(1) : pathPart;

  // Step 1: Generate the dynamic transformation URL (internal use only)
  // Format: l_video:folder:id
  // We use ac_none instead of e_mute as it's more robust for audio replacement on this account
  const transformedUrl = `${base}/upload/ac_none/l_video:${musicPublicId}/fl_layer_apply/${versionPath}`;

  // Step 2: Upload this transformed URL to create a new, stable video file
  // This "freezes" the transformation into a real file that YouTube and players can fetch reliably.
  let processedResult;
  try {
    processedResult = await uploadUrlToCloudinary(transformedUrl, 'reels/processed', {
      resource_type: 'video',
      // Optional: you can specify a public_id based on reel ID to avoid file clutter if replaced multiple times,
      // but here we let Cloudinary generate one to ensure we don't have cache issues.
    });
  } catch (err) {
    console.error('[replaceSong] Cloudinary processing failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process video with new audio' });
  }

  // Step 3: Cleanup old processed file if it exists
  // We only delete if audioStatus was already 'replaced', meaning videoPublicId points to a processed file
  // We NEVER delete if it's the original file (audioStatus === 'original')
  if (reel.audioStatus === 'replaced' && reel.videoPublicId) {
    deleteFromCloudinary(reel.videoPublicId, 'video').catch((e) => {
      console.error('[replaceSong] Failed to delete old processed video:', e.message);
    });
  }

  // Update reel state
  reel.videoUrl = processedResult.secure_url;
  reel.videoPublicId = processedResult.public_id;
  reel.audioStatus = 'replaced';
  reel.musicId = musicId;
  reel.status = 'pending';
  reel.isCopyrighted = false;

  if (reel.youtubeVideoId) {
    await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
      console.error('[replaceSong] YouTube delete failed:', err.message);
    });
    reel.youtubeVideoId = null;
    reel.youtubePlaylistId = null;
    reel.youtubeUploadFailed = false;
    reel.youtubeUploadError = null;
  }

  await reel.save();

  res.status(200).json({
    success: true,
    message: 'Song replaced and video processed. Reel submitted for re-approval.',
    data: { reel }
  });
});


/** True if id looks like a MongoDB ObjectId (24 hex chars); else treat as YouTube video id */
function isMongoId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Public feed: from YouTube playlist (no DB) when YOUTUBE_REELS_PLAYLIST_ID is set,
 * otherwise from DB (approved reels with youtubeVideoId).
 * GET /api/reels/feed
 */
export const getFeed = asyncHandler(async (req, res) => {
  const playlistId = process.env.YOUTUBE_REELS_PLAYLIST_ID;

  const isFiltering = req.query.propertyOnly || req.query.productOnly || req.query.category || req.query.categoryId || req.query.vendorId || req.query.search;

  if (playlistId && !isFiltering) {
    // Reels from YouTube only – no DB storage, global general feed
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const pageToken = req.query.pageToken || null;
    let result;
    try {
      result = await fetchPlaylistItems(playlistId, pageToken, limit);
    } catch (err) {
      console.error('[Reels] YouTube playlist fetch failed:', err.message);
      return res.status(502).json({
        success: false,
        message: err.message || 'Failed to load reels from YouTube',
      });
    }
    const reels = result.items.map((item) => ({
      _id: item.id,
      youtubeVideoId: item.youtubeVideoId,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      uploaderName: item.uploaderName,
      likeCount: 0,
      viewCount: 0,
      userLiked: false,
      vendorPhone: null,
      vendorStoreName: null,
      vendorId: null,
      price: 0,
    }));
    return res.status(200).json({
      success: true,
      data: { reels },
      pagination: {
        nextPageToken: result.nextPageToken || null,
        pages: result.nextPageToken ? undefined : 1,
      },
    });
  }

  // Original: feed from DB (approved reels with YouTube video)
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const categoryName = req.query.category;
  const categoryIdFilter = req.query.categoryId || null; // B2BCategory _id — admin-rename-proof
  const vendorIdFilter = req.query.vendorId || null;
  const propertyOnly = req.query.propertyOnly === 'true';
  const productOnly = req.query.productOnly === 'true';

  // Feed source: Only reels that have successfully reached YouTube OR are link-based reels
  const filter = {
    $and: [
      {
        $or: [
          { youtubeVideoId: { $gt: "" } },
          { status: "approved" },
        ],
      },
      {
        $nor: [
          { reelType: 'link', externalLinkType: 'youtube', isYouTubeLinkValid: false }
        ]
      }
    ]
  };

  const propertyCategories = ['Flat Properties', 'Villa / Row house Properties', 'Commercial Properties', 'Commercial Property', 'Flat Property', 'Villa Property'];
  const excludeCategoryKeywords = [/saree/i, /textile/i, /garment/i, /jewellery/i, /product/i, /bulk saree/i, /designer saree/i];

  if (propertyOnly) {
    filter.$and.push({
      $or: [
        { categoryName: { $in: propertyCategories.map(c => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) } },
        { propertyId: { $ne: null } }
      ]
    });
    // Strict exclusion of known non-property content families to handle test/junk data
    filter.$and.push({ categoryName: { $nin: excludeCategoryKeywords } });
  } else if (productOnly) {
    filter.$and.push({ propertyId: null });
    filter.$and.push({ categoryName: { $nin: propertyCategories.map(c => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) } });
  }

  // Note: We don't check 'status' here because if it's on YouTube, it's implicitly approved/live.
  /**
   * Smart category filter — supports two modes:
   *
   * 1. ID-based (preferred): ?categoryId=<B2BCategory._id>
   *    Looks up the B2BCategory by its stable MongoDB _id.
   *    Collects the root category name + ALL subcategory names.
   *    This works even if admin renames the category.
   *
   * 2. Name-based (fallback): ?category=<name>
   *    Used for backward-compatible old links or externally-linked URLs.
   *    Matches both the queried name AND the parent/sibling names.
   */
  if (categoryIdFilter || categoryName) {
    const categoryNamesToMatch = new Set();

    try {
      if (categoryIdFilter) {
        // --- Mode 1: ID-based lookup ---
        const cat = await B2BCategory.findById(categoryIdFilter).lean();
        if (cat) {
          const requestedName = categoryName ? categoryName.trim() : '';
          const isSubcategory = requestedName && cat.name.toLowerCase() !== requestedName.toLowerCase();
          
          if (isSubcategory) {
            // If the user requested a specific subcategory name, do NOT expand to all siblings.
            // Just strictly match the requested subcategory name.
            categoryNamesToMatch.add(requestedName);
          } else {
            // Include root category name
            categoryNamesToMatch.add(cat.name);
            // Include ALL subcategory names (so "Cloth Textile" also catches "Kurti", "Banarasi Saree", etc.)
            (cat.subcategories || []).forEach(sub => {
              const subName = typeof sub === 'string' ? sub : sub?.name;
              if (subName) categoryNamesToMatch.add(subName);
            });
            // Also add the original name param as a loose fallback
            if (requestedName) categoryNamesToMatch.add(requestedName);
          }
        } else if (categoryName) {
          categoryNamesToMatch.add(categoryName.trim());
        }
      } else {
        // --- Mode 2: Name-based lookup (backward compat) ---
        let searchTerm = categoryName.trim();
        // Fix legacy hardcoded plural property names from old app versions
        if (searchTerm.toLowerCase() === 'commercial properties') searchTerm = 'Commercial Property';
        if (searchTerm.toLowerCase() === 'flat properties') searchTerm = 'Flat Property';
        if (searchTerm.toLowerCase() === 'villa / row house properties') searchTerm = 'Villa Property';

        categoryNamesToMatch.add(searchTerm);

        // Check if it might be a ROOT category name — include all its subcategories
        const rootCat = await B2BCategory.findOne({
          name: { $regex: new RegExp('^' + searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        }).lean();

        if (rootCat?.subcategories?.length) {
          rootCat.subcategories.forEach(sub => {
            const subName = typeof sub === 'string' ? sub : sub?.name;
            if (subName) categoryNamesToMatch.add(subName);
          });
        }
      }
    } catch (catErr) {
      console.error('[ReelFeed] Category lookup failed:', catErr.message);
      // Last-resort fallback: simple regex
      if (categoryName) categoryNamesToMatch.add(categoryName.trim());
    }

    if (categoryNamesToMatch.size > 0) {
      // Build patterns with word-boundary-like matching to avoid partial false hits
      const categoryPatterns = Array.from(categoryNamesToMatch).map(n =>
        new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );
      filter.$and.push({ categoryName: { $in: categoryPatterns } });
      console.log('Category Patterns used for filter:', Array.from(categoryNamesToMatch));
    } else if (categoryName || categoryIdFilter) {
      // If we failed to build patterns but they requested a filter, at least filter by the name they requested
      const fallback = categoryName ? categoryName.trim() : '';
      if (fallback) {
         filter.$and.push({ categoryName: new RegExp(fallback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
         console.log('Fallback Category Pattern used:', fallback);
      }
    }
  }
  if (vendorIdFilter) {
    filter.uploaderType = 'vendor';
    filter.uploaderId = vendorIdFilter;

    // Ensure the requested vendor is active/approved
    const validVendor = await Vendor.findOne({ _id: vendorIdFilter, status: 'approved', isActive: true }).select('_id').lean();
    if (!validVendor) {
      return res.status(200).json({ success: true, data: { reels: [] }, pagination: { page, limit, total: 0, pages: 0 } });
    }
  } else {
    // Only fetch reels from currently active/approved vendors to prevent JavaScript-level filtering from breaking pagination
    // Include vendors where vendorType is missing (legacy data) or explicitly 'b2b'
    const validVendors = await Vendor.find({
      status: 'approved',
      isActive: true
    }).select('_id').lean();
    const validVendorIds = validVendors.map(v => v._id);

    filter.$and.push({
      $or: [
        { uploaderType: { $ne: 'vendor' } },
        { uploaderType: 'vendor', uploaderId: { $in: validVendorIds } }
      ]
    });
  }

  const total = await Reel.countDocuments(filter);

  const reels = await Reel.find(filter)
    .sort({ approvedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const vendorIds = reels
    .filter((r) => r.uploaderType === 'vendor')
    .map((r) => r.uploaderId);
  let vendorMap = new Map();
  if (vendorIds.length) {
    const [vendors, b2bSettings] = await Promise.all([
      Vendor.find({
        _id: { $in: vendorIds },
        status: 'approved',
        isActive: true
      })
        .select('phone storeName currentSubscription businessType businessTypeRef')
        .lean(),
    ]);

    // Enrich with enquiry status in a more optimized way
    // We pass the pre-fetched settings to avoid N+1 queries for settings
    const vendorStatusPromises = vendors.map(async (v) => {
      const status = await subscriptionRulesService.getVendorEnquiryStatus(v._id, b2bSettings);
      return { ...v, enquiryStatus: status };
    });
    const enrichedVendors = await Promise.all(vendorStatusPromises);
    vendorMap = new Map(enrichedVendors.map((v) => [v._id.toString(), v]));
  }

  const reelIds = reels.map((r) => r._id);
  const likesCount = await ReelLike.aggregate([
    { $match: { reelId: { $in: reelIds } } },
    { $group: { _id: '$reelId', count: { $sum: 1 } } },
  ]);
  const commentsCount = await ReelComment.aggregate([
    { $match: { reelId: { $in: reelIds } } },
    { $group: { _id: '$reelId', count: { $sum: 1 } } },
  ]);
  const likeMap = new Map(likesCount.map((x) => [x._id.toString(), x.count]));
  const commentMap = new Map(commentsCount.map((x) => [x._id.toString(), x.count]));

  let userLikedSet = new Set();
  const currentUserId = req.user?.id || req.user?.vendorId;
  if (currentUserId) {
    const userLikes = await ReelLike.find({ reelId: { $in: reelIds }, userId: currentUserId })
      .select('reelId')
      .lean();
    userLikedSet = new Set(userLikes.map((l) => l.reelId.toString()));
  }

  const feed = reels.map((r) => {
    const vendorInfo =
      r.uploaderType === 'vendor'
        ? vendorMap.get(r.uploaderId?.toString() || '') || null
        : null;

    // Filter out vendor reels where the vendor is no longer approved or active
    if (r.uploaderType === 'vendor' && !vendorInfo) {
      return null;
    }

    return {
      ...r,
      likeCount: likeMap.get(r._id.toString()) || 0,
      commentCount: commentMap.get(r._id.toString()) || 0,
      userLiked: userLikedSet.has(r._id.toString()),
      vendorPhone: vendorInfo?.phone || null,
      vendorStoreName: vendorInfo?.storeName || r.uploaderName || null,
      viewCount: typeof r.viewCount === 'number' ? r.viewCount : 0,
      vendorId: r.uploaderType === 'vendor' ? (vendorInfo?._id || null) : null,
      enquiryStatus: vendorInfo?.enquiryStatus || null,
      price: r.price || 0,
    };
  }).filter(Boolean);

  // Total count is now accurate because filtering is done at DB level
  res.status(200).json({
    success: true,
    data: {
      reels: feed.map(r => ({ ...r, videoUrl: fixLegacyDynamicUrl(r) }))
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Get a single public reel by ID (for shared links). ID can be MongoDB _id or YouTube video id.
 * GET /api/reels/:id
 */
export const getReelById = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!isMongoId(id)) {
    // YouTube video id – fetch from YouTube, no DB
    const video = await fetchVideoById(id).catch(() => null);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    const feedItem = {
      _id: video.id,
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      uploaderName: video.uploaderName,
      likeCount: 0,
      viewCount: 0,
      userLiked: false,
      vendorPhone: null,
      vendorStoreName: null,
      vendorId: null,
    };
    return res.status(200).json({ success: true, data: { reel: feedItem } });
  }

  const reel = await Reel.findById(id).lean();
  if (!reel ||
    (!reel.youtubeVideoId && reel.reelType !== "link") ||
    (reel.reelType === 'link' && reel.externalLinkType === 'youtube' && reel.isYouTubeLinkValid === false)) {
    return res.status(404).json({
      success: false,
      message: "Reel not found or not published to YouTube",
    });
  }

  let vendorInfo = null;
  if (reel.uploaderType === 'vendor' && reel.uploaderId) {
    const v = await Vendor.findOne({
      _id: reel.uploaderId,
      status: 'approved',
      isActive: true,
      vendorType: 'b2b'
    }).select('phone storeName').lean();

    // If it's a vendor reel but vendor is no longer approved/active
    if (!v) {
      return res.status(404).json({ success: false, message: 'Vendor store is no longer active' });
    }
    vendorInfo = v;
  }

  const [likeCount, commentCount, userLiked] = await Promise.all([
    ReelLike.countDocuments({ reelId: reel._id }),
    ReelComment.countDocuments({ reelId: reel._id }),
    req.user?.id || req.user?.vendorId
      ? ReelLike.exists({ reelId: reel._id, userId: req.user.id || req.user.vendorId })
      : Promise.resolve(null),
  ]);

  const feedItem = {
    ...reel,
    likeCount: likeCount || 0,
    commentCount: commentCount || 0,
    userLiked: !!userLiked,
    vendorPhone: vendorInfo?.phone || null,
    vendorStoreName: vendorInfo?.storeName || reel.uploaderName || null,
    viewCount: typeof reel.viewCount === 'number' ? reel.viewCount : 0,
    vendorId: reel.uploaderType === 'vendor' ? (vendorInfo?._id || null) : null,
    enquiryStatus: vendorInfo ? (await subscriptionRulesService.getVendorEnquiryStatus(vendorInfo._id)) : null,
    price: reel.price || 0,
  };

  res.status(200).json({
    success: true,
    data: {
      reel: { ...feedItem, videoUrl: fixLegacyDynamicUrl(feedItem) }
    },
  });
});

/**
 * Track a view for a reel (used by reel feed when a reel becomes active)
 * POST /api/reels/:id/view
 * For YouTube-only reels (id = video id), no-op and return 200.
 */
export const trackView = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { viewCount: 0 } });
  }
  const reel = await Reel.findById(req.params.id).select('status approvedAt viewCount').lean();
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }

  const userId = req.user?.id || req.user?.vendorId || null;
  let updatedViewCount = reel.viewCount ?? 0;

  if (userId) {
    // One counted view per user per reel
    const existing = await ReelView.findOne({ reelId: reel._id, userId }).lean();
    if (!existing) {
      await ReelView.create({ reelId: reel._id, userId });
      const updated = await Reel.findByIdAndUpdate(
        req.params.id,
        { $inc: { viewCount: 1 } },
        { new: true, select: 'viewCount' }
      ).lean();
      updatedViewCount = updated?.viewCount ?? updatedViewCount + 1;
    }
  } else {
    // Anonymous viewer: count every activation
    const updated = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true, select: 'viewCount' }
    ).lean();
    updatedViewCount = updated?.viewCount ?? updatedViewCount + 1;
  }

  res.status(200).json({
    success: true,
    data: { viewCount: updatedViewCount },
  });
});

/**
 * Like reel
 * POST /api/reels/:id/like
 * For YouTube-only reels (id = video id), no-op and return 200.
 */
export const likeReel = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to like' });
  }
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { liked: true, likeCount: 0 } });
  }
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }

  await ReelLike.findOneAndUpdate(
    { reelId: reel._id, userId },
    { $set: { reelId: reel._id, userId } },
    { upsert: true }
  );
  const count = await ReelLike.countDocuments({ reelId: reel._id });
  res.status(200).json({ success: true, data: { liked: true, likeCount: count } });
});

/**
 * Unlike reel
 * DELETE /api/reels/:id/like
 */
export const unlikeReel = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }
  if (!isMongoId(req.params.id)) {
    return res.status(200).json({ success: true, data: { liked: false, likeCount: 0 } });
  }
  await ReelLike.findOneAndDelete({ reelId: req.params.id, userId });
  const count = await ReelLike.countDocuments({ reelId: req.params.id });
  res.status(200).json({ success: true, data: { liked: false, likeCount: count } });
});

/**
 * List comments for a reel
 * GET /api/reels/:id/comments
 */
export const getComments = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id).lean();
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

  const comments = await ReelComment.find({ reelId: reel._id })
    .sort({ createdAt: 1 })
    .populate('userId', 'name')
    .lean();
  const list = comments.map((c) => ({
    _id: c._id,
    text: c.text,
    userId: c.userId?._id,
    userName: c.userId?.name || 'User',
    createdAt: c.createdAt,
  }));
  res.status(200).json({ success: true, data: { comments: list } });
});

/**
 * Add comment
 * POST /api/reels/:id/comments
 * Body: { text: string }
 */
export const addComment = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.vendorId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to comment' });
  }
  const reel = await Reel.findById(req.params.id);
  if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
  if (!['approved', 'expired'].includes(reel.status)) {
    return res.status(400).json({ success: false, message: 'Reel is not active' });
  }
  const text = req.body?.text?.trim();
  if (!text || text.length > 500) {
    return res.status(400).json({ success: false, message: 'Comment text required (max 500 chars)' });
  }

  const comment = await ReelComment.create({
    reelId: reel._id,
    userId,
    text,
  });
  await comment.populate('userId', 'name');
  res.status(201).json({
    success: true,
    data: {
      comment: {
        _id: comment._id,
        text: comment.text,
        userId: comment.userId?._id,
        userName: comment.userId?.name || 'User',
        createdAt: comment.createdAt,
      },
    },
  });
});

/**
 * Get YouTube playlist ID for a category (for embedding)
 * GET /api/reels/playlist/:categoryName
 */
export const getPlaylistByCategory = asyncHandler(async (req, res) => {
  const categoryName = decodeURIComponent(req.params.categoryName || '').trim();
  if (!categoryName) {
    return res.status(400).json({ success: false, message: 'Category name required' });
  }
  const map = await YouTubePlaylistMap.findOne({
    categoryName: new RegExp('^' + categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
  }).lean();
  if (!map) {
    return res.status(200).json({
      success: true,
      data: { youtubePlaylistId: null, categoryName },
    });
  }
  res.status(200).json({
    success: true,
    data: {
      youtubePlaylistId: map.youtubePlaylistId,
      youtubePlaylistTitle: map.youtubePlaylistTitle,
      categoryName: map.categoryName,
    },
  });
});

/**
 * Public: Minimal HTML page with meta tags for dynamic social preview
 * GET /api/reels/share/:id
 */
export const getReelSharePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reel = await Reel.findById(id).populate('productId propertyId').lean();

  const fUrl = (process.env.FRONTEND_URL || 'https://dealingindia.com').replace(/\/+$/, '');
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' || req.get('host').includes('dealingindia.com') ? 'https' : 'http';
  const bUrl = `${protocol}://${req.get('host')}`;
  const shareUrl = `${bUrl}${req.originalUrl || req.url}`;
  const redirectUrl = `${fUrl}/b2b/reels/${id}`;

  // Default values
  let title = "Check out this Reel on Dealing India";
  let description = "Watch high-quality product reels and bulk deals on India's premiere B2B marketplace.";
  let image = `${bUrl}/upload/dealing-india-logo.png`;

  if (reel) {
    const type = reel.propertyId ? "Property" : (reel.productId ? "Product" : "Reel");

    // Handle custom title based on product/property if available
    if (reel.productId && reel.productId.name) {
      title = `Check out this product: ${reel.productId.name}`;
      description = reel.description || `Watch this ${reel.categoryName || ''} product in action on Dealing India.`;
    } else if (reel.propertyId && reel.propertyId.title) {
      title = `Check out this property: ${reel.propertyId.title}`;
      description = reel.description || `Explore this property listing on Dealing India.`;
    } else {
      title = reel.title || `${type} from ${reel.uploaderName || 'Dealing India'}`;
      if (reel.price > 0) title = `₹${reel.price} - ${title}`;
      description = reel.description || `Watch this ${reel.categoryName || ''} ${type.toLowerCase()} in action on Dealing India.`;
    }

    // Handle images with fallback hierarchy
    if (reel.thumbnailUrl) {
      image = reel.thumbnailUrl;
    } else if (reel.youtubeVideoId) {
      image = `https://img.youtube.com/vi/${reel.youtubeVideoId}/maxresdefault.jpg`;
    } else if (reel.videoUrl && reel.videoUrl.includes('cloudinary.com')) {
      // Generate a high-quality thumbnail from Cloudinary video (start of video)
      // Replace extension with jpg and add transformations for better social preview
      image = reel.videoUrl.replace(/\.(mp4|mkv|mov|avi|webm)$/, ".jpg")
        .replace("/upload/", "/upload/w_1200,h_630,c_fill,so_0/");
    } else if (reel.videoUrl && (reel.videoUrl.includes('youtube.com') || reel.videoUrl.includes('youtu.be'))) {
      const ytMatch = reel.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|embed\/|shorts\/))([^&?\/ ]{11})/);
      if (ytMatch && ytMatch[1]) {
        image = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
      }
    } else if (reel.productId && (reel.productId.image || reel.productId.images?.[0])) {
      image = reel.productId.image || reel.productId.images[0];
    } else if (reel.propertyId && reel.propertyId.images?.[0]) {
      image = reel.propertyId.images[0];
    }
  } else if (id && !isMongoId(id)) {
    // Handle non-Mongo IDs (potentially direct YouTube IDs)
    try {
      const ytVideo = await fetchVideoById(id);
      if (ytVideo) {
        title = ytVideo.title;
        description = ytVideo.description || description;
        image = ytVideo.thumbnailUrl || image;
      }
    } catch (e) {
      console.error("[Share Page] YouTube fetch failed:", e.message);
    }
  }

  // Generate SEO/Social HTML
  // We avoid inline scripts here as some WAFs flag them in API responses
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
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
</head>
<body style="background: #0b0b0f; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
    <div style="text-align: center; max-width: 400px; width: 100%;">
        <div style="margin-bottom: 30px;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(124, 58, 237, 0.2); border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
        </div>
        
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 10px 0;">${title}</h1>
        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0 0 30px 0;">Redirecting you to the app...</p>
        
        <a href="${redirectUrl}" style="display: inline-block; background: #7C3AED; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; transition: transform 0.2s;">
            Open in Dealing India
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

/**
 * User/Vendor: Report a reel
 * POST /api/reels/:id/report
 * Body: { reason: string, comment?: string }
 */
export const reportReel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, comment } = req.body;
  const userId = req.user?.vendorId || req.user?.id;
  const userType = req.user.role === 'vendor' ? 'vendor' : 'user';

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Login required to report' });
  }

  const reel = await Reel.findById(id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Reason is required' });
  }

  const report = await ReelReport.create({
    reelId: id,
    reporterId: userId,
    reporterType: userType,
    reason: reason.trim(),
    comment: comment?.trim() || '',
  });

  // Notify Vendor about the report (Uploader)
  if (reel.uploaderType === 'vendor') {
    try {
      const io = req.app.get('io');
      await notificationService.createNotification({
        recipientId: reel.uploaderId,
        recipientType: 'vendor',
        type: 'reel_report',
        title: 'Reel Reported',
        message: `One of your reels "${reel.title}" has been reported for: ${reason}. Please review your content.`,
        actionUrl: '/b2b-vendor/reels',
        metadata: { reelId: reel._id, reportId: report._id, reason }
      }, io);
    } catch (notifErr) {
      console.error('[Reel Report] Notification to vendor failed:', notifErr.message);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully. Our team will review it.',
    data: { report }
  });
});

/**
 * Admin: List all reel reports
 * GET /api/admin/reels/reports
 */
export const adminListReelReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const [reports, total] = await Promise.all([
    ReelReport.find(filter)
      .populate({
        path: 'reelId',
        select: 'title videoUrl thumbnailUrl uploaderId uploaderType uploaderName status'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ReelReport.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { reports },
    pagination: { page: parseInt(page), limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * Admin: Resolve or Dismiss a reel report
 * POST /api/admin/reels/reports/:id/resolve
 * Body: { action: 'delete' | 'dismiss', comment?: string }
 */
export const adminResolveReelReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, comment } = req.body;
  const adminId = req.user.adminId || req.user.id;

  const report = await ReelReport.findById(id).populate('reelId');
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  if (report.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Report is already resolved' });
  }

  if (action === 'delete') {
    const reel = report.reelId;
    if (reel) {
      // Delete the reel logic
      if (reel.youtubeVideoId) {
        await deleteVideoFromYouTube(reel.youtubeVideoId).catch(err => {
          console.error('[adminResolveReport] YouTube delete failed:', err.message);
        });
      }

      if (reel.videoPublicId) {
        await deleteFromCloudinary(reel.videoPublicId, 'video').catch(() => { });
      }
      if (reel.thumbnailUrl && reel.thumbnailUrl.includes('cloudinary.com')) {
        await deleteFromCloudinary(reel.thumbnailUrl, 'image').catch(() => { });
      }

      await ReelLike.deleteMany({ reelId: reel._id });
      await ReelComment.deleteMany({ reelId: reel._id });
      await ReelView.deleteMany({ reelId: reel._id });
      await Reel.findByIdAndDelete(reel._id);

      // Resolve all other pending reports for this reel
      await ReelReport.updateMany(
        { reelId: reel._id, status: 'pending', _id: { $ne: report._id } },
        {
          $set: {
            status: 'resolved',
            actionTaken: 'deleted',
            resolvedBy: adminId,
            resolvedAt: new Date(),
            comment: 'Automatically resolved because the reel was deleted.'
          }
        }
      );

      try {
        const io = req.app.get('io');
        await notificationService.createNotification({
          recipientId: reel.uploaderId,
          recipientType: reel.uploaderType,
          type: 'reel_removed',
          title: 'Reel Removed',
          message: `Your reel "${reel.title}" was removed by admin following reports.`,
          actionUrl: '/b2b-vendor/reels',
          metadata: { reelId: reel._id, reason: report.reason, action: 'deleted' }
        }, io);
      } catch (notifErr) {
        console.error('[Reel Resolve] Notification failed:', notifErr.message);
      }
    }
    report.actionTaken = 'deleted';
    report.status = 'resolved';
  } else {
    report.actionTaken = 'no_action';
    report.status = 'dismissed';
  }

  report.resolvedBy = adminId;
  report.resolvedAt = new Date();
  if (comment) report.comment = (report.comment || '') + '\nAdmin Resolution: ' + comment;
  await report.save();

  res.status(200).json({
    success: true,
    message: action === 'delete' ? 'Reel deleted and all related reports resolved' : 'Report dismissed',
    data: { report }
  });
});

/**
 * Get daily upload status for vendor
 * GET /api/reels/daily-status
 */
export const getDailyUploadStatus = asyncHandler(async (req, res) => {
  const uploaderId = req.user.vendorId || req.user.id;
  const uploaderType = req.user.role === 'vendor' ? 'vendor' : 'user';

  if (uploaderType !== 'vendor') {
    return res.status(200).json({ success: true, data: { canUpload: true, count: 0 } });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [count, settings] = await Promise.all([
    Reel.countDocuments({
      uploaderId,
      uploaderType: 'vendor',
      reelType: 'upload',
      createdAt: { $gte: today }
    }),
    B2BSettings.findOne().sort({ createdAt: -1 }).lean()
  ]);

  const enableVideoFileUpload = settings ? settings.enableVideoFileUpload : true;

  res.status(200).json({
    success: true,
    data: {
      canUpload: count < 1 && enableVideoFileUpload,
      count,
      enableVideoFileUpload
    }
  });
});
export const debugReels = asyncHandler(async (req, res) => {
  const recentReels = await Reel.find({}).sort({ createdAt: -1 }).limit(10).lean();
  const blouseReels = await Reel.find({ categoryName: /readymade/i }).lean();
  res.status(200).json({ recent: recentReels, blouse: blouseReels });
});
