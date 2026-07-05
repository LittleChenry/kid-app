export type Operator = '+' | '-' | '×' | '÷';

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export interface ProblemConfig {
  grade: Grade;
  operator: Operator | 'mixed';
  count: number;
  maxNumber?: number;
}

export interface Problem {
  id: string;
  expression: string;
  answer: number;
  operator: Operator;
  operandA: number;
  operandB: number;
  grade: Grade;
}

export type ResultStatus = 'correct' | 'wrong';

export interface AnswerResult {
  problemId: string;
  expected: number;
  recognized: number | null;
  status: ResultStatus;
  handwritingData?: string;
}

export interface PracticeSession {
  id: string;
  problems: Problem[];
  results: AnswerResult[];
  score: number;
  totalTime: number;
  createdAt: string;
  grade: Grade;
}
