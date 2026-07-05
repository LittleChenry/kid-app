import { Module } from '@nestjs/common';
import { VideoController } from './video.controller.js';
import { VideoService } from './video.service.js';

@Module({
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
