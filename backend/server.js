const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {Map<string, import('./types').Job>} */
const jobs = new Map();
/** @type {Set<import('http').ServerResponse>} */
const sseClients = new Set();

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'Downloads', 'YTDLnis');

// ─── SSE Helpers ──────────────────────────────────────────────────────────────
function broadcast(eventName, data) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch (_) {}
  }
}

// ─── Check yt-dlp ─────────────────────────────────────────────────────────────
function checkYtDlp() {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', ['--version']);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** SSE stream */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.add(res);

  // Send current state immediately
  for (const job of jobs.values()) {
    res.write(`event: job\ndata: ${JSON.stringify(job)}\n\n`);
  }

  // Heartbeat every 15s to prevent proxy timeouts
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    sseClients.delete(res);
  });
});

/** Check if yt-dlp is available */
app.get('/api/health', async (req, res) => {
  const ytdlpOk = await checkYtDlp();
  res.json({ ok: true, ytdlp: ytdlpOk });
});

/** Fetch video info + formats */
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const info = await fetchVideoInfo(url);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch info' });
  }
});

/** Start a download */
app.post('/api/download', (req, res) => {
  const { url, title, author, thumb, duration, type, format, website } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const id = crypto.randomUUID();
  const job = {
    id,
    url,
    title: title || url,
    author: author || '',
    thumb: thumb || '',
    duration: duration || '',
    website: website || '',
    type: type || 'video',
    format: format || null,
    status: 'queued',
    progress: 0,
    speed: '',
    eta: '',
    size: '',
    downloadPath: DEFAULT_OUTPUT_DIR,
    filename: '',
    createdAt: Date.now(),
    completedAt: null,
    log: '',
    error: ''
  };

  jobs.set(id, job);
  broadcast('job', job);

  // Kick off asynchronously
  setTimeout(() => startDownload(id), 100);

  res.json(job);
});

/** List all jobs */
app.get('/api/downloads', (req, res) => {
  res.json([...jobs.values()]);
});

/** Get single job */
app.get('/api/downloads/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

/** Cancel / delete a job */
app.delete('/api/downloads/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  if (job._pid) {
    killProcess(job._pid);
  }

  job.status = 'cancelled';
  broadcast('job', { ...job });

  const { _pid, _proc, ...safeJob } = job;
  res.json(safeJob);
});

/** Retry an errored / cancelled job */
app.post('/api/downloads/:id/retry', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  job.status = 'queued';
  job.progress = 0;
  job.speed = '';
  job.eta = '';
  job.error = '';
  job.log = '';
  broadcast('job', { ...job });

  setTimeout(() => startDownload(job.id), 100);
  res.json({ ok: true });
});

/** Get log for a job */
app.get('/api/logs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ id: job.id, log: job.log });
});

/** Stream media file */
app.get('/api/stream/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.filename || job.status !== 'completed') {
    return res.status(404).json({ error: 'File not ready' });
  }

  const filePath = path.join(DEFAULT_OUTPUT_DIR, job.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = job.filename.endsWith('.mp3') || job.filename.endsWith('.m4a') ? 'audio/mpeg' : 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─── Core Logic ───────────────────────────────────────────────────────────────

function fetchVideoInfo(url) {
  return new Promise((resolve, reject) => {
    // Treat as search query if it doesn't look like a URL
    const isUrl = /^https?:\/\//i.test(url);
    const target = isUrl ? url : `ytsearch1:${url}`;

    const args = ['--dump-json', '--no-playlist', '--no-warnings', target];
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('yt-dlp not found. Please install yt-dlp and ensure it is in your PATH.'));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || 'yt-dlp returned non-zero exit code'));
      }
      try {
        const info = JSON.parse(stdout);
        // Normalize format list
        const formats = (info.formats || []).map((f) => ({
          format_id: f.format_id || '',
          container: f.ext || f.container || '',
          vcodec: f.vcodec || '',
          acodec: f.acodec || '',
          filesize: f.filesize || f.filesize_approx || 0,
          format_note: f.format_note || f.resolution || '',
          fps: f.fps ? String(f.fps) : '',
          width: f.width || null,
          height: f.height || null,
          tbr: f.tbr ? String(f.tbr) : '',
          url: '' // strip direct URLs for security
        }));

        resolve({
          url: info.webpage_url || info.original_url || url,
          title: info.title || 'Unknown',
          author: info.uploader || info.channel || '',
          thumb: info.thumbnail || '',
          duration: formatDuration(info.duration),
          website: info.webpage_url_domain || info.extractor || '',
          formats
        });
      } catch (e) {
        reject(new Error('Failed to parse yt-dlp output'));
      }
    });
  });
}

