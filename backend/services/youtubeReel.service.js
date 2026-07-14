/**
 * Publish reel video to YouTube and add to category playlist.
 * Requires: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 * (Optional: YOUTUBE_VIDEO_PRIVACY=public)
 *
 * If not configured, throws so controller can set youtubeUploadFailed and still approve reel.
 *
 * Why it may work locally but fail on live (e.g. dealingindia.com):
 * 1. Env vars not set on production: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 * 2. Refresh token was generated for local OAuth redirect; production may need its own token
 * 3. reel.videoUrl must be reachable by the server (e.g. Cloudinary URL). Localhost or
 *    signed-only URLs that the production server cannot fetch will cause downloadToTemp to fail.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YouTubePlaylistMap from '../models/YouTubePlaylistMap.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureYouTubeConfigured() {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('YouTube credentials not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)');
  }
}

function formatAxiosError(err) {
  if (!err) return 'Unknown error';
  const status = err.response?.status;
  const statusText = err.response?.statusText;
  const data = err.response?.data;
  const dataStr = typeof data === 'string' ? data : data ? JSON.stringify(data) : '';
  const base = err.message || 'Request failed';
  const suffix = [status ? `status=${status}` : null, statusText || null, dataStr || null]
    .filter(Boolean)
    .join(' | ');
  return suffix ? `${base} (${suffix})` : base;
}

/**
 * Get OAuth2 access token using refresh token (caller should cache this)
 */
async function fetchAccessToken() {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('YouTube credentials not configured');
  }
  const res = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
  );
  if (!res.data?.access_token) throw new Error('Failed to get YouTube access token');
  return res.data.access_token;
}

/**
 * Download video from URL to temp file
 */
async function downloadToTemp(videoUrl) {
  const res = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000, maxContentLength: 100 * 1024 * 1024 });
  const tmpDir = path.join(__dirname, '..', 'upload', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  fs.writeFileSync(tmpPath, res.data);
  return tmpPath;
}

/**
 * Upload video to YouTube via resumable upload API
 * https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */
async function uploadVideoToYouTube(accessToken, filePath, title, description) {
  const fileSize = fs.statSync(filePath).size;
  const metadata = {
    snippet: { title: title.slice(0, 100), description: (description || '').slice(0, 5000) },
    status: { privacyStatus: process.env.YOUTUBE_VIDEO_PRIVACY || 'public' },
  };

  const initRes = await axios.post(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': fileSize,
        'X-Upload-Content-Type': 'video/mp4',
      },
      maxRedirects: 0,
      validateStatus: (s) => s === 200,
      timeout: 10000,
    }
  );
  const uploadUrl = initRes.headers?.location;
  if (!uploadUrl) throw new Error('YouTube did not return upload URL');

  const fileBuffer = fs.readFileSync(filePath);
  const uploadRes = await axios.put(uploadUrl, fileBuffer, {
    headers: {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
    validateStatus: (s) => s === 200,
  });
  if (!uploadRes.data?.id) throw new Error('YouTube upload response missing video id');
  return uploadRes.data.id;
}

/**
 * Create YouTube playlist and return playlistId
 */
async function createPlaylist(accessToken, title) {
  const res = await axios.post(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      snippet: { title: title.slice(0, 150), description: `Category: ${title}` },
      status: { privacyStatus: 'public' },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  if (!res.data?.id) throw new Error('Failed to create YouTube playlist');
  return res.data.id;
}

/**
 * Add video to playlist
 */
async function addVideoToPlaylist(accessToken, playlistId, videoId) {
  await axios.post(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
}

/**
 * Fetch playlist items from YouTube (read-only). Used when reels come from YouTube only (no DB).
 * Requires YOUTUBE_REELS_PLAYLIST_ID to be set.
 * @param {string} playlistId - YouTube playlist ID
 * @param {string} [pageToken] - nextPageToken for pagination
 * @param {number} [maxResults=20] - items per page (max 50)
 * @returns {Promise<{ items: Array<{ id, youtubeVideoId, title, description, thumbnailUrl }>, nextPageToken?: string }>}
 */
export async function fetchPlaylistItems(playlistId, pageToken, maxResults = 20) {
  ensureYouTubeConfigured();
  const accessToken = await fetchAccessToken();
  const params = {
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: Math.min(50, Math.max(1, maxResults)),
  };
  if (pageToken) params.pageToken = pageToken;

  const res = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
    params,
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });

  const rawItems = res.data?.items || [];
  const items = rawItems
    .filter((item) => item.snippet?.title && item.contentDetails?.videoId)
    .map((item) => {
      const videoId = item.contentDetails.videoId;
      const thumb = item.snippet?.thumbnails?.maxres?.url
        || item.snippet?.thumbnails?.high?.url
        || item.snippet?.thumbnails?.medium?.url
        || item.snippet?.thumbnails?.default?.url;
      return {
        id: videoId,
        youtubeVideoId: videoId,
        title: item.snippet.title || 'Reel',
        description: item.snippet.description || '',
        thumbnailUrl: thumb || null,
        uploaderName: item.snippet?.channelTitle || '',
      };
    });

  return {
    items,
    nextPageToken: res.data?.nextPageToken || null,
  };
}

