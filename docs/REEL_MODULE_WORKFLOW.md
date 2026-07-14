# Reel / Short Video Module — Workflow & Design (Pre-Implementation)

**Status:** Implemented  
**Last updated:** 2025-03-07

---

## 1. Objective (Summary)

A **short-video (reel)** system where:

- **Vendors/Users** upload promotional short videos (products/properties).
- **Admin** moderates (approve / reject / delete); only approved reels are published.
- **Platform** temporarily shows approved reels for **24 hours** (with likes/comments), then **removes** them from the DB and feed.
- **YouTube** is the permanent host: approved reels are uploaded to YouTube and organized in **category-based playlists**. After 24h, discovery continues via these playlists (embedded or linked).

**Goals:** Lightweight DB, no long-term video storage on platform, scalable streaming via YouTube, fresh 24h feed, organized long-term discovery by category.

---

## 2. Roles & Permissions

| Role | Can do |
|------|--------|
| **Vendor / User** | Upload reel (with product/property ref, category, title/description). Reel is **not** public until approved. |
| **Admin** | View moderation queue, Approve / Reject / Delete reels. Only **Approve** triggers YouTube upload + playlist add + platform visibility. |
| **Platform viewer** | Browse reel feed (only approved, within 24h), like, comment. After 24h: discover via category pages showing YouTube playlists. |

---

## 3. High-Level Workflow

```
[Vendor/User] uploads reel
       ↓
  Reel saved as DRAFT/PENDING (not public)
       ↓
[Admin] sees reel in Moderation Panel
       ↓
  Admin: Approve | Reject | Delete
       ↓
  If APPROVE:
    1. Upload video to YouTube (API)
    2. Create/find category playlist on YouTube
    3. Add video to that playlist
    4. Save YouTube video ID + playlist ID in DB
    5. Mark reel as APPROVED, set approvedAt = now
    6. Reel becomes visible in platform feed
       ↓
  For next 24 hours:
    - Reel appears in feed
    - Users can watch, like, comment (stored on platform)
       ↓
  After 24 hours (cron/scheduler):
    - Reel marked EXPIRED or removed from “active” set
    - Platform likes/comments for this reel cleared (or archived if needed)
    - Reel removed from platform feed
    - Video remains on YouTube in category playlist
       ↓
  Long-term: category pages show embedded/linked YouTube playlist for that category
```

---

## 4. Detailed Workflows

### 4.1 Reel Upload (Vendor / User)

1. User opens “Upload Reel” (from vendor dashboard or user profile).
2. User selects/records short video (file upload; max duration e.g. 60–90 seconds).
3. User fills metadata:
   - **Title** (required)
   - **Description** (optional)
   - **Category** (required) — maps to B2B category → YouTube playlist (e.g. Saree, Property, Footwear).
   - **Product reference** (optional) — product ID or “shop listing” ID.
   - **Property reference** (optional) — property ID.
   - **Vendor/User** — from auth context.
4. Backend stores:
   - Video file temporarily (or direct upload to YouTube in a “staging” way; see implementation note below).
   - Status: `pending` (or `draft`).
   - Metadata + uploaderId, uploaderType (vendor/user), timestamps.
5. Reel **does not** appear in public feed or in any public API until approved.

**Outcome:** Reel exists only in admin moderation queue.

---

### 4.2 Admin Moderation

1. Admin opens “Reel Moderation” (or “Content Moderation” → Reels).
2. List shows all reels with status `pending`, newest first (optional filters: category, date, uploader).
3. Admin can:
   - **Preview** the video.
   - **Approve** → triggers “Publishing to YouTube” flow (see 4.3).
   - **Reject** → status = `rejected`; optional reason stored; no YouTube upload; reel never goes to feed.
   - **Delete** → remove from DB (and optionally delete file if still stored on platform).
4. Only **Approve** changes status to `approved` and triggers YouTube publish + feed visibility.

**Outcome:** Queue decreases; approved reels move to “Publishing” pipeline; rejected/deleted reels never go public.

---

### 4.3 Publishing Approved Reels to YouTube

1. **Trigger:** Admin clicks “Approve” on a reel.
2. **Upload to YouTube:**
   - Use YouTube Data API v3 (e.g. `videos.insert` with `uploadType=multipart` or resumable upload for larger files).
   - Title, description, visibility (e.g. unlisted or public per product requirement), tags if needed.
3. **Category playlist:**
   - Map reel’s **category** (e.g. B2B category name) to a YouTube playlist:
     - If playlist exists (stored in DB or config): use its `playlistId`.
     - If not: create via `playlists.insert`, store `playlistId` for that category.
   - Add the new video to the playlist: `playlistItems.insert`.
