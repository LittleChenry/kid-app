import { opendir, stat, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { createHash } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';

const NAS_MOUNT = process.env.NAS_MOUNT || '/mnt/huawei-nas';
const HLS_OUTPUT = process.env.HLS_OUTPUT || './data/hls';
const SCAN_CACHE_TTL = 300_000;

const SUPPORTED_FORMATS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv']);
const PLAYABLE_FORMATS = new Set(['mp4', 'mov']);

export interface VideoFile {
  id: string;
  fileName: string;
  filePath: string;
  format: string;
  size: number;
  streamUrl: string;
}

export interface DirContent {
  currentPath: string;
  parentPath: string | null;
  directories: { name: string; path: string }[];
  files: VideoFile[];
}

interface TranscodeJob {
  videoId: string;
  status: 'pending' | 'transcoding' | 'done' | 'error';
  progress: number;
  error?: string;
}

const transcodeJobs = new Map<string, TranscodeJob>();
let cachedVideos: VideoFile[] | null = null;
let lastScanTime = 0;

function pathToId(filePath: string, baseDir: string): string {
  const rel = relative(baseDir, filePath);
  const withoutExt = rel.substring(0, rel.length - extname(rel).length);
  const sanitized = withoutExt.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_');
  if (sanitized.length <= 100) return sanitized || createHash('md5').update(rel).digest('hex').slice(0, 12);
  const hash = createHash('md5').update(rel).digest('hex').slice(0, 8);
  return sanitized.slice(0, 91) + '_' + hash;
}

function getRelativePath(filePath: string): string {
  if (filePath.startsWith(NAS_MOUNT)) {
    return filePath.slice(NAS_MOUNT.length).replace(/^\//, '');
  }
  return filePath;
}

export async function getDirContent(relativePath: string): Promise<DirContent> {
  const videos = await scanVideos();
  const normalizedPath = relativePath.replace(/^\/+|\/+$/g, '');

  const dirs = new Map<string, string>();
  const files: VideoFile[] = [];
  const prefix = normalizedPath ? normalizedPath + '/' : '';

  for (const v of videos) {
    const rel = getRelativePath(v.filePath);
    const slashIdx = rel.lastIndexOf('/');
    const fileDir = slashIdx >= 0 ? rel.substring(0, slashIdx) : '';

    if (fileDir === normalizedPath && PLAYABLE_FORMATS.has(v.format)) {
      files.push(v);
    } else if (normalizedPath === '' || fileDir.startsWith(prefix)) {
      const remainder = normalizedPath ? fileDir.slice(normalizedPath.length + 1) : fileDir;
      const subDirName = remainder.split('/')[0];
      if (subDirName && !dirs.has(subDirName)) {
        dirs.set(subDirName, normalizedPath ? `${normalizedPath}/${subDirName}` : subDirName);
      }
    }
  }

  return {
    currentPath: normalizedPath,
    parentPath: normalizedPath ? (normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : '') : null,
    directories: Array.from(dirs.entries()).map(([name, path]) => ({ name, path })).sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    files: files.sort((a, b) => (a.fileName || '').localeCompare(b.fileName || '', 'zh')),
  };
}

async function scanDir(dir: string, baseDir: string): Promise<VideoFile[]> {
  const videos: VideoFile[] = [];
  let dirHandle;
  try {
    dirHandle = await opendir(dir);
  } catch {
    return videos;
  }

  for await (const entry of dirHandle) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await scanDir(fullPath, baseDir);
      videos.push(...sub);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (!SUPPORTED_FORMATS.has(ext)) continue;
      let size = 0;
      try { size = (await stat(fullPath)).size; } catch {}
      const vid = pathToId(fullPath, baseDir);
      videos.push({
        id: vid,
        fileName: entry.name,
        filePath: fullPath,
        format: ext.slice(1),
        size,
        streamUrl: `/media/stream/${vid}`,
      });
    }
  }
  return videos;
}

async function doScan(): Promise<VideoFile[]> {
  const now = Date.now();
  const videos: VideoFile[] = [];

  if (existsSync(NAS_MOUNT)) {
    try {
      const nasVideos = await scanDir(NAS_MOUNT, NAS_MOUNT);
      videos.push(...nasVideos);
    } catch (err) {
      console.warn(`Error scanning NAS: ${err}`);
    }
  }

  cachedVideos = videos;
  lastScanTime = now;
  return videos;
}

export async function scanVideos(): Promise<VideoFile[]> {
  if (cachedVideos && (Date.now() - lastScanTime) < SCAN_CACHE_TTL) {
    return cachedVideos;
  }
  return doScan();
}

export async function getTranscodeStatus(videoId: string) {
  const outputDir = join(HLS_OUTPUT, videoId);
  const playlistPath = join(outputDir, 'index.m3u8');

  if (existsSync(playlistPath)) {
    return { status: 'ready' as const, hlsUrl: getHlsUrl(videoId) };
  }

  const job = transcodeJobs.get(videoId);
  if (job) {
    return { status: job.status, hlsUrl: null };
  }

  return { status: 'pending', hlsUrl: null };
}

export async function transcodeToHls(videoId: string): Promise<string> {
  const videos = await scanVideos();
  const video = videos.find((v) => v.id === videoId);
  if (!video) throw new Error(`Video ${videoId} not found`);

  const outputDir = join(HLS_OUTPUT, videoId);
  const playlistPath = join(outputDir, 'index.m3u8');

  if (existsSync(playlistPath)) {
    return getHlsUrl(videoId);
  }

  await mkdir(outputDir, { recursive: true });

  const job: TranscodeJob = { videoId, status: 'transcoding', progress: 0 };
  transcodeJobs.set(videoId, job);

  return new Promise((resolve, reject) => {
    ffmpeg(video.filePath)
      .outputOptions([
        '-c copy',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-hls_segment_filename',
        join(outputDir, 'segment_%03d.ts'),
        '-f hls',
      ])
      .output(playlistPath)
      .on('progress', (info) => {
        job.progress = info.percent || 0;
      })
      .on('end', () => {
        job.status = 'done';
        job.progress = 100;
        resolve(getHlsUrl(videoId));
      })
      .on('error', (err) => {
        job.status = 'error';
        job.error = err.message;
        reject(err);
      })
      .run();
  });
}

export function getHlsUrl(videoId: string): string {
  return `/media/hls/${videoId}/index.m3u8`;
}


