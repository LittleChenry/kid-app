import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CalligraphyService {
  constructor(private prisma: PrismaService) {}

  getCharacters() {
    return this.characters;
  }

  getCharactersByGrade(grade: number) {
    return this.characters.filter((c) => c.grade === grade);
  }

  async saveWriting(character: string, handwritingData: string, score: number, feedback: string[]) {
    const record = await this.prisma.writingRecord.create({
      data: {
        character,
        handwritingData,
        score,
        feedback: JSON.stringify(feedback),
      },
    });
    return {
      ...record,
      feedback: JSON.parse(record.feedback),
    };
  }

  async getHistory() {
    const records = await this.prisma.writingRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return records.map((r) => ({
      ...r,
      feedback: JSON.parse(r.feedback),
    }));
  }

  private characters = [
    { char: '一', pinyin: 'yī', strokes: 1, grade: 1, difficulty: 1 },
    { char: '二', pinyin: 'èr', strokes: 2, grade: 1, difficulty: 1 },
    { char: '三', pinyin: 'sān', strokes: 3, grade: 1, difficulty: 1 },
    { char: '四', pinyin: 'sì', strokes: 5, grade: 1, difficulty: 1 },
    { char: '五', pinyin: 'wǔ', strokes: 4, grade: 1, difficulty: 1 },
    { char: '六', pinyin: 'liù', strokes: 4, grade: 1, difficulty: 1 },
    { char: '七', pinyin: 'qī', strokes: 2, grade: 1, difficulty: 1 },
    { char: '八', pinyin: 'bā', strokes: 2, grade: 1, difficulty: 1 },
    { char: '九', pinyin: 'jiǔ', strokes: 2, grade: 1, difficulty: 1 },
    { char: '十', pinyin: 'shí', strokes: 2, grade: 1, difficulty: 1 },
    { char: '人', pinyin: 'rén', strokes: 2, grade: 1, difficulty: 1 },
    { char: '大', pinyin: 'dà', strokes: 3, grade: 1, difficulty: 1 },
    { char: '小', pinyin: 'xiǎo', strokes: 3, grade: 1, difficulty: 1 },
    { char: '上', pinyin: 'shàng', strokes: 3, grade: 1, difficulty: 1 },
    { char: '下', pinyin: 'xià', strokes: 3, grade: 1, difficulty: 1 },
  ] as const;
}
