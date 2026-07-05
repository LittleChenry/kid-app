import { Module } from '@nestjs/common';
import { ArithmeticController } from './arithmetic.controller.js';
import { ArithmeticService } from './arithmetic.service.js';

@Module({
  controllers: [ArithmeticController],
  providers: [ArithmeticService],
})
export class ArithmeticModule {}
