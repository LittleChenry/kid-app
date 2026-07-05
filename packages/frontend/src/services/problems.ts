import { api } from './api';

export interface Problem {
  id: string;
  expression: string;
  answer: number;
  operator: string;
  operandA: number;
  operandB: number;
  grade: number;
}

export interface AnswerResult {
  problemId: string;
  expected: number;
  recognized: number | null;
  status: 'correct' | 'wrong';
  handwritingData?: string;
}

export async function fetchProblems(
  grade: number,
  count: number = 10,
): Promise<Problem[]> {
  return api.arithmetic.getProblems({ grade, count });
}

export async function submitPractice(
  grade: number,
  results: AnswerResult[],
) {
  return api.arithmetic.submit({ problems: { grade }, results });
}
