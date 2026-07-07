import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { execFile, spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import type { DownloadJob, DownloadType, Format, VideoInfo } from './src/types';

const app = express();
const PORT = 3000;

// ─── Resolve yt-dlp Executable Command ─────────────────────────────────────────

interface YtDlpCmd {
  command: string;
  argsPrefix: string[];
  isAvailable: boolean;
}

function getYtDlpCommand(): YtDlpCmd {
  // 1. Try global yt-dlp command in system PATH
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    return { command: 'yt-dlp', argsPrefix: [], isAvailable: true };
  } catch (e) {
    // Continue
  }

  const localPath = path.join(process.cwd(), 'bin', 'yt-dlp');

  // 2. Try running local yt-dlp binary directly
  try {
    if (fs.existsSync(localPath)) {
      execSync(`"${localPath}" --version`, { stdio: 'ignore' });
      return { command: localPath, argsPrefix: [], isAvailable: true };
    }
  } catch (e) {
    // Continue
  }

  // 3. Try running local yt-dlp using python3
  try {
    if (fs.existsSync(localPath)) {
      execSync(`python3 "${localPath}" --version`, { stdio: 'ignore' });
      return { command: 'python3', argsPrefix: [localPath], isAvailable: true };
    }
  } catch (e) {
    // Continue
  }

  // 4. Try running local yt-dlp using python
  try {
    if (fs.existsSync(localPath)) {
      execSync(`python "${localPath}" --version`, { stdio: 'ignore' });
      return { command: 'python', argsPrefix: [localPath], isAvailable: true };
    }
  } catch (e) {
    // Continue
  }

  const exists = fs.existsSync(localPath);
  return {
    command: localPath,
    argsPrefix: [],
    isAvailable: exists
  };
}

app.use(cors());
app.use(express.json());

// Ensure downloads folder exists at root of the workspace
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// ─── Server State ─────────────────────────────────────────────────────────────

let jobs: DownloadJob[] = [];
let clients: express.Response[] = [];
const activeDownloaders = new Map<string, any>();

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

// Format duration from seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Extract YouTube ID
function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function extractTitleFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      return lastPart
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    return url.hostname;
  } catch {
    return 'Awesome Download';
  }
}

// Broadcast updates to SSE clients
function broadcastJob(job: DownloadJob) {
  const data = JSON.stringify(job);
  clients.forEach((client) => {
    client.write(`event: job\ndata: ${data}\n\n`);
  });
}

// ─── Queue Manager ────────────────────────────────────────────────────────────

function runQueue() {
  const activeCount = jobs.filter(j => j.status === 'active').length;
  if (activeCount >= 2) return; // limit concurrency to 2 parallel downloads

  const nextJob = jobs.find(j => j.status === 'queued');
  if (!nextJob) return;

  startJobProgress(nextJob);
}

