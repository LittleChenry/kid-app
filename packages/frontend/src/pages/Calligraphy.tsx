import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HandwritingPanel from '../components/canvas/HandwritingPanel';
import type { HandwritingPanelHandle } from '../components/canvas/HandwritingPanel';
import { evaluateHandwriting } from '../services/characterEvaluator';
import { api } from '../services/api';
import type { EvaluationResult, Character } from '@kid-app/shared';

type Phase = 'select' | 'writing' | 'result';

const GRADES = [
  { value: 1, label: '一年级' },
  { value: 2, label: '二年级' },
  { value: 3, label: '三年级' },
  { value: 4, label: '四年级' },
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
];

function getGradeLabel(g: number) {
  return GRADES.find((gr) => gr.value === g)?.label ?? `年级${g}`;
}

function renderStar(score: number): string {
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 70) return '⭐⭐';
  return '⭐';
}

export default function Calligraphy() {
  const [phase, setPhase] = useState<Phase>('select');
  const [grade, setGrade] = useState(1);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HandwritingPanelHandle>(null);

  useEffect(() => {
    if (phase === 'select') {
      api.calligraphy.getCharacters(grade).then(setCharacters);
      api.calligraphy.getHistory().then(setHistory);
    }
  }, [phase, grade]);

  const startWriting = useCallback((char: Character) => {
    setSelectedChar(char);
    setResult(null);
    setPhase('writing');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedChar || !panelRef.current) return;
    const strokes = panelRef.current.getStrokes();
    if (strokes.length === 0) return;

    const evaluation = evaluateHandwriting(
      strokes,
      selectedChar.char,
      400,
      340,
    );
    setResult(evaluation);

    setSaving(true);
    api.calligraphy.submit({
      character: selectedChar.char,
      handwritingData: panelRef.current.toDataURL(),
      score: evaluation.score,
      feedback: evaluation.feedback,
    }).finally(() => setSaving(false));

    setPhase('result');
  }, [selectedChar]);

  const retry = useCallback(() => {
    setResult(null);
    panelRef.current?.clear();
    setPhase('writing');
  }, []);

  const selectAnother = useCallback(() => {
    setSelectedChar(null);
    setResult(null);
    setPhase('select');
  }, []);

  if (phase === 'select') {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="font-display text-3xl text-kid-orange">字帖</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="ml-auto kid-button bg-gray-100 text-gray-600 text-sm px-4 py-2"
            type="button"
          >
            {showHistory ? '选字' : '作品墙'}
          </button>
        </div>

        {showHistory ? (
          <div className="kid-card">
            <h2 className="font-display text-xl mb-4">作品墙</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-8">还没有练习记录，去写一个字吧！</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {history.map((h: any) => (
                  <div key={h.id} className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-3xl mb-1">{h.character}</div>
                    <div className="text-sm text-gray-500">{h.score}分</div>
                    <div className="text-xs">{renderStar(h.score)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {GRADES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGrade(g.value)}
                  className={`kid-button text-sm px-4 py-2 whitespace-nowrap ${
                    grade === g.value ? 'bg-kid-orange text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                  type="button"
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="kid-card">
              <h2 className="font-display text-xl mb-4">
                {getGradeLabel(grade)} · 选择要练习的字
              </h2>
              <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                {characters.map((c) => (
                  <button
                    key={c.char}
                    onClick={() => startWriting(c)}
                    className="aspect-square flex items-center justify-center text-2xl font-bold
                      bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl
                      hover:from-orange-100 hover:to-yellow-100
                      active:scale-95 transition-all border border-orange-100"
                    type="button"
                  >
                    {c.char}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === 'writing' && selectedChar) {
    return (
      <div className="page-container">
        <button
          onClick={selectAnother}
          className="text-gray-500 mb-4 flex items-center gap-1"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          返回选字
        </button>

        <div className="text-center mb-4">
          <p className="text-sm text-gray-400">
            拼音：{selectedChar.pinyin} · 笔画：{selectedChar.strokes}画
          </p>
        </div>

        <div className="kid-card">
          <div className="text-center mb-3">
            <span className="text-5xl font-bold text-gray-300">{selectedChar.char}</span>
            <p className="text-sm text-gray-400 mt-1">参考范字</p>
          </div>

          <HandwritingPanel
            ref={panelRef}
            width={400}
            height={340}
            lineWidth={8}
            color="#333"
            showGrid
            gridType="tian"
            referenceChar={selectedChar.char}
            referenceColor="rgba(244, 114, 182, 0.25)"
            referenceOpacity={0.25}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="kid-button w-full bg-gradient-to-r from-kid-orange to-orange-400 text-white text-xl mt-4"
          type="button"
        >
          提交评价
        </button>
      </div>
    );
  }

  if (phase === 'result' && selectedChar && result) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="font-display text-3xl text-kid-orange">评价结果</h1>
        </div>

        <div className="kid-card text-center space-y-4">
          <div className="text-6xl">
            {result.score >= 90 ? '🌟' : result.score >= 70 ? '👍' : '💪'}
          </div>

          <div>
            <span className="text-5xl font-bold text-gray-700">{selectedChar.char}</span>
            <p className="text-sm text-gray-400 mt-1">{selectedChar.pinyin} · {selectedChar.strokes}画</p>
          </div>

          <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-2xl">
            <span className="text-3xl font-bold">{result.score}</span>
            <span className="text-lg text-gray-600"> 分</span>
          </div>

          <div className="text-2xl">{renderStar(result.score)}</div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-green-600 font-bold">{result.coverage}%</p>
              <p className="text-gray-500">覆盖度</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-blue-600 font-bold">{result.precision}%</p>
              <p className="text-gray-500">精准度</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-purple-600 font-bold">{result.strokeCount}笔</p>
              <p className="text-gray-500">书写笔数</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-yellow-600 font-bold">{result.centerOffset}%</p>
              <p className="text-gray-500">偏移</p>
            </div>
          </div>

          <div className="text-left space-y-2 bg-gray-50 rounded-2xl p-4">
            <p className="font-medium text-gray-700">评语：</p>
            {result.feedback.map((fb, i) => (
              <p key={i} className="text-gray-600 text-sm flex items-start gap-2">
                <span className="text-kid-orange mt-0.5">•</span>
                {fb}
              </p>
            ))}
          </div>

          {saving && <p className="text-kid-blue text-sm">保存中...</p>}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={retry}
            className="kid-button flex-1 bg-gray-100 text-gray-600"
            type="button"
          >
            重写一次
          </button>
          <button
            onClick={selectAnother}
            className="kid-button flex-1 bg-gradient-to-r from-kid-orange to-orange-400 text-white"
            type="button"
          >
            换一个字
          </button>
        </div>
      </div>
    );
  }

  return null;
}
