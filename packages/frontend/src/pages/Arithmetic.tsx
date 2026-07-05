import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HandwritingPanel from '../components/canvas/HandwritingPanel';
import type { HandwritingPanelHandle } from '../components/canvas/HandwritingPanel';
import { recognizeDigit } from '../services/digitRecognizer';
import { fetchProblems, submitPractice } from '../services/problems';
import type { Problem, AnswerResult } from '../services/problems';

type Phase = 'config' | 'practice' | 'result';

const GRADES = [
  { value: 1, label: '一年级' },
  { value: 2, label: '二年级' },
  { value: 3, label: '三年级' },
  { value: 4, label: '四年级' },
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
];

const OPERATORS = [
  { value: '+', label: '加法' },
  { value: '-', label: '减法' },
  { value: '×', label: '乘法' },
  { value: '÷', label: '除法' },
  { value: 'mixed', label: '混合' },
];

export default function Arithmetic() {
  const [phase, setPhase] = useState<Phase>('config');
  const [grade, setGrade] = useState(1);
  const [operator, setOperator] = useState('mixed');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedValue, setRecognizedValue] = useState<number | null>(null);
  const [sessionResult, setSessionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HandwritingPanelHandle>(null);

  const startPractice = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const probs = await fetchProblems(grade, 10);
      setProblems(probs);
      setCurrentIdx(0);
      setResults([]);
      setRecognizedValue(null);
      setPhase('practice');
    } catch {
      setError('出题失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }, [grade]);

  const currentProblem = problems[currentIdx];

  const handleStrokeEnd = useCallback(async (imageData: ImageData) => {
    setRecognizing(true);
    try {
      const digit = await recognizeDigit(imageData);
      setRecognizedValue(digit);
    } finally {
      setRecognizing(false);
    }
  }, []);

  const submitAnswer = useCallback(() => {
    if (!currentProblem || recognizedValue === null) return;

    const isCorrect = recognizedValue === currentProblem.answer;
    const result: AnswerResult = {
      problemId: currentProblem.id,
      expected: currentProblem.answer,
      recognized: recognizedValue,
      status: isCorrect ? 'correct' : 'wrong',
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (currentIdx + 1 >= problems.length) {
      setSubmitting(true);
      submitPractice(grade, newResults).then(setSessionResult).finally(() => setSubmitting(false));
      setPhase('result');
    } else {
      setCurrentIdx((i) => i + 1);
      setRecognizedValue(null);
      panelRef.current?.clear();
    }
  }, [currentProblem, recognizedValue, results, currentIdx, problems, grade]);

  const restart = useCallback(() => {
    setPhase('config');
    setProblems([]);
    setResults([]);
    setRecognizedValue(null);
    setSessionResult(null);
  }, []);

  if (phase === 'config') {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="font-display text-3xl text-kid-green">算数练习</h1>
        </div>
        <div className="kid-card space-y-6">
          <div>
            <label className="block text-lg font-medium mb-2">选择年级</label>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGrade(g.value)}
                  className={`kid-button ${grade === g.value ? 'bg-kid-green text-white' : 'bg-gray-100 text-gray-600'}`}
                  type="button"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-lg font-medium mb-2">题型</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperator(op.value)}
                  className={`kid-button ${operator === op.value ? 'bg-kid-blue text-white' : 'bg-gray-100 text-gray-600'}`}
                  type="button"
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            onClick={startPractice}
            disabled={loading}
            className="kid-button w-full bg-gradient-to-r from-kid-green to-green-400 text-white text-xl"
            type="button"
          >
            {loading ? '出题中...' : '开始练习'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'practice' && currentProblem) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="font-display text-2xl text-kid-green">算数练习</h1>
          <span className="ml-auto text-gray-500">
            {currentIdx + 1} / {problems.length}
          </span>
        </div>

        <div className="kid-card mb-4 text-center">
          <p className="text-4xl font-bold font-display py-6 text-gray-800">
            {currentProblem.expression}
            <span className="ml-4 text-2xl text-gray-400">?</span>
          </p>
        </div>

        <div className="kid-card">
          <p className="text-sm text-gray-500 mb-2">
            在下方写出答案（数字）
          </p>
          <HandwritingPanel
            ref={panelRef}
            width={400}
            height={200}
            lineWidth={6}
            color="#2563eb"
            onStrokeEnd={handleStrokeEnd}
            className="mb-3"
          />
          {recognizing && (
            <p className="text-kid-blue text-center">识别中...</p>
          )}
          {recognizedValue !== null && (
            <div className="text-center py-2">
              <span className="text-lg font-medium">
                识别结果：<span className="text-2xl font-bold text-kid-blue">{recognizedValue}</span>
              </span>
            </div>
          )}
          {submitting && <p className="text-kid-blue text-sm text-center">保存中...</p>}
          <button
            onClick={submitAnswer}
            disabled={recognizedValue === null}
            className="kid-button w-full bg-gradient-to-r from-kid-blue to-blue-400 text-white mt-2"
            type="button"
          >
            提交答案
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const correctCount = results.filter((r) => r.status === 'correct').length;
    const score = Math.round((correctCount / results.length) * 100);
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="font-display text-3xl text-kid-green">练习结果</h1>
        </div>
        <div className="kid-card text-center space-y-4">
          <div className="text-6xl font-display">
            {score >= 90 ? '🏆' : score >= 60 ? '👍' : '💪'}
          </div>
          <p className="text-2xl font-bold">
            {correctCount} / {results.length}
          </p>
          <p className="text-lg text-gray-500">
            正确率：{score}%
          </p>
          <div className="space-y-2 mt-4">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-3 rounded-xl ${
                  r.status === 'correct' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className="font-medium">
                  第 {i + 1} 题
                </span>
                <span className={r.status === 'correct' ? 'text-green-600' : 'text-red-600'}>
                  {r.status === 'correct' ? '✓' : `✗ (预期: ${r.expected})`}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={restart}
            className="kid-button w-full bg-gradient-to-r from-kid-green to-green-400 text-white"
            type="button"
          >
            再来一次
          </button>
        </div>
      </div>
    );
  }

  return null;
}
