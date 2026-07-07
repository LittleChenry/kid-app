import { PrismaClient } from '@prisma/client';
import cnchar from 'cnchar';
import radical from 'cnchar-radical';
import wordsPlugin from 'cnchar-words';
import { CHARACTER_GRADES } from './calligraphy/character-grades.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

cnchar.use(radical);
cnchar.use(wordsPlugin);

const prisma = new PrismaClient();
const definitions = JSON.parse(readFileSync(resolve(import.meta.dirname, './calligraphy/definitions.json'), 'utf-8'));

const HW_DATA_DIR = resolve(import.meta.dirname, '../node_modules/hanzi-writer-data');

function loadHanziWriterData(char: string): string | null {
  try {
    const p = resolve(HW_DATA_DIR, `${char}.json`);
    return readFileSync(p, 'utf-8');
  } catch { return null; }
}

async function seed() {
  console.log('Seeding characters...');
  const seen = new Set<string>();

  for (const gc of CHARACTER_GRADES) {
    if (seen.has(gc.char)) continue;
    seen.add(gc.char);

    const strokes = cnchar.stroke(gc.char) as unknown as number;
    const difficulty = strokes < 5 ? 1 : strokes <= 9 ? 2 : 3;
    const pinyin = cnchar.spell(gc.char, 'tone') as unknown as string;
    const radicalResult = cnchar.radical(gc.char) as unknown as { radical: string; struct: string }[];
    
    await prisma.character.upsert({
      where: { char: gc.char },
      update: {
        strokes, difficulty, pinyin,
        radical: radicalResult?.[0]?.radical || '',
        decomposition: radicalResult?.[0]?.struct || '',
        definition: definitions[gc.char] || '',
        examples: JSON.stringify(cnchar.words(gc.char)?.slice(0, 5) || []),
        hanziWriterData: loadHanziWriterData(gc.char),
      },
      create: {
        char: gc.char,
        strokes, difficulty, pinyin,
        grade: gc.grade,
        radical: radicalResult?.[0]?.radical || '',
        decomposition: radicalResult?.[0]?.struct || '',
        definition: definitions[gc.char] || '',
        examples: JSON.stringify(cnchar.words(gc.char)?.slice(0, 5) || []),
        hanziWriterData: loadHanziWriterData(gc.char),
      },
    });
  }
  console.log('Seed complete!');
}

seed().finally(() => prisma.$disconnect());
