# Spotify Listening History

A local Next.js app that tracks your Spotify listening habits: what you play, how much, and how
it breaks down by month and year.

## How the data works

Spotify's live API only exposes your **last ~50 played tracks**. There's no live endpoint for
full historical stats. This app combines two sources:

1. **Extended Streaming History import** — a one-time (or occasional) import of the full history
   file Spotify emails you on request. This is the only way to get accurate stats going back
   years.
2. **Live sync** — while this app is running, it polls "recently played" periodically and stores
   new plays going forward, so history keeps accumulating after the import goes stale.

## Setup

### 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an
   app (any name/description).
2. In **Settings**, add this exact Redirect URI:
   ```
   http://127.0.0.1:3000/api/auth/callback
   ```
3. Copy the **Client ID** and **Client Secret**.

### 2. Configure environment

Edit `.env.local` (already created, gitignored) and fill in:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
```

### 3. Run it

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) (use `127.0.0.1`, not `localhost` — it must
match the redirect URI registered with Spotify) and click **Connect with Spotify**.

### 4. Import your full history (recommended)

1. Go to [spotify.com/account/privacy](https://www.spotify.com/account/privacy/) and request
   **Extended streaming history**. Spotify emails a ZIP within a few days.
2. Unzip it, then on the app's **Import history** page upload the
   `Streaming_History_Audio_*.json` (or `endsong_*.json`) files.

## Keeping history current while the app is closed

The dashboard auto-syncs every 15 minutes while a browser tab is open, and there's a manual
**Sync now** button. To keep collecting plays even when you're not looking at the app, schedule a
periodic call to the sync endpoint, e.g. with Windows Task Scheduler running every 30 minutes:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/sync
```

(The app/dev server needs to be running for this to work — it's a local app, not a hosted
service.)

## Notes / limitations

- Spotify's "recently played" endpoint doesn't report how much of a track was actually played, so
  live-synced plays are counted using the track's full duration. Imported history uses the real
  `ms_played` value from Spotify's export, which is more accurate.
- Data is stored locally in `data/spotify.db` (SQLite via `sql.js`), gitignored — it's your
  personal listening history and never leaves your machine.
- Importing the same export file twice is safe — plays are deduplicated by track + timestamp.

## Stack

Next.js (App Router) + TypeScript + Tailwind, SQLite (`sql.js`, no native build step) for storage,
Recharts for the monthly chart.
