import { Router } from 'express';
import { Readable } from 'stream';
import { statSync, createReadStream, existsSync } from 'fs';
import { extname } from 'path';
import { spawn } from 'child_process';
import { scanVideos, transcodeToHls, getHlsUrl, getTranscodeStatus, getDirContent } from '../services/transcoder.js';

const FETCH_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const NAS_MOUNT = process.env.NAS_MOUNT || '/mnt/huawei-nas';

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.ts': 'video/mp2t',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.m3u': 'audio/x-mpegurl',
};

const LIVE_CHANNELS: Record<string, { name: string; url: string }> = {
  'kaku-children': {
    name: '卡酷少儿',
    url: 'http://218.13.170.98:9901/tsfile/live/1021_1.m3u8',
  },
  'jinying-cartoon': {
    name: '金鹰卡通',
    url: 'http://183.11.239.36:808/hls/69/index.m3u8',
  },
  'hunan-tv': {
    name: '湖南卫视',
    url: 'http://hlsal-ldvt.qing.mgtv.com/nn_live/nn_x64/dWlwPTEyNy4wLjAuMSZ1aWQ9cWluZy1jbXMmbm5fdGltZXpvbmU9OCZjZG5leF9pZD1hbF9obHNfbGR2dCZ1dWlkPTliODY4NmU5ZTM2YzYwMmMmZT02OTE0NjA0JnY9MSZpZD1ITldTWkdTVCZzPTcwN2RiYTc2YzJjNmJmMTQ4MmUyZGYzOWU2NWM3YWFi/HNWSZGST.m3u8',
  },
  'zhejiang-tv': {
    name: '浙江卫视',
    url: 'http://ali-xwl.cztv.com/live/channel011080Plxw.m3u8',
  },
};

export const videoRouter: Router = Router();

videoRouter.get('/dir', async (req, res) => {
  try {
    const relativePath = (req.query.path as string) || '';
    const content = await getDirContent(relativePath);
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/videos', async (_req, res) => {
  try {
    const videos = await scanVideos();
    res.json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const videos = await scanVideos();
    const video = videos.find((v) => v.id === id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found' });
      return;
    }
    const status = await getTranscodeStatus(id);
    res.json({
      success: true,
      data: {
        ...video,
        status: status.status,
        hlsUrl: status.hlsUrl,
        streamUrl: `/media/stream/${id}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/videos/:id/playlist', async (req, res) => {
  try {
    const { id } = req.params;
    const hlsUrl = await transcodeToHls(id);
    res.json({ success: true, data: { hlsUrl } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/stream/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const videos = await scanVideos();
    const video = videos.find((v) => v.id === id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found' });
      return;
    }
    const filePath = video.filePath;
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }
    const fileStat = statSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const fileSize = fileStat.size;

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Content-Length': chunkSize,
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
      });
      createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/transcode-stream/:id', async (req, res) => {
  let killed = false;
  try {
    const { id } = req.params;
    const videos = await scanVideos();
    const video = videos.find((v) => v.id === id);
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found' });
      return;
    }
    const filePath = video.filePath;
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });

    const ff = spawn('ffmpeg', [
      '-i', filePath,
      '-map', '0:v', '-map', '0:a',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac',
      '-movflags', 'frag_keyframe+empty_moov',
      '-f', 'mp4',
      'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    ff.stdout.pipe(res);
    ff.stderr.on('data', () => {});

    req.on('close', () => {
      killed = true;
      ff.kill('SIGKILL');
    });

    ff.on('error', () => {
      if (!killed) {
        res.end();
      }
    });

    ff.on('exit', (code) => {
      if (!killed) {
        res.end();
      }
    });
  } catch (err) {
    if (!killed) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }
});

async function proxyFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': FETCH_UA },
  });
}

async function resolveVariantPlaylist(url: string, visited: Set<string>): Promise<string> {
  if (visited.has(url)) return url;
  visited.add(url);

  const response = await proxyFetch(url);
  if (!response.ok) return url;

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('mpegurl') && !contentType.includes('m3u')) return url;

  const body = await response.text();
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length === 0) return url;

  const firstUrl = lines[0];
  if (firstUrl.startsWith('http://') || firstUrl.startsWith('https://')) {
    return resolveVariantPlaylist(firstUrl, visited);
  }
  return url;
}

videoRouter.get('/live/play/:channelId/*', async (req, res) => {
  try {
    const { channelId } = req.params;
    const path = (req.params as any)['0'] as string | undefined;
    const channel = LIVE_CHANNELS[channelId];
    if (!channel) {
      res.status(404).json({ success: false, error: 'Channel not found' });
      return;
    }

    const baseUrl = channel.url.substring(0, channel.url.lastIndexOf('/') + 1);
    const origin = channel.url.match(/^https?:\/\/[^/]+/)?.[0] || '';

    let upstreamUrl: string;
    if (!path || path === 'master.m3u8') {
      upstreamUrl = channel.url;
    } else if (path.startsWith('/')) {
      upstreamUrl = origin + path;
    } else {
      upstreamUrl = baseUrl + path;
    }

    const qsIndex = req.url.indexOf('?');
    if (qsIndex >= 0) {
      upstreamUrl += req.url.slice(qsIndex);
    }

    const response = await proxyFetch(upstreamUrl);
    if (!response.ok) {
      res.status(response.status).send(await response.text());
      return;
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('mpegurl') || contentType.includes('m3u')) {
      let body = await response.text();
      body = body.replace(/^([^#\s\n].+)$/gm, (match) => {
        const trimmed = match.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return match;
        const base = `/media/live/play/${channelId}/`;
        if (trimmed.startsWith('/')) {
          return `${base}.${trimmed}`;
        }
        const dir = path ? path.substring(0, path.lastIndexOf('/') + 1) : '';
        return `${base}${dir}${trimmed}`;
      });
      res.set('content-type', contentType);
      res.send(body);
    } else {
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

videoRouter.get('/live', async (_req, res) => {
  const categoryMap: Record<string, string> = {
    'kaku-children': '少儿', 'jinying-cartoon': '少儿',
    'hunan-tv': '卫视', 'zhejiang-tv': '卫视',
  };
  const data = Object.entries(LIVE_CHANNELS).map(([id, ch]) => ({
    id,
    name: ch.name,
    url: `/media/live/play/${id}/master.m3u8`,
    category: categoryMap[id] || '综合',
    status: 'online' as const,
  }));
  res.json({ success: true, data });
});
