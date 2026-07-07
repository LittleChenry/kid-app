export interface Character {
  char: string;
  pinyin: string;
  strokes: number;
  difficulty: 1 | 2 | 3;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  radical: string;
  definition: string;
  examples: string[];
  decomposition: string;
  strokePaths: { x: number; y: number }[][];
}

export interface WritingRecord {
  id: string;
  sessionId: string;
  character: string;
  handwritingData: string;
  score: number;
  feedback: string;
  createdAt: string;
}

export interface PracticeSession {
  id: string;
  difficulty: number;
  score: number;
  totalChars: number;
  createdAt: string;
  records?: WritingRecord[];
}

export interface EvaluationResult {
  score: number;
  coverage: number;
  precision: number;
  centerOffset: number;
  strokeCount: number;
  feedback: string[];
}
