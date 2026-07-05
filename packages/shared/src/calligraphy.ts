export interface Character {
  char: string;
  pinyin: string;
  strokes: number;
  difficulty: 1 | 2 | 3;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface WritingResult {
  character: string;
  handwritingData: string;
  score: number;
  feedback: string[];
  createdAt: string;
}

export interface PracticeHistory {
  id: string;
  character: string;
  score: number;
  createdAt: string;
}

export interface EvaluationResult {
  score: number;
  coverage: number;
  precision: number;
  centerOffset: number;
  strokeCount: number;
  feedback: string[];
}