function startJobProgress(job: DownloadJob) {
  job.status = 'active';
  job.log += `[info] Starting real yt-dlp download process...\n`;
  broadcastJob(job);

  const ytDlpConfig = getYtDlpCommand();
  const args: string[] = [...ytDlpConfig.argsPrefix];

  // Use cookies if provided
  const cookiesPath = path.join(DOWNLOADS_DIR, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    args.push('--cookies', cookiesPath);
  }

  // Output filename template using job id
  args.push('-o', path.join(DOWNLOADS_DIR, `${job.id}.%(ext)s`));
  args.push('--newline');
  args.push('--progress');
  args.push('--no-playlist');

  // Set format / options based on download type
  if (job.type === 'audio') {
    // Extract best audio quality and convert to mp3
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    if (job.format && job.format.format_id) {
      args.push('-f', job.format.format_id);
    } else {
      args.push('-f', 'bestaudio/best');
    }
  } else if (job.type === 'video') {
    if (job.format && job.format.format_id) {
      args.push('-f', `${job.format.format_id}+bestaudio/best`, '--merge-output-format', 'mp4');
    } else {
      args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
    }
  } else {
    // 'auto' mode
    args.push('-f', 'best');
  }

  // Add target URL
  args.push(job.url);

  job.log += `[info] Executing: yt-dlp ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}\n\n`;
  broadcastJob(job);

  const child = spawn(ytDlpConfig.command, args);
  activeDownloaders.set(job.id, child);

  child.stdout.on('data', (data) => {
    const output = data.toString();
    job.log += output;

    // Parse progress e.g., "[download]  12.5% of 45.20MiB at 4.20MiB/s ETA 00:10"
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('[download]')) {
        const percentMatch = line.match(/([\d.]+)%/);
        if (percentMatch) {
          job.progress = parseFloat(percentMatch[1]);
        }
        
        const speedMatch = line.match(/at\s+([^\s]+)/);
        if (speedMatch) {
          job.speed = speedMatch[1];
        }

        const etaMatch = line.match(/ETA\s+([^\s]+)/);
        if (etaMatch) {
          job.eta = etaMatch[1];
        }

        const sizeMatch = line.match(/of\s+([^\s]+)/);
        if (sizeMatch && !line.includes('at')) {
          job.size = sizeMatch[1];
        }
      } else if (line.trim().startsWith('[ExtractAudio]')) {
        job.eta = 'Processing...';
        job.speed = 'Extracting audio...';
      } else if (line.trim().startsWith('[Merger]')) {
        job.eta = 'Processing...';
        job.speed = 'Merging streams...';
      }
    }
    broadcastJob(job);
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    job.log += `[stderr] ${output}`;
    broadcastJob(job);
  });

  child.on('close', (code) => {
    activeDownloaders.delete(job.id);
    
    if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
      job.speed = '';
      job.eta = '';
      job.completedAt = Date.now();
      job.log += `\n[info] Download finished successfully with exit code 0!\n`;
    } else {
      if (job.status !== 'cancelled') {
        job.status = 'errored';
        job.error = `yt-dlp exited with code ${code}`;
        job.log += `\n[error] Download failed with exit code ${code}.\n`;
      }
    }
    broadcastJob(job);
    runQueue();
  });

  child.on('error', (err) => {
    activeDownloaders.delete(job.id);
    job.status = 'errored';
    job.error = err.message;
    job.log += `\n[error] Spawning error: ${err.message}\n`;
    broadcastJob(job);
    runQueue();
  });
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

// 1. Health check (Verify yt-dlp availability)
app.get('/api/health', (req, res) => {
  const config = getYtDlpCommand();
  res.json({ ok: true, ytdlp: config.isAvailable });
});