/**
 * Fetch a single video by YouTube video ID (for shared links). No DB.
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<{ id, youtubeVideoId, title, description, thumbnailUrl, uploaderName } | null>}
 */
export async function fetchVideoById(videoId) {
  if (!videoId) return null;
  ensureYouTubeConfigured();
  const accessToken = await fetchAccessToken();
  const res = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: { part: 'snippet', id: videoId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10000,
  });
  const raw = res.data?.items?.[0];
  if (!raw?.snippet) return null;
  const thumb = raw.snippet.thumbnails?.maxres?.url
    || raw.snippet.thumbnails?.high?.url
    || raw.snippet.thumbnails?.medium?.url
    || raw.snippet.thumbnails?.default?.url;
  return {
    id: raw.id,
    youtubeVideoId: raw.id,
    title: raw.snippet.title || 'Reel',
    description: raw.snippet.description || '',
    thumbnailUrl: thumb || null,
    uploaderName: raw.snippet?.channelTitle || '',
  };
}

/**
 * Publish reel to YouTube: upload video, get or create category playlist, add video to playlist.
 * @param {Object} reel - Reel document with videoUrl, title, description, categoryName
 * @returns {Promise<{ youtubeVideoId, youtubePlaylistId }>}
 */
export async function publishReelToYouTube(reel) {
  ensureYouTubeConfigured();
  const accessToken = await fetchAccessToken();
  let tmpPath;
  try {
    console.log(`[YouTube upload] Downloading video from: ${reel.videoUrl}`);
    tmpPath = await downloadToTemp(reel.videoUrl);
    const youtubeVideoId = await uploadVideoToYouTube(
      accessToken,
      tmpPath,
      reel.title,
      reel.description
    );

    const categoryName = (reel.categoryName || '').trim() || 'General';
    let map = await YouTubePlaylistMap.findOne({ categoryName: new RegExp('^' + categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    let playlistId;
    if (map?.youtubePlaylistId) {
      playlistId = map.youtubePlaylistId;
    } else {
      playlistId = await createPlaylist(accessToken, `${categoryName} - Product Reels`);
      await YouTubePlaylistMap.create({
        categoryName,
        youtubePlaylistId: playlistId,
        youtubePlaylistTitle: `${categoryName} - Product Reels`,
      });
    }

    await addVideoToPlaylist(accessToken, playlistId, youtubeVideoId);

    return { youtubeVideoId, youtubePlaylistId: playlistId };
  } catch (err) {
    // Include full YouTube/HTTP error for admin visibility
    throw new Error(formatAxiosError(err));
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (_) { }
    }
  }
}

/**
 * Delete video from YouTube by ID
 * @param {string} videoId
 */
export async function deleteVideoFromYouTube(videoId) {
  if (!videoId) return;
  ensureYouTubeConfigured();
  const accessToken = await fetchAccessToken();
  try {
    await axios.delete('https://www.googleapis.com/youtube/v3/videos', {
      params: { id: videoId },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });
  } catch (err) {
    console.error('[YouTube service] Video delete failed:', err.response?.data || err.message);
    // We don't throw here so that the DB deletion can still proceed
  }
}
