import { Module } from '@nestjs/common';
import { CalligraphyController } from './calligraphy.controller.js';
import { CalligraphyService } from './calligraphy.service.js';

@Module({
  controllers: [CalligraphyController],
  providers: [CalligraphyService],
})
export class CalligraphyModule {}
