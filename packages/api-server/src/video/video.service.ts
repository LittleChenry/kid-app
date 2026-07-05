import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface LiveChannel {
  id: string;
  name: string;
  url: string;
  poster?: string;
  category: string;
  status: 'online' | 'offline';
}

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  async getVideos() {
    const existing = await this.prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
    });
    if (existing.length === 0) {
      await this.scanNasVideos();
      return this.prisma.video.findMany({ orderBy: { createdAt: 'desc' } });
    }
    return existing;
  }

  async getVideo(id: string) {
    return this.prisma.video.findUnique({ where: { id } });
  }

  getLiveChannels(): LiveChannel[] {
    return this.liveChannels;
  }

  getCategories(): string[] {
    return ['动画片', '科普', '英语', '绘本故事', '国学', '手工', '音乐', '国产剧', '其他'];
  }

  async scanNasVideos() {
    await this.prisma.video.deleteMany({});

    try {
      // 从媒体服务器获取视频列表
      const response = await fetch('http://localhost:4001/media/videos');
      const data: any = await response.json();
      const videos = data.data || [];

      let created = 0;
      for (const v of videos) {
        try {
          await this.prisma.video.create({
            data: {
              id: v.id,
              title: v.fileName,
              fileName: v.fileName,
              filePath: v.filePath,
              format: v.format,
              size: BigInt(v.size),
              duration: 0,
              status: 'ready',
              category: '动画片',
            },
          });
          created++;
        } catch (err) {
          console.warn(`Skipping duplicate/conflict video: ${v.id}`);
        }
      }

      return { scanned: created };
    } catch (error) {
      console.error('Failed to scan from media server:', error);
      return { scanned: 0 };
    }
  }

  private liveChannels: LiveChannel[] = [
    { id: 'cctv-1', name: 'CCTV-1 综合', url: '/media/live/play/cctv-1/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-2', name: 'CCTV-2 财经', url: '/media/live/play/cctv-2/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-3', name: 'CCTV-3 综艺', url: '/media/live/play/cctv-3/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-4', name: 'CCTV-4 中文国际', url: '/media/live/play/cctv-4/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-5', name: 'CCTV-5 体育', url: '/media/live/play/cctv-5/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-6', name: 'CCTV-6 电影', url: '/media/live/play/cctv-6/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-7', name: 'CCTV-7 军事农业', url: '/media/live/play/cctv-7/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-8', name: 'CCTV-8 电视剧', url: '/media/live/play/cctv-8/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-9', name: 'CCTV-9 纪录', url: '/media/live/play/cctv-9/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-10', name: 'CCTV-10 科教', url: '/media/live/play/cctv-10/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-11', name: 'CCTV-11 戏曲', url: '/media/live/play/cctv-11/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-12', name: 'CCTV-12 社会与法', url: '/media/live/play/cctv-12/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-13', name: 'CCTV-13 新闻', url: '/media/live/play/cctv-13/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-14', name: 'CCTV-14 少儿', url: '/media/live/play/cctv-14/master.m3u8', poster: '', category: '少儿', status: 'online' },
    { id: 'cctv-15', name: 'CCTV-15 音乐', url: '/media/live/play/cctv-15/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-16', name: 'CCTV-16 奥林匹克', url: '/media/live/play/cctv-16/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'cctv-17', name: 'CCTV-17 农业农村', url: '/media/live/play/cctv-17/master.m3u8', poster: '', category: '央视', status: 'online' },
    { id: 'kaku-children', name: '卡酷少儿', url: '/media/live/play/kaku-children/master.m3u8', poster: '', category: '少儿', status: 'online' },
    { id: 'jinying-cartoon', name: '金鹰卡通', url: '/media/live/play/jinying-cartoon/master.m3u8', poster: '', category: '少儿', status: 'online' },
    { id: 'hunan-tv', name: '湖南卫视', url: '/media/live/play/hunan-tv/master.m3u8', poster: '', category: '卫视', status: 'online' },
    { id: 'dongfang-tv', name: '东方卫视', url: '/media/live/play/dongfang-tv/master.m3u8', poster: '', category: '卫视', status: 'online' },
    { id: 'zhejiang-tv', name: '浙江卫视', url: '/media/live/play/zhejiang-tv/master.m3u8', poster: '', category: '卫视', status: 'online' },
    { id: 'jiangsu-tv', name: '江苏卫视', url: '/media/live/play/jiangsu-tv/master.m3u8', poster: '', category: '卫视', status: 'online' },
    { id: 'beijing-tv', name: '北京卫视', url: '/media/live/play/beijing-tv/master.m3u8', poster: '', category: '卫视', status: 'online' },
  ];
}
