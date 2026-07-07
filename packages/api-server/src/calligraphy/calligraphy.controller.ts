import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CalligraphyService } from './calligraphy.service.js';

@Controller('calligraphy')
export class CalligraphyController {
  constructor(private readonly svc: CalligraphyService) {}

  @Get('characters/counts')
  async getCharacterCounts() {
    return this.svc.getCharacterCounts();
  }

  @Get('characters')
  async getCharacters() {
    return this.svc.getCharactersByDifficulty(1);
  }

  @Get('characters/difficulty/:level')
  async getCharactersByDifficulty(
    @Param('level') level: string,
    @Query('exclude') exclude?: string,
  ) {
    const excludeList = exclude ? exclude.split(',') : undefined;
    return this.svc.getCharactersByDifficulty(Number(level), excludeList);
  }

  @Get('characters/:char')
  async getCharData(@Param('char') char: string) {
    return this.svc.getCharData(char);
  }

  @Get('sessions/recent/:difficulty')
  async getRecentSessionChars(@Param('difficulty') difficulty: string) {
    return this.svc.getRecentSessionChars(Number(difficulty));
  }

  @Post('session/start')
  async startSession(@Body() body: { difficulty: number }) {
    return this.svc.startSession(body.difficulty);
  }

  @Post('session/complete')
  async completeSession(
    @Body() body: { sessionId: string; records: { character: string; handwritingData: string; score: number; feedback: string }[] },
  ) {
    return this.svc.completeSession(body.sessionId, body.records);
  }

  @Get('sessions')
  async getSessions() {
    return this.svc.getSessions();
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.svc.getSession(id);
  }
}
