# YouTube Reels Upload – Setup Guide

## Why `youtubeUploadFailed` is true

The backend needs **three environment variables** to upload reels to YouTube. If any is missing, it still approves the reel but sets `youtubeUploadFailed: true` and the video only plays from your platform (Cloudinary) for 24 hours.

Required variables:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

---

## Important: YouTube API does not use email/password

The YouTube Data API v3 uses **OAuth 2.0**, not your YouTube/Google email and password. The backend never sees your password. You:

1. Create a **Google Cloud project** and get **Client ID** and **Client Secret**.
2. Sign in **once** with the **Google account that owns your YouTube channel** and get a **refresh token**.
3. Put Client ID, Client Secret, and refresh token in your backend `.env`.

After that, the server can upload videos to **that channel** without you signing in again.

---

## Which YouTube channel is used?

Videos are uploaded to **the YouTube channel linked to the Google account you use when getting the refresh token**.

- **Channel name** = whatever you set when you created the channel (e.g. “Dealing India”, “My Brand Reels”, etc.). You can create or rename the channel at [youtube.com](https://www.youtube.com).
- **One Google account** = one YouTube channel (by default). So the “channel” is simply the channel of the account you use in the OAuth step below.

---

## Step-by-step setup

### 1. Create a YouTube channel (if you don’t have one)

1. Sign in to YouTube with your **Google account** (the one you’ll use for the app).
2. Go to [youtube.com](https://www.youtube.com) → click your avatar → **Create a channel** (or use an existing channel).
3. Set the **channel name** (e.g. “Dealing India Reels”). This is the channel where reels will be uploaded.

### 2. Create a Google Cloud project and enable the API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. “Dealing India”) or select an existing one.
3. In the left menu: **APIs & Services** → **Library**.
4. Search for **YouTube Data API v3** → open it → click **Enable**.

### 3. Create OAuth 2.0 credentials

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
2. If asked, set **Application type** = “Web application” (or “Desktop” if you prefer; both work).
3. **Name**: e.g. “Dealing India Reels”.
4. If Web application: add **Authorized redirect URI**:  
   `http://localhost:9765/oauth2callback`  
   (This is used by the script in step 4 to receive the auth code.)
5. Click **Create**.
6. Copy the **Client ID** and **Client Secret** and keep them safe.

### 4. Get the refresh token (one-time)

You must sign in once with the **Google account that owns the YouTube channel** so Google gives your app a refresh token.

**Option A – Using the provided script (recommended)**

1. In Google Cloud Console, add redirect URI: `http://localhost:9765/oauth2callback`
2. In backend `.env`, set:
   - `YOUTUBE_CLIENT_ID` = your Client ID  
   - `YOUTUBE_CLIENT_SECRET` = your Client Secret  
3. From the backend folder run: `node scripts/get-youtube-refresh-token.js`
4. A URL will be printed. Open it in a browser, sign in with your **YouTube/Google account**, allow access.
5. You will be redirected to a page that may show “Cannot GET /oauth2callback” or similar. **Copy the full URL from the browser address bar** and paste it into the script when it asks.
6. The script will print your **refresh token**. Put it in `.env` as `YOUTUBE_REFRESH_TOKEN`.

**Option B – Manual (auth code flow)**

1. Build this URL (replace `YOUR_CLIENT_ID` and `YOUR_REDIRECT_URI`):

   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload+https://www.googleapis.com/auth/youtube+https://www.googleapis.com/auth/youtube.force-ssl
   ```

2. Open it in a browser, sign in with your YouTube Google account, allow.
3. After redirect, the URL will contain `?code=...`. Copy the full `code` value.
4. Exchange the code for tokens (e.g. with a small script or Postman):

   ```http
   POST https://oauth2.googleapis.com/token
   Content-Type: application/x-www-form-urlencoded

   code=PASTE_CODE_HERE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=YOUR_REDIRECT_URI&grant_type=authorization_code
   ```

5. From the JSON response, copy `refresh_token` and set it as `YOUTUBE_REFRESH_TOKEN` in `.env`.

### 5. Put everything in backend `.env`

Add (or update) in your backend `.env`:

```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REFRESH_TOKEN=your_refresh_token_here
```

Optional:

```env
YOUTUBE_VIDEO_PRIVACY=public
```

(`public` = anyone can see; `unlisted` = only people with the link.)

### 6. Restart the backend

Restart your Node server so it loads the new env vars. After that, when you **Approve** a reel, the backend will upload it to YouTube and set `youtubeVideoId` and `youtubePlaylistId`; `youtubeUploadFailed` will be false (unless there’s another error, e.g. quota).

---

## Summary

| Question | Answer |
|----------|--------|
| Why `youtubeUploadFailed` true? | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, or `YOUTUBE_REFRESH_TOKEN` is missing (or invalid) in `.env`. |
| Can I use my YouTube email/password? | No. The API uses OAuth 2.0. You use your Google account once to get a refresh token, then the server uses that token. |
| What is the “name of the channel”? | The channel **name** is whatever you set in YouTube for the channel (e.g. “Dealing India Reels”). The **account** used is the one you sign in with when getting the refresh token. |
| Where do videos go? | To the YouTube channel of the Google account you used in the OAuth step. |
