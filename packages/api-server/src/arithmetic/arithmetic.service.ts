import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Problem, ProblemConfig, AnswerResult, PracticeSession, Operator, Grade } from '@kid-app/shared';

@Injectable()
export class ArithmeticService {
  constructor(private prisma: PrismaService) {}

  generateProblems(config: ProblemConfig): Problem[] {
    const { grade, count = 10, maxNumber } = config;
    const op = config.operator || 'mixed';
    const operators = op === 'mixed'
      ? this.getOperatorsForGrade(grade)
      : [op];

    const problems: Problem[] = [];
    for (let i = 0; i < count; i++) {
      const operator = operators[Math.floor(Math.random() * operators.length)];
      const problem = this.generateOne(grade, operator, maxNumber);
      problems.push(problem);
    }
    return problems;
  }

  private generateOne(grade: Grade, operator: Operator, maxNumber?: number): Problem {
    const numRange = maxNumber ?? this.getNumberRange(grade);
    let a: number, b: number, answer: number;

    switch (operator) {
      case '+':
        a = this.randInt(1, numRange);
        b = this.randInt(1, numRange);
        answer = a + b;
        break;
      case '-':
        a = this.randInt(1, numRange);
        b = this.randInt(1, a);
        answer = a - b;
        break;
      case '×':
        a = this.randInt(1, Math.min(numRange, 9));
        b = this.randInt(1, Math.min(numRange, 9));
        answer = a * b;
        break;
      case '÷':
        b = this.randInt(1, Math.min(numRange, 9));
        answer = this.randInt(1, Math.min(numRange, 9));
        a = b * answer;
        break;
    }

    return {
      id: crypto.randomUUID(),
      expression: `${a} ${operator} ${b} =`,
      answer,
      operator,
      operandA: a,
      operandB: b,
      grade,
    };
  }

  async savePractice(
    config: ProblemConfig,
    results: AnswerResult[],
  ): Promise<PracticeSession> {
    const correctCount = results.filter((r) => r.status === 'correct').length;
    const totalTime = 0;

    const record = await this.prisma.practice.create({
      data: {
        grade: config.grade,
        score: (correctCount / results.length) * 100,
        totalTime,
        problems: JSON.stringify(results.map((r) => r.problemId)),
        results: JSON.stringify(results),
      },
    });

    return {
      id: record.id,
      problems: [],
      results,
      score: record.score,
      totalTime: record.totalTime,
      createdAt: record.createdAt.toISOString(),
      grade: record.grade as Grade,
    };
  }

  async getHistory() {
    const records = await this.prisma.practice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return records.map((r) => ({
      id: r.id,
      grade: r.grade,
      score: r.score,
      totalTime: r.totalTime,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getHistoryById(id: string) {
    const r = await this.prisma.practice.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      grade: r.grade,
      score: r.score,
      totalTime: r.totalTime,
      problems: JSON.parse(r.problems),
      results: JSON.parse(r.results),
      createdAt: r.createdAt.toISOString(),
    };
  }

  private getOperatorsForGrade(grade: Grade): Operator[] {
    if (grade <= 2) return ['+', '-'];
    if (grade <= 4) return ['+', '-', '×', '÷'];
    return ['+', '-', '×', '÷'];
  }

  private getNumberRange(grade: Grade): number {
    if (grade <= 1) return 20;
    if (grade <= 2) return 100;
    if (grade <= 4) return 1000;
    return 10000;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
