import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HlsPlayer from '../components/player/HlsPlayer';
import { api } from '../services/api';

const NATIVE_FORMATS = new Set(['mp4', 'mov']);

type Tab = 'videos' | 'live';
type ViewMode = 'list' | 'grid';

interface DirEntry {
  name: string;
  path: string;
}

interface DirData {
  currentPath: string;
  parentPath: string | null;
  directories: DirEntry[];
  files: any[];
}

export default function TVStation() {
  const [tab, setTab] = useState<Tab>('videos');
  const [dirData, setDirData] = useState<DirData | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [liveChannels, setLiveChannels] = useState<any[]>([]);
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const fetchDir = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await api.media.dir(path);
      if (res.success) {
        setDirData(res.data);
      }
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveChannels = useCallback(async () => {
    try {
      const channels = await api.video.liveChannels();
      setLiveChannels(channels || []);
    } catch {
      setLiveChannels([]);
    }
  }, []);

  useEffect(() => {
    if (tab === 'videos') {
      fetchDir(currentPath);
    } else {
      fetchLiveChannels();
    }
  }, [tab, currentPath, fetchDir, fetchLiveChannels]);

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handlePlayVideo = useCallback(async (video: any) => {
    if (video.hlsUrl) {
      setPlayingVideo(video);
      return;
    }
    if (video.streamUrl && video.format && NATIVE_FORMATS.has(video.format)) {
      setPlayingVideo(video);
      return;
    }
    if (video.id && video.format && !NATIVE_FORMATS.has(video.format)) {
      setPlayingVideo({ ...video, streamUrl: `/media/transcode-stream/${video.id}` });
      return;
    }
    try {
      const res = await api.media.playlist(video.id);
      setPlayingVideo({ ...video, hlsUrl: res.data?.hlsUrl || '' });
    } catch {
      setPlayingVideo(video);
    }
  }, []);

  const handleBack = useCallback(() => {
    setPlayingVideo(null);
  }, []);

  const breadcrumbParts = currentPath ? currentPath.split('/') : [];

  if (playingVideo) {
    const isLive = tab === 'live';
    const videoSrc = playingVideo.streamUrl || playingVideo.hlsUrl || playingVideo.url || '';
    const isHls = videoSrc.endsWith('.m3u8');
    return (
      <div className="min-h-dvh bg-black flex flex-col safe-area-top-bottom">
        <div className="flex items-center gap-3 p-3 bg-black/80">
          <button
            onClick={handleBack}
            className="text-white/80 hover:text-white transition-colors"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-white font-medium truncate">{playingVideo.fileName || playingVideo.name}</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-2">
          <div className="w-full max-w-4xl">
            {isHls ? (
              <HlsPlayer
                src={videoSrc}
                title={playingVideo.fileName || playingVideo.name}
                autoPlay
                onError={() => {}}
              />
            ) : (
              <video
                key={videoSrc}
                className="w-full aspect-video object-contain rounded-2xl"
                src={videoSrc}
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <h1 className="font-display text-3xl text-kid-blue">电视台</h1>
      </div>

      <div className="flex gap-2 mb-4 items-center">
        <button
          onClick={() => setTab('videos')}
          className={`kid-button text-sm px-6 py-2 ${tab === 'videos' ? 'bg-kid-blue text-white' : 'bg-gray-100 text-gray-600'}`}
          type="button"
        >
          视频库
        </button>
        <button
          onClick={() => setTab('live')}
          className={`kid-button text-sm px-6 py-2 ${tab === 'live' ? 'bg-kid-blue text-white' : 'bg-gray-100 text-gray-600'}`}
          type="button"
        >
          直播
        </button>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-kid-blue text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
            type="button"
            title="列表"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-kid-blue text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
            type="button"
            title="方格"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        </div>
      </div>

      {tab === 'videos' && (
        <>
          {breadcrumbParts.length > 0 && (
            <div className="flex items-center gap-1 mb-4 text-sm text-gray-500 overflow-x-auto pb-1 whitespace-nowrap">
              <button onClick={() => navigateTo('')} className="hover:text-kid-blue" type="button">根目录</button>
              {breadcrumbParts.map((part, idx) => {
                const path = breadcrumbParts.slice(0, idx + 1).join('/');
                const isLast = idx === breadcrumbParts.length - 1;
                return (
                  <span key={path} className="flex items-center gap-1">
                    <span className="text-gray-300">/</span>
                    {isLast ? (
                      <span className="text-gray-800 font-medium">{part}</span>
                    ) : (
                      <button onClick={() => navigateTo(path)} className="hover:text-kid-blue" type="button">{part}</button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="kid-card text-center py-12">
              <div className="w-8 h-8 border-4 border-kid-blue/30 border-t-kid-blue rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3">加载中...</p>
            </div>
          ) : dirData && dirData.directories.length === 0 && dirData.files.length === 0 ? (
            <div className="kid-card text-center py-12">
              <div className="text-5xl mb-3">📂</div>
              <p className="text-gray-400">这个目录是空的</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {dirData && dirData.parentPath !== null && (
                <button
                  onClick={() => navigateTo(dirData.parentPath!)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  type="button"
                >
                  <span className="text-2xl">📁</span>
                  <span className="text-gray-500 font-medium">返回上级</span>
                </button>
              )}
              {dirData?.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => navigateTo(dir.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  type="button"
                >
                  <span className="text-2xl">📁</span>
                  <span className="font-medium truncate">{dir.name}</span>
                </button>
              ))}
              {dirData?.files.map((file: any) => (
                <button
                  key={file.id}
                  onClick={() => handlePlayVideo(file)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  type="button"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-kid-blue to-blue-600
                    flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-400">{file.format?.toUpperCase()}</p>
                  </div>
                  {file.size > 0 && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {file.size > 1073741824
                        ? `${(file.size / 1073741824).toFixed(1)}GB`
                        : file.size > 1048576
                          ? `${(file.size / 1048576).toFixed(0)}MB`
                          : `${(file.size / 1024).toFixed(0)}KB`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {dirData && dirData.parentPath !== null && (
                <button
                  onClick={() => navigateTo(dirData.parentPath!)}
                  className="aspect-square rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center gap-2"
                  type="button"
                >
                  <span className="text-3xl">📁</span>
                  <span className="text-sm text-gray-500 font-medium">返回上级</span>
                </button>
              )}
              {dirData?.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => navigateTo(dir.path)}
                  className="aspect-square rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center gap-2 p-2 border-2 border-blue-200"
                  type="button"
                >
                  <span className="text-4xl">📁</span>
                  <span className="text-sm font-medium text-center leading-tight truncate w-full px-1">{dir.name}</span>
                </button>
              ))}
              {dirData?.files.map((file: any) => (
                <button
                  key={file.id}
                  onClick={() => handlePlayVideo(file)}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-kid-blue to-blue-600 hover:from-blue-500 hover:to-blue-700 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 p-2 relative group"
                  type="button"
                >
                  <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/80 font-medium text-center leading-tight truncate w-full px-1">{file.fileName}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'live' && (
        <>
          {loading ? (
            <div className="kid-card text-center py-12">
              <div className="w-8 h-8 border-4 border-kid-blue/30 border-t-kid-blue rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3">加载中...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {liveChannels.map((channel: any) => (
                <button
                  key={channel.id}
                  onClick={() => handlePlayVideo({
                    id: channel.id,
                    fileName: channel.name,
                    name: channel.name,
                    url: channel.url,
                    hlsUrl: channel.url,
                  })}
                  className="kid-card w-full text-left flex items-center gap-4 hover:shadow-2xl transition-all active:scale-95"
                  type="button"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-blue-200
                    flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-kid-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{channel.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600">直播中</span>
                      <span className="text-xs text-gray-400">{channel.category}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {liveChannels.map((channel: any) => (
                <button
                  key={channel.id}
                  onClick={() => handlePlayVideo({
                    id: channel.id,
                    fileName: channel.name,
                    name: channel.name,
                    url: channel.url,
                    hlsUrl: channel.url,
                  })}
                  className="aspect-square rounded-2xl bg-white border-2 border-blue-200 hover:bg-blue-50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 p-2 relative group"
                  type="button"
                >
                  <svg className="w-10 h-10 text-kid-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span className="text-sm font-bold text-blue-600 text-center leading-tight truncate w-full px-1">{channel.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-gray-400">{channel.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