4. **Save in DB:**
   - Reel record: `youtubeVideoId`, `youtubePlaylistId`, `approvedAt`, status = `approved`.
5. **Feed visibility:** Reel is included in “active reels” (approved + within 24h of `approvedAt`).

**Outcome:** Video lives on YouTube in the right category playlist; platform has minimal metadata and YouTube IDs; reel is visible in feed.

---

### 4.4 Platform Reel Feed (First 24 Hours)

1. **Feed API** returns reels where: `status === 'approved'` and `approvedAt` is within last 24 hours (e.g. `approvedAt >= now - 24h`).
2. Sort by `approvedAt` desc (newest first); optional: category filter, pagination.
3. Each reel payload includes:
   - YouTube video ID (for embedded player or redirect).
   - Title, description, category.
   - Product/property link (if any).
   - Uploader (vendor/store name or user).
   - **Platform-only:** like count, comment count (and comments if needed for 24h).
4. **Interactions (24h only):**
   - **Like:** Store in `ReelLike` (reelId, userId, timestamps). Idempotent (one like per user per reel).
   - **Comment:** Store in `ReelComment` (reelId, userId, text, timestamps). Shown only while reel is active.

**Outcome:** Users get a vertical, TikTok-style feed of recent approved reels and can like/comment during the 24h window.

---

### 4.5 24-Hour Lifecycle & Expiration

1. **Definition of “active”:** Reel is in feed iff `status === 'approved'` and `approvedAt >= now - 24 hours`.
2. **Expiration job (cron):**
   - Run periodically (e.g. every 15–60 minutes).
   - Find reels where `approvedAt < now - 24h` and still marked as “active” (e.g. not yet expired).
   - For each:
     - Set status to `expired` (or remove from “active” view; keep record for analytics/audit if required).
     - Delete or archive **platform** likes and comments for this reel (so DB stays small).
   - Reel no longer returned by feed API.
3. **What remains:**
   - Reel record can keep: `youtubeVideoId`, `youtubePlaylistId`, `approvedAt`, category, product/property ref (for analytics or “view on YouTube” links).
   - Video remains on YouTube in the category playlist.

**Outcome:** Feed stays fresh; platform DB does not grow with old engagement data; long-term discovery is via YouTube playlists.

---

### 4.6 Category Discovery After Expiration

1. **Category page** (e.g. “Saree”, “Property”, “Footwear”) shows a section like “Promotional reels” or “Videos”.
2. **Source:** YouTube playlist for that category (playlist ID stored when first reel of that category was approved).
3. **Implementation:** Embed YouTube playlist (iframe) or link to “View playlist on YouTube”.
4. No platform-hosted video; no re-upload. Just embed/link using `youtubePlaylistId`.

**Outcome:** Users discover past and current videos by category without the platform storing or streaming video.

---

## 5. Data Model (Conceptual)

- **Reel**
  - `_id`, uploaderId, uploaderType (vendor/user), title, description, categoryId (ref to B2BCategory or name).
  - productId (optional), propertyId (optional).
  - Video: either temporary file path (until upload) or direct upload to YouTube from client (see below).
  - Status: `pending` | `approved` | `rejected` | `expired`.
  - `approvedAt`, `approvedBy` (admin id).
  - `youtubeVideoId`, `youtubePlaylistId`.
  - Timestamps.

- **ReelLike** (optional collection or embedded)
  - reelId, userId, createdAt. Only for reels that are still “active” (within 24h); cleared on expiration.

- **ReelComment**
  - reelId, userId, text, createdAt. Same: only while active; cleared or archived on expiration.

- **Category → YouTube playlist mapping** (config or collection)
  - categoryId or categoryName → youtubePlaylistId. Created when first reel of that category is approved.

---

## 6. YouTube Integration Notes

- **Quota:** YouTube Data API v3 has daily quota. Uploads cost more quota. Plan for quota increase if many reels per day.
- **Upload flow options:**
  - **A)** Backend receives file, then uploads to YouTube (simpler for client; server needs to handle file size and timeout).
  - **B)** Client uploads directly to YouTube (e.g. resumable upload) with backend providing a one-time upload URL/token (more complex, saves server bandwidth).
- **Playlists:** One playlist per (B2B) category; create on first use; reuse for all future reels in that category.

---

## 7. Implementation Phases (Proposed)