function startDownload(id) {
  const job = jobs.get(id);
  if (!job || job.status === 'cancelled') return;

  job.status = 'active';
  broadcast('job', { ...job });

  const args = buildArgs(job);

  let proc;
  try {
    proc = spawn('yt-dlp', args, { windowsHide: true });
  } catch (err) {
    job.status = 'errored';
    job.error = err.message;
    broadcast('job', { ...job });
    return;
  }

  job._pid = proc.pid;
  job._proc = proc;

  const progressRe = /\[download\]\s+([\d.]+)%\s+of\s+([\S]+)\s+at\s+([\S]+)\s+ETA\s+([\S]+)/;
  const destRe1 = /\[download\] Destination:\s*(.+?)\r?\n/;
  const destRe2 = /\[Merger\] Merging formats into "(.+?)"/;
  const destRe3 = /\[ExtractAudio\] Destination:\s*(.+?)\r?\n/;

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    job.log += text;

    const match = text.match(progressRe);
    if (match) {
      job.progress = Math.min(parseFloat(match[1]), 100);
      job.size = match[2];
      job.speed = match[3];
      job.eta = match[4];
    }

    const m1 = text.match(destRe1);
    if (m1) job.filename = path.basename(m1[1].trim());
    const m2 = text.match(destRe2);
    if (m2) job.filename = path.basename(m2[1].trim());
    const m3 = text.match(destRe3);
    if (m3) job.filename = path.basename(m3[1].trim());

    // Post-processing line
    if (text.includes('[Merger]') || text.includes('[ExtractAudio]')) {
      job.speed = '';
      job.eta = 'Processing...';
    }

    broadcast('job', { ...job });
  };

  proc.stdout.on('data', handleOutput);
  proc.stderr.on('data', handleOutput);

  proc.on('error', (err) => {
    if (job.status === 'cancelled') return;
    job.status = 'errored';
    job.error = err.code === 'ENOENT'
      ? 'yt-dlp not found. Please install it.'
      : err.message;
    broadcast('job', { ...job });
  });

  proc.on('close', (code) => {
    if (job.status === 'cancelled') return;

    if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
      job.speed = '';
      job.eta = '';
      job.completedAt = Date.now();
    } else {
      job.status = 'errored';
      job.error = `yt-dlp exited with code ${code}`;
    }

    delete job._pid;
    delete job._proc;
    broadcast('job', { ...job });
  });
}

function buildArgs(job) {
  const outputTemplate = path.join(DEFAULT_OUTPUT_DIR, '%(title)s.%(ext)s');
  const args = [
    '--progress',
    '--newline',
    '--no-part',
    '-o', outputTemplate
  ];

  if (job.type === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else if (job.type === 'video') {
    if (job.format && job.format.format_id) {
      args.push('-f', `${job.format.format_id}+bestaudio/best`);
    } else {
      args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
    }
  } else {
    // auto
    args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
  }

  args.push(job.url);
  return args;
}

function killProcess(pid) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { windowsHide: true });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch (_) {}
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 4123;
app.listen(PORT, () => {
  console.log(`\n  🎬 YTDLnis Backend\n`);
  console.log(`  ➜ API: http://localhost:${PORT}`);
  console.log(`  ➜ Output: ${DEFAULT_OUTPUT_DIR}\n`);

  checkYtDlp().then((ok) => {
    if (ok) {
      console.log('  ✅ yt-dlp found\n');
    } else {
      console.warn('  ⚠️  yt-dlp NOT found in PATH!');
      console.warn('  Install from: https://github.com/yt-dlp/yt-dlp#installation\n');
    }
  });
});
