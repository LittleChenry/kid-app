import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ArithmeticService } from './arithmetic.service.js';
import type { ProblemConfig, AnswerResult, PracticeSession } from '@kid-app/shared';

@Controller('arithmetic')
export class ArithmeticController {
  constructor(private readonly svc: ArithmeticService) {}

  @Get('problems')
  getProblems(@Query() config: ProblemConfig) {
    return this.svc.generateProblems(config);
  }

  @Post('submit')
  async submitPractice(
    @Body() body: { problems: ProblemConfig; results: AnswerResult[] },
  ): Promise<PracticeSession> {
    return this.svc.savePractice(body.problems, body.results);
  }

  @Get('history')
  async getHistory() {
    return this.svc.getHistory();
  }

  @Get('history/:id')
  async getHistoryById(@Param('id') id: string) {
    return this.svc.getHistoryById(id);
  }
}
