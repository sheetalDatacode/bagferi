import cron from 'node-cron';
import Reel from '../models/Reel.model.js';
import ReelLike from '../models/ReelLike.model.js';
import ReelComment from '../models/ReelComment.model.js';
import { validateYouTubeLinkReels } from '../services/youtubeLinkValidator.service.js';

/**
 * Reel expiry cron is now disabled.
 * We no longer expire reels after 24 hours; all approved reels remain visible.
 * This function is kept as a no-op for backwards compatibility.
 */
async function expireReels() {
  // no-op
}

let expiryTask = null;
let validationTask = null;

export function startReelExpiryCron() {
  if (expiryTask) return;
  expiryTask = cron.schedule('*/15 * * * *', expireReels, { scheduled: true });
}

export function stopReelExpiryCron() {
  if (expiryTask) {
    expiryTask.stop();
    expiryTask = null;
  }
}

/**
 * Periodically validates YouTube link reels.
 * Runs every 8 hours.
 */
export function startYouTubeLinkValidationCron(io = null) {
  if (validationTask) return;
  validationTask = cron.schedule('0 */8 * * *', () => validateYouTubeLinkReels(io), { scheduled: true });
  console.log('✅ YouTube link validation cron started (Every 8 hours)');
}

export function stopYouTubeLinkValidationCron() {
  if (validationTask) {
    validationTask.stop();
    validationTask = null;
  }
}
