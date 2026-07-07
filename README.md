# YTDLnis PWA

A Progressive Web App clone of [YTDLnis](https://github.com/deniscerri/ytdlnis) — a powerful yt-dlp frontend. Built with React + Vite (frontend) and Node.js + Express (backend).

## Features

- 🎬 Download videos & audio from 1000+ sites (YouTube, SoundCloud, TikTok, etc.)
- 📥 Real-time progress via Server-Sent Events
- 🗂️ Tabbed queue: Active / Queued / Completed / Errored / Cancelled
- 📋 Download history (IndexedDB)
- ⚙️ Format picker with full yt-dlp format list
- 📱 Installable as a PWA
- 🌑 Dark space-themed UI

## Requirements

- [Node.js](https://nodejs.org) 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) in your PATH

## Setup

```bash
# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

## Running

```bash
# Start backend (port 4123)
cd backend && node server.js

# Start frontend (port 5173) — in a new terminal
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

On Windows you can also double-click `start.bat`.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (dark theme) |
| Local DB | Dexie.js (IndexedDB) |
| Backend | Node.js + Express |
| Downloads | yt-dlp via `child_process` |
| Real-time | Server-Sent Events (SSE) |
| PWA | Web App Manifest + Service Worker |

## Project Structure

```
ytdlnis-pwa/
├── backend/
│   ├── package.json
│   └── server.js         # API + yt-dlp runner
└── frontend/
    ├── public/
    │   ├── manifest.json  # PWA manifest
    │   └── sw.js          # Service worker
    └── src/
        ├── api/           # Backend API client
        ├── components/    # Navbar, DownloadCard, FormatPicker, Toast
        ├── db/            # Dexie IndexedDB
        ├── pages/         # Home, Queue, History, More
        └── types/         # TypeScript types
```

## Credits

- Original Android app: [YTDLnis by Denis Cerri](https://github.com/deniscerri/ytdlnis)
- Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp)
