# Deployment & Checking Errors on Production

## 1. Do you need to restart the backend?

**Yes.** After you pull new code on the server, the running Node process is still using the old code. You must restart the backend so it loads the updated files.

---

## 2. Typical deploy workflow

```bash
# On your local machine: push your code
git add .
git commit -m "Your message"
git push origin main   # or your branch name

# On the server: pull and restart
cd /path/to/dealing-india   # your project root on server

# Pull latest code
git pull origin main

# If package.json or backend/package.json changed, install deps
npm install
cd backend && npm install && cd ..

# Restart the backend (see below for how you run it)
```

---

## 3. How to restart the backend on the server

It depends how you run Node on production.

### Option A: Running with PM2 (recommended for production)

```bash
cd /path/to/dealing-india/backend
pm2 restart all
# or restart by app name, e.g.:
# pm2 restart appzeto-backend
```

If you haven’t set up PM2 yet:

```bash
npm install -g pm2
cd backend
pm2 start server.js --name appzeto-backend
pm2 save
pm2 startup   # so it restarts on server reboot
```

### Option B: Running with `npm start` or `node server.js` in a terminal/screen

- Stop the process (Ctrl+C or close the terminal).
- Start again:

```bash
cd /path/to/dealing-india/backend
npm start
# or: node server.js
```

If you use `screen` or `tmux`, attach to the session, stop the process, then run `npm start` again.

### Option C: Systemd service

```bash
sudo systemctl restart your-backend-service-name
```

### Option D: Docker

```bash
docker-compose build backend
docker-compose up -d backend
# or whatever your compose service name is
```

---

## 4. How to check errors on production

### A. Backend logs (Node / PM2)

- **If you use PM2:**
  ```bash
  pm2 logs
  # or only your app:
  pm2 logs appzeto-backend
  # last 200 lines:
  pm2 logs --lines 200
  ```
  When a reel is approved and YouTube upload fails, you’ll see something like:
  `[Reel approve] YouTube upload failed: <reason> { reelId, videoUrl: 'set'|'missing' }`

- **If you run with `node server.js` or `npm start`:**
  Errors go to the terminal (stdout/stderr). If you run in `screen`/`tmux`, check that session. If you redirect output to a file, e.g. `node server.js >> /var/log/app.log 2>&1`, open that file:
  ```bash
  tail -f /var/log/app.log
  ```

### B. Admin UI (reel moderation)

- Open **https://www.dealingindia.com/admin/reels** (or your admin URL).
- For reels that show “YouTube upload failed”, hover the orange message (or open the reel) — the `youtubeUploadError` is shown in the tooltip/title and tells you why it failed (e.g. “YouTube credentials not configured”, “Failed to get YouTube access token”, “request to … videoUrl failed”).

### C. Quick checklist when YouTube upload fails on production

1. **Env vars on server**  
   On the server, in the same environment where the backend runs, ensure:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REFRESH_TOKEN`  
   (e.g. in `backend/.env` or in your PM2/systemd env.)

2. **Logs**  
   Run `pm2 logs` (or your log command) and approve a reel again; read the `[Reel approve] YouTube upload failed:` line.

3. **Video URL**  
   Ensure `reel.videoUrl` is a URL the server can download (e.g. Cloudinary). If it’s localhost or a URL only your laptop can reach, the server will fail to download and YouTube upload will fail.

---

## 5. Frontend (optional)

If you only change backend code, no need to restart the frontend. If you change frontend code:

- **Static build:** Rebuild and redeploy (e.g. `npm run build` then copy `dist/` to your web server or deploy to your host).
- **Dev server:** Restart the process that runs `npm run dev` (not recommended for production).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Push code from local → `git push` |
| 2 | On server: `git pull` |
| 3 | If dependencies changed: `npm install` (root and/or `backend`) |
| 4 | **Restart the backend** (PM2: `pm2 restart all`, or stop/start your Node process) |
| 5 | Check errors in **PM2 logs** (`pm2 logs`) or **Admin Reels** page (tooltip on “YouTube upload failed”) |
