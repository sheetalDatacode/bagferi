/**
 * One-time script to get YouTube OAuth2 refresh token.
 * Run: node scripts/get-youtube-refresh-token.js
 *
 * Prerequisites:
 * 1. Create OAuth 2.0 credentials in Google Cloud Console (Web or Desktop).
 * 2. Enable YouTube Data API v3.
 * 3. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env (or below).
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:9765/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:9765`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<h2>No code in URL</h2><p>Copy the <strong>full URL</strong> from the browser address bar and paste it in the terminal where the script is running.</p>'
    );
    return;
  }

  let refreshToken = null;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenRes.json();
    refreshToken = data.refresh_token;
  } catch (e) {
    console.error('Token exchange error:', e.message);
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (refreshToken) {
    res.end(
      `<h2>Success</h2><p>Refresh token received. Check the terminal where you ran the script for the value to put in .env as YOUTUBE_REFRESH_TOKEN.</p>`
    );
    console.log('\n✅ Refresh token (add to .env as YOUTUBE_REFRESH_TOKEN):\n');
    console.log(refreshToken);
    console.log('\n');
  } else {
    res.end('<h2>Failed to get refresh token</h2><p>Check terminal for errors. Ensure redirect URI in Google Cloud is http://localhost:9765/oauth2callback</p>');
  }
  server.close();
});

server.listen(9765, () => {
  console.log('\n1. Open this URL in your browser (use the Google account that owns your YouTube channel):\n');
  console.log(authUrl);
  console.log('\n2. After signing in, you will be redirected to localhost. If the page shows "Cannot GET", copy the FULL URL from the browser and paste it here.');
  console.log('   Alternatively, the script will read the code from the redirect automatically if you just open the URL above.\n');
});
