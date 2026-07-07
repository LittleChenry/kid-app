import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CalligraphyService {
  constructor(private prisma: PrismaService) {}

  async getCharactersByDifficulty(difficulty: number, exclude?: string[]) {
    const where: any = { difficulty };
    if (exclude?.length) {
      where.char = { notIn: exclude };
    }
    const chars = await this.prisma.character.findMany({
      where,
      select: {
        char: true,
        pinyin: true,
        strokes: true,
        difficulty: true,
        grade: true,
        radical: true,
        definition: true,
        examples: true,
        decomposition: true,
      },
    });
    return chars.map(c => ({
      ...c,
      definition: c.definition ?? '',
      examples: Array.isArray(c.examples) ? c.examples : [],
      strokePaths: [],
    }));
  }

  async getCharData(char: string) {
    const data = await this.prisma.character.findUnique({
      where: { char },
      select: {
        char: true,
        pinyin: true,
        strokes: true,
        difficulty: true,
        grade: true,
        radical: true,
        definition: true,
        examples: true,
        decomposition: true,
        hanziWriterData: true,
      },
    });
    if (!data) return null;
    return {
      ...data,
      definition: data.definition ?? '',
      examples: Array.isArray(data.examples) ? data.examples : [],
    };
  }

  async getRecentSessionChars(difficulty: number, limit = 5) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { difficulty, totalChars: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { records: { select: { character: true } } },
    });
    return [...new Set(sessions.flatMap(s => s.records.map(r => r.character)))];
  }

  async getCharacterCounts() {
    return this.prisma.character.groupBy({
      by: ['difficulty'],
      _count: true,
    });
  }

  async startSession(difficulty: number) {
    return this.prisma.practiceSession.create({
      data: { difficulty, score: 0, totalChars: 0 },
    });
  }

  async completeSession(sessionId: string, records: { character: string; handwritingData: string; score: number; feedback: string }[]) {
    const totalScore = records.reduce((s, r) => s + r.score, 0);
    const avgScore = records.length > 0 ? totalScore / records.length : 0;

    for (const record of records) {
      await this.prisma.writingRecord.create({
        data: {
          sessionId,
          character: record.character,
          handwritingData: record.handwritingData,
          score: record.score,
          feedback: record.feedback,
        },
      });
    }

    return this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: { score: avgScore, totalChars: records.length },
    });
  }

  async getSessions() {
    return this.prisma.practiceSession.findMany({
      where: { totalChars: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { records: true },
    });
  }

  async getSession(id: string) {
    return this.prisma.practiceSession.findUnique({
      where: { id },
      include: { records: true },
    });
  }
}
