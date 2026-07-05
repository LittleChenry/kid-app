import { Controller, Get, Param, Post } from '@nestjs/common';
import { VideoService } from './video.service.js';

@Controller('video')
export class VideoController {
  constructor(private readonly svc: VideoService) {}

  @Get()
  async getVideos() {
    return this.svc.getVideos();
  }

  @Get('live')
  getLiveChannels(): { id: string; name: string; url: string; poster?: string; category: string; status: string }[] {
    return this.svc.getLiveChannels();
  }

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Post('scan')
  async scanVideos() {
    return this.svc.scanNasVideos();
  }

  @Get(':id')
  async getVideo(@Param('id') id: string) {
    return this.svc.getVideo(id);
  }
}
