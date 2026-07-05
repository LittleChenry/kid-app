import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CalligraphyService } from './calligraphy.service.js';

@Controller('calligraphy')
export class CalligraphyController {
  constructor(private readonly svc: CalligraphyService) {}

  @Get('characters')
  getCharacters() {
    return this.svc.getCharacters();
  }

  @Get('characters/:grade')
  getCharactersByGrade(@Param('grade') grade: string) {
    return this.svc.getCharactersByGrade(Number(grade));
  }

  @Post('submit')
  async submitWriting(
    @Body() body: { character: string; handwritingData: string; score: number; feedback: string[] },
  ) {
    return this.svc.saveWriting(body.character, body.handwritingData, body.score, body.feedback);
  }

  @Get('history')
  async getHistory() {
    return this.svc.getHistory();
  }
}
