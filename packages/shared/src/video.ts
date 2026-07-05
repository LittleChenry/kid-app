export type VideoStatus = 'ready' | 'transcoding' | 'error';

export interface VideoInfo {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  format: string;
  size: number;
  duration: number;
  status: VideoStatus;
  hlsUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  createdAt: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline';
}