| Phase | Scope | Deliverables |
|-------|--------|--------------|
| **1. Backend – Reel CRUD & Moderation** | Reel model, upload (temp storage or link to YouTube), status flow, admin APIs (list pending, approve, reject, delete) | APIs for submit reel, list reels (admin), approve/reject/delete |
| **2. YouTube Publish** | On approve: upload video, create/find playlist by category, add to playlist, save IDs | YouTube upload + playlist wiring; category–playlist map |
| **3. Platform Feed & 24h Rule** | Feed API (approved + within 24h); like/comment APIs; cron to expire reels and clear engagement | Feed API, like/comment, cron job |
| **4. Admin UI** | Moderation panel: list, preview, approve/reject/delete | Admin reel moderation page(s) |
| **5. Vendor/User Upload UI** | Upload form (video + metadata + category + product/property ref) | Upload reel screen(s) |
| **6. Public Reel Feed UI** | Vertical feed (e.g. React), embed YouTube player, like/comment | Reel feed page + embeds |
| **7. Category Playlist Discovery** | Category page section with embedded YouTube playlist | Category pages show playlist by category |

---

## 8. Open Decisions (For Your Approval)

1. **Video storage before approval:** Store uploaded file on platform temporarily (e.g. Cloudinary/S3) until approve → then upload to YouTube and delete, **or** stream upload directly to YouTube after approval (admin triggers “upload to YouTube” with file from our storage)? **Recommendation:** Temporary platform storage (or Cloudinary) for pending reels; on Approve, backend uploads that file to YouTube, then can delete from platform.
2. **Max reel duration:** e.g. 60 or 90 seconds (to be enforced in UI and optionally in backend).
3. **Visibility on YouTube:** Public vs unlisted for uploaded videos (affects discoverability on YouTube).
4. **Reel record after 24h:** Keep reel row with `expired` and YouTube IDs for analytics/“View on YouTube” links, or soft-delete and only keep category–playlist mapping?
5. **Comments:** Keep comment count for analytics after 24h or fully delete? Recommendation: delete for simplicity; optional “archive count” later.

---

## 9. How to check if a reel was uploaded to YouTube

### In the app (Admin)

1. **Admin → Reel Moderation** → open the **Approved** tab (or **All**).
2. For each approved reel:
   - If you see **"View on YouTube"** (red link), the reel was published to YouTube. Click it to open the video on YouTube.
   - If you see **"YouTube upload failed"**, the video was approved but the YouTube upload failed (e.g. credentials not set or API error). The reel still plays from the platform (Cloudinary) for 24 hours.
3. In the **Preview** modal for an approved reel, the same **View on YouTube** link or **YouTube upload failed** message is shown.

### In the API

- After **Approve**, the response includes:
  - `data.reel.youtubeVideoId` — set if upload succeeded; use in `https://www.youtube.com/watch?v={youtubeVideoId}`.
  - `data.reel.youtubePlaylistId` — playlist for the category.
  - `data.youtubeUploadFailed` — `true` if upload failed.
  - `data.youtubeUploadError` — error message when upload failed.
- **GET /api/admin/reels** (or **GET /api/admin/reels/:id**) returns each reel with `youtubeVideoId`, `youtubePlaylistId`, `youtubeUploadFailed`, `youtubeUploadError`.

### On YouTube

1. **YouTube Studio** (studio.youtube.com) → **Content** → check **Videos** for the new video (title matches the reel title).
2. **Channel** → **Playlists** → find the playlist named like **"{Category} - Product Reels"** (e.g. "Saree - Product Reels"). Open it to see all reels for that category.
3. Direct link: if you have the video ID from the app, open `https://www.youtube.com/watch?v={youtubeVideoId}`.

### If YouTube upload often fails

- Ensure **YOUTUBE_CLIENT_ID**, **YOUTUBE_CLIENT_SECRET**, and **YOUTUBE_REFRESH_TOKEN** are set in the backend `.env`.
- The refresh token must be from an OAuth2 flow with the **YouTube Data API v3** and **YouTube upload** scope.
- Check backend logs when you click Approve for the exact error (e.g. quota, invalid token, or “credentials not configured”).

---

## 10. Approval Checklist (pre-implementation)

Please confirm or adjust:

- [ ] **Workflow:** Upload → Moderation → Approve → YouTube publish + playlist → 24h feed → Expire → Category playlist discovery. Agree?
- [ ] **Roles:** Vendor/User upload; Admin approve/reject/delete; Viewers see feed and like/comment. Agree?
- [ ] **24h rule:** Reel visible only 24h after approval; then removed from feed and engagement cleared. Agree?
- [ ] **Category playlists:** One YouTube playlist per B2B category; auto-created when first reel of that category is approved. Agree?
- [ ] **Phases:** Implement in order 1 → 7 above, or change order/scope?
- [ ] **Open decisions:** Your choices for storage before approval, max duration, YouTube visibility, and post-24h record handling?

Once you confirm (and optionally fill the open decisions), implementation can proceed according to this workflow.
