import axios from 'axios';
import Reel from '../models/Reel.model.js';
import notificationService from './notification.service.js';

/**
 * Validates YouTube video availability via Data API v3.
 * Requires YOUTUBE_API_KEY (Server Key) in .env.
 * @param {Object} io - Socket.io instance for real-time notifications
 */
export async function validateYouTubeLinkReels(io = null) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[YouTubeLinkValidator] Skipping validation: YOUTUBE_API_KEY not configured.');
    return;
  }

  try {
    // Find all approved reels that have a YouTube Video ID (both links and uploads)
    const reels = await Reel.find({
      status: 'approved',
      $or: [
        { reelType: 'link', externalLinkType: 'youtube' },
        { youtubeVideoId: { $ne: null, $ne: '' } }
      ]
    }).select('_id videoUrl youtubeVideoId title isYouTubeLinkValid youtubeLinkStatus').lean();

    if (reels.length === 0) {
      console.log('[YouTubeLinkValidator] No YouTube link reels found to validate.');
      return;
    }

    console.log(`[YouTubeLinkValidator] Starting validation for ${reels.length} reels...`);

    const invalidReelsForNotification = [];

    // Helper to extract YouTube video ID if missing or incorrect
    const extractVideoId = (url) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|embed\/|shorts\/))([^&?\/ ]{11})/);
      return match ? match[1] : null;
    };

    // Process in batches of 50 (YouTube API limit)
    const batchSize = 50;
    for (let i = 0; i < reels.length; i += batchSize) {
      const batch = reels.slice(i, i + batchSize);
      
      // Prepare map of IDs to reels for quick lookup
      const idMap = {};
      batch.forEach(r => {
        const vidId = r.youtubeVideoId || extractVideoId(r.videoUrl);
        if (vidId) idMap[vidId] = r;
      });

      const videoIds = Object.keys(idMap);
      if (videoIds.length === 0) continue;

      try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'status,snippet',
            id: videoIds.join(','),
            key: apiKey
          },
          timeout: 10000
        });

        const foundVideos = response.data?.items || [];
        const foundIds = new Set(foundVideos.map(v => v.id));

        // Logic:
        // 1. If ID not in response -> Deleted or invalid ID
        // 2. If ID in response but status.privacyStatus !== 'public' -> Private
        // 3. Else -> Active

        const updates = [];

        // Handle videos returned by API
        for (const vid of foundVideos) {
          const reel = idMap[vid.id];
          const privacyStatus = vid.status?.privacyStatus;
          
          let newStatus = 'active';
          let isValid = true;

          if (privacyStatus !== 'public') {
            newStatus = 'private';
            isValid = false;
          }

          if (reel.youtubeLinkStatus !== newStatus || reel.isYouTubeLinkValid !== isValid) {
            updates.push(Reel.updateOne(
              { _id: reel._id },
              { $set: { youtubeLinkStatus: newStatus, isYouTubeLinkValid: isValid } }
            ));
            if (!isValid) {
              invalidReelsForNotification.push({ id: reel._id, title: reel.title, reason: newStatus });
            }
          }
        }

        // Handle videos missing from API (Deleted or Invalid)
        for (const vidId of videoIds) {
          if (!foundIds.has(vidId)) {
            const reel = idMap[vidId];
            if (reel.youtubeLinkStatus !== 'deleted' || reel.isYouTubeLinkValid !== false) {
              updates.push(Reel.updateOne(
                { _id: reel._id },
                { $set: { youtubeLinkStatus: 'deleted', isYouTubeLinkValid: false } }
              ));
              invalidReelsForNotification.push({ id: reel._id, title: reel.title, reason: 'deleted' });
            }
          }
        }

        if (updates.length > 0) {
          await Promise.all(updates);
          console.log(`[YouTubeLinkValidator] Batch ${Math.floor(i/batchSize) + 1}: Updated ${updates.length} reels.`);
        }

      } catch (batchErr) {
        console.error(`[YouTubeLinkValidator] Error processing batch starting at index ${i}:`, batchErr.message);
        // Continue to next batch
      }

      // Small delay between batches to respect quotas
      if (i + batchSize < reels.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Send notification to admins if any reels became invalid
    if (invalidReelsForNotification.length > 0) {
      try {
        const count = invalidReelsForNotification.length;
        await notificationService.sendBulkNotification({
          type: 'reel_status',
          title: 'Invalid YouTube Link Reels Detected',
          message: `${count} reel${count > 1 ? 's are' : ' is'} no longer available on YouTube. Please review and manage in Admin Panel.`,
          actionUrl: `/admin/reels?onlyBroken=true`,
          metadata: { invalidReelsCount: count }
        }, 'admins', [], io);
      } catch (notifErr) {
        console.error('[YouTubeLinkValidator] Admin notification failed:', notifErr.message);
      }
    }

    console.log('[YouTubeLinkValidator] Validation complete.');

  } catch (err) {
    console.error('[YouTubeLinkValidator] Critical validation error:', err.message);
  }
}
