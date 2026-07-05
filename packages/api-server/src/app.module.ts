import { Module } from '@nestjs/common';
import { ArithmeticModule } from './arithmetic/arithmetic.module.js';
import { CalligraphyModule } from './calligraphy/calligraphy.module.js';
import { VideoModule } from './video/video.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, ArithmeticModule, CalligraphyModule, VideoModule],
})
export class AppModule {}