// 2. Fetch video info in real-time using yt-dlp -J
app.post('/api/info', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const ytDlpConfig = getYtDlpCommand();
  
  let targetUrl = url.trim();
  const isSearch = !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('ytsearch:');
  if (isSearch) {
    targetUrl = `ytsearch1:${targetUrl}`;
  }

  // Call yt-dlp with JSON export and no-playlist flag
  const infoArgs = [...ytDlpConfig.argsPrefix, '-J', '--no-playlist', '--flat-playlist'];
  const cookiesPath = path.join(DOWNLOADS_DIR, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    infoArgs.push('--cookies', cookiesPath);
  }
  infoArgs.push(targetUrl);

  execFile(
    ytDlpConfig.command,
    infoArgs,
    { maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer
    (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp fetch failed, falling back:', stderr);
        
        // Dynamic fallback logic
        const ytId = getYoutubeId(url);
        let title = extractTitleFromUrl(url);
        let thumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop';
        let website = 'generic';
        
        if (ytId) {
          website = 'youtube';
          thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
          title = `YouTube Video (${ytId})`;
        }
        
        const info: VideoInfo = {
          url,
          title,
          author: 'Creator',
          thumb,
          duration: '0:00',
          website,
          formats: [
            { format_id: 'best', container: 'mp4', vcodec: 'any', acodec: 'any', filesize: 0, format_note: 'Best Quality' }
          ]
        };
        return res.json(info);
      }

      try {
        let data = JSON.parse(stdout);
        
        // If it's a playlist (e.g. from search), get the first entry
        if (data && data._type === 'playlist') {
          if (Array.isArray(data.entries) && data.entries.length > 0) {
            data = data.entries[0];
          } else {
            return res.status(404).json({ error: 'No results found for the search query' });
          }
        }

        if (!data) {
          return res.status(404).json({ error: 'Failed to find video info' });
        }

        // Parse formats
        const formats: Format[] = [];
        if (Array.isArray(data.formats)) {
          for (const f of data.formats) {
            formats.push({
              format_id: f.format_id || '',
              container: f.ext || f.container || '',
              vcodec: f.vcodec || 'none',
              acodec: f.acodec || 'none',
              filesize: f.filesize || f.filesize_approx || 0,
              format_note: f.format_note || f.format || '',
              fps: f.fps ? String(f.fps) : undefined,
              width: f.width || null,
              height: f.height || null,
              tbr: f.tbr ? String(f.tbr) : undefined,
            });
          }
        }

        // Parse duration
        let durationStr = '0:00';
        if (typeof data.duration === 'number') {
          durationStr = formatDuration(data.duration);
        }

        // Thumbnails
        let thumb = data.thumbnail || '';
        if (!thumb && Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
          thumb = data.thumbnails[data.thumbnails.length - 1].url || '';
        }

        const info: VideoInfo = {
          url: data.webpage_url || data.url || url, // Save direct video URL
          title: data.title || 'Untitled Video',
          author: data.uploader || data.artist || data.channel || 'Unknown',
          thumb,
          duration: durationStr,
          website: data.extractor || 'generic',
          formats,
        };

        res.json(info);
      } catch (parseErr) {
        console.error('Failed to parse yt-dlp output:', parseErr);
        res.status(500).json({ error: 'Failed to process video info' });
      }
    }
  );
});

// 3. Start download
app.post('/api/download', (req, res) => {
  const opts = req.body;
  if (!opts.url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const id = Math.random().toString(36).slice(2, 10);
  const cleanTitle = (opts.title || 'download').replace(/[^a-zA-Z0-9]/g, '_');
  const ext = opts.type === 'audio' ? 'mp3' : 'mp4';

  const job: DownloadJob = {
    id,
    url: opts.url,
    title: opts.title || 'Untitled Download',
    author: opts.author || 'Unknown',
    thumb: opts.thumb || '',
    duration: opts.duration || '0:00',
    website: opts.website || 'generic',
    type: opts.type || 'video',
    format: opts.format || null,
    status: 'queued',
    progress: 0,
    speed: '0 B/s',
    eta: '--:--',
    size: opts.format ? formatBytes(opts.format.filesize) : 'Unknown',
    downloadPath: `/downloads/${cleanTitle}.${ext}`,
    createdAt: Date.now(),
    completedAt: null,
    log: `[info] Initializing download request...\n[info] Selected download mode: ${opts.type}\n`,
    error: '',
  };

  jobs.unshift(job);
  broadcastJob(job);
  runQueue();

  res.json(job);
});

// 4. List all jobs
app.get('/api/downloads', (req, res) => {
  res.json(jobs);
});

// 5. Cancel / Delete a job
app.delete('/api/downloads/:id', (req, res) => {
  const { id } = req.params;
  const idx = jobs.findIndex(j => j.id === id);
  if (idx !== -1) {
    const job = jobs[idx];
    const downloader = activeDownloaders.get(id);
    if (downloader) {
      if (typeof downloader.kill === 'function') {
        downloader.kill('SIGTERM');
      } else {
        clearInterval(downloader);
      }
      activeDownloaders.delete(id);
    }
    job.status = 'cancelled';
    job.log += `\n[download] Job was cancelled by user.\n`;
    broadcastJob(job);
    runQueue();
  }
  res.sendStatus(200);
});

// 6. Retry a failed/cancelled job
app.post('/api/downloads/:id/retry', (req, res) => {
  const { id } = req.params;
  const job = jobs.find(j => j.id === id);
  if (job) {
    const downloader = activeDownloaders.get(id);
    if (downloader) {
      if (typeof downloader.kill === 'function') {
        downloader.kill('SIGTERM');
      } else {
        clearInterval(downloader);
      }
      activeDownloaders.delete(id);
    }
    job.status = 'queued';
    job.progress = 0;
    job.speed = '0 B/s';
    job.eta = '--:--';
    job.completedAt = null;
    job.log = `[info] Retrying download job...\n`;
    broadcastJob(job);
    runQueue();
  }
  res.sendStatus(200);
});

// 7. Get logs for a job
app.get('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const job = jobs.find(j => j.id === id);
  res.json({ log: job ? job.log : 'Job not found.' });
});

// 8. Serve physical file back to the browser for downloading to local disk
app.get('/api/download-file/:id', (req, res) => {
  const { id } = req.params;
  const job = jobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).send('Job not found');
  }

  try {
    // Find matching files in downloads folder starting with job id
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const matchedFile = files.find(f => f.startsWith(id));
    if (!matchedFile) {
      return res.status(404).send('Downloaded file was not found on server.');
    }

    const filePath = path.join(DOWNLOADS_DIR, matchedFile);
    const ext = path.extname(matchedFile);
    
    // Clean up filename for header
    const cleanTitle = job.title.replace(/[^a-zA-Z0-9\s-_]/g, '') || 'Download';
    res.download(filePath, `${cleanTitle}${ext}`);
  } catch (err) {
    console.error('File serving error:', err);
    res.status(500).send('Error downloading file');
  }
});

// 8.5 Stream physical file for inline playback (supports Range requests)
app.get('/api/stream-file/:id', (req, res) => {
  const { id } = req.params;
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const matchedFile = files.find(f => f.startsWith(id));
    if (!matchedFile) {
      return res.status(404).send('File not found');
    }

    const filePath = path.join(DOWNLOADS_DIR, matchedFile);
    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    const ext = path.extname(matchedFile).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.m4a') contentType = 'audio/mp4';
    else if (ext === '.webm') contentType = 'video/webm';

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + totalSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': totalSize,
        'Content-Type': contentType,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).send('Error streaming file');
  }
});

// 8.6 Get cookie settings status and content
app.get('/api/settings/cookies', (req, res) => {
  const cookiesPath = path.join(DOWNLOADS_DIR, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    try {
      const content = fs.readFileSync(cookiesPath, 'utf8');
      res.json({ hasCookies: true, cookies: content });
    } catch (err) {
      res.json({ hasCookies: false, cookies: '' });
    }
  } else {
    res.json({ hasCookies: false, cookies: '' });
  }
});

// 8.7 Update cookie settings
app.post('/api/settings/cookies', (req, res) => {
  const { cookies } = req.body;
  const cookiesPath = path.join(DOWNLOADS_DIR, 'cookies.txt');
  
  try {
    if (!cookies || cookies.trim() === '') {
      if (fs.existsSync(cookiesPath)) {
        fs.unlinkSync(cookiesPath);
      }
      res.json({ success: true, hasCookies: false, message: 'Cookies cleared successfully' });
    } else {
      fs.writeFileSync(cookiesPath, cookies.trim(), 'utf8');
      res.json({ success: true, hasCookies: true, message: 'Cookies saved successfully!' });
    }
  } catch (err: any) {
    console.error('Failed to save cookies:', err);
    res.status(500).json({ error: 'Failed to save cookies file: ' + err.message });
  }
});

// 9. SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// ─── Setup Vite / Client Serving ──────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
