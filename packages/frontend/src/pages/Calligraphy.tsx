import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HandwritingPanel from '../components/canvas/HandwritingPanel';
import type { HandwritingPanelHandle } from '../components/canvas/HandwritingPanel';
import StrokeAnimationOverlay from '../components/canvas/StrokeAnimationOverlay';
import { evaluateHandwriting } from '../services/characterEvaluator';
import { api } from '../services/api';

type Phase = 'select' | 'practice' | 'sessionComplete' | 'sessions';

interface CharData {
  char: string; pinyin: string; strokes: number;
  difficulty: 1 | 2 | 3; grade: number;
  radical: string; definition: string; examples: string[];
  decomposition: string; strokePaths: number[][][];
}

interface SessionRecord {
  character: string;
  handwritingData: string;
  score: number;
  feedback: string;
}

const DIFFICULTIES = [
  { value: 1, label: '初级', desc: '基础汉字 30字', color: 'from-green-400 to-emerald-500' },
  { value: 2, label: '中级', desc: '进阶汉字 20字', color: 'from-orange-400 to-amber-500' },
  { value: 3, label: '高级', desc: '复杂汉字 10字', color: 'from-red-400 to-rose-500' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

function renderStar(score: number): string {
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 70) return '⭐⭐';
  return '⭐';
}

export default function Calligraphy() {
  const [phase, setPhase] = useState<Phase>('select');
  const [difficulty, setDifficulty] = useState(1);
  const [sessionChars, setSessionChars] = useState<CharData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; feedback: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [charCounts, setCharCounts] = useState<Record<number, number>>({});
  const panelRef = useRef<HandwritingPanelHandle>(null);

  const currentChar = sessionChars[currentIdx] || null;

  useEffect(() => {
    api.calligraphy.getCharacterCounts().then(counts => {
      const map: Record<number, number> = {};
      counts.forEach(c => { map[c.difficulty] = c._count; });
      setCharCounts(map);
    });
  }, []);

  useEffect(() => {
    if (phase === 'sessions') {
      api.calligraphy.getSessions().then(setHistory);
    }
  }, [phase]);

  const startPractice = useCallback(async (diff: number) => {
    setDifficulty(diff);
    setLoading(true);
    try {
      const recent = await api.calligraphy.getRecentSessionChars(diff);
      let chars: CharData[] = await api.calligraphy.getCharactersByDifficulty(diff, recent);
      if (chars.length < 10) {
        chars = await api.calligraphy.getCharactersByDifficulty(diff);
      }
      if (chars.length === 0) return;
      const selected = shuffle(chars).slice(0, Math.min(10, chars.length));
      const session = await api.calligraphy.startSession(diff);
      setSessionId(session.id);
      setSessionChars(selected);
      setCurrentIdx(0);
      setRecords([]);
      setShowSuccess(false);
      setLastResult(null);
      setReplayKey(0);
      setPhase('practice');
    } finally {
      setLoading(false);
    }
  }, []);

  const advanceToNextChar = useCallback(async (
    result: { score: number; feedback: string },
    updatedRecords: SessionRecord[],
    isLast: boolean,
  ) => {
    setShowSuccess(true);
    setLastResult(result);
    setRecords(updatedRecords);
    if (isLast && updatedRecords.length > 0) {
      try {
        await api.calligraphy.completeSession(sessionId, updatedRecords);
      } catch {}
    }
    setTimeout(() => {
      if (isLast) {
        setPhase('sessionComplete');
      } else {
        setCurrentIdx(currentIdx + 1);
        setReplayKey(0);
        setLastResult(null);
        setShowSuccess(false);
        panelRef.current?.clear();
      }
    }, 800);
  }, [currentIdx, sessionChars.length, sessionId]);

  const handleStrokeEnd = useCallback(() => {
    if (!currentChar || !panelRef.current || showSuccess || lastResult) return;

    const strokes = panelRef.current.getStrokes();
    if (strokes.length < currentChar.strokes) return;

    const result = evaluateHandwriting(
      strokes,
      currentChar.char,
      400,
      340,
    );

    if (result.coverage > 65 && result.precision > 50) {
      const dataUrl = panelRef.current.toDataURL();
      const newRecord: SessionRecord = {
        character: currentChar.char,
        handwritingData: dataUrl,
        score: result.score,
        feedback: result.feedback.join('；'),
      };
      const updatedRecords = records.concat(newRecord);
      const isLast = currentIdx + 1 >= sessionChars.length;
      advanceToNextChar(
        { score: result.score, feedback: result.feedback.join('；') },
        updatedRecords,
        isLast,
      );
    } else {
      setLastResult({
        score: result.score,
        feedback: result.feedback[0] || '再试试，注意笔画的位置和比例！',
      });
    }
  }, [currentChar, showSuccess, advanceToNextChar, records, currentIdx, sessionChars.length, lastResult]);

  const handleRetry = useCallback(() => {
    setLastResult(null);
    setShowSuccess(false);
    panelRef.current?.clear();
  }, []);

  const handleSkip = useCallback(() => {
    const skipRecord: SessionRecord = {
      character: currentChar!.char,
      handwritingData: '',
      score: 0,
      feedback: '跳过',
    };
    const updatedRecords = records.concat(skipRecord);
    const isLast = currentIdx + 1 >= sessionChars.length;
    advanceToNextChar(
      { score: 0, feedback: '跳过' },
      updatedRecords,
      isLast,
    );
  }, [advanceToNextChar, currentChar, records, currentIdx, sessionChars.length]);

  const formatTime = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // ===== Select Phase =====
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
            onClick={() => setPhase('sessions')}
            className="ml-auto kid-button bg-gray-100 text-gray-600 text-sm px-4 py-2"
            type="button"
          >
            作品墙
          </button>
        </div>

        <div className="kid-card">
          <h2 className="font-display text-xl mb-2">选择练习难度</h2>
          <p className="text-sm text-gray-400 mb-6">每次随机练习 10 个字，一笔一划跟着写</p>

          <div className="space-y-3">
            {DIFFICULTIES.map((d) => {
              const count = charCounts[d.value];
              const suffix = count === undefined ? '...' : `${count}`;
              const prefix = d.value === 1 ? '基础汉字' : d.value === 2 ? '进阶汉字' : '复杂汉字';
              return (
              <button
                key={d.value}
                onClick={() => startPractice(d.value)}
                disabled={loading}
                className={`w-full p-5 rounded-2xl text-white bg-gradient-to-r ${d.color}
                  hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50`}
                type="button"
              >
                <div className="text-xl font-bold">{d.label}</div>
                <div className="text-sm opacity-80 mt-1">{prefix} {suffix}字</div>
              </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ===== Practice Phase =====
  if (phase === 'practice' && currentChar) {
    const avgScore = records.length > 0
      ? Math.round(records.reduce((s, r) => s + r.score, 0) / records.length)
      : 0;

    return (
      <div className="page-container">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setPhase('select')}
            className="text-gray-500 flex items-center gap-1"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-400">
            第 {currentIdx + 1}/{sessionChars.length} 字 · 平均 {avgScore}分
          </span>
        </div>

        <div className="kid-card relative overflow-hidden">
          {showSuccess && (
            <div className="absolute inset-0 z-10 bg-green-50/90 flex flex-col items-center justify-center rounded-2xl animate-fade-in">
              <div className="text-6xl mb-2">🌟</div>
              <div className="text-2xl font-bold text-green-600">{lastResult?.score}分</div>
              <div className="text-sm text-green-500 mt-1">太棒了！进入下一个字...</div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className="text-3xl font-bold text-gray-700 font-kai">{currentChar.char}</div>
            <button
              onClick={() => speak(currentChar.char)}
              className="w-9 h-9 rounded-full bg-kid-orange text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              type="button"
              title="点击发音"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.77l4.537-4.537a.5.5 0 01.845.37V19.4a.5.5 0 01-.845.37L6.5 15.23H3.5a.5.5 0 01-.5-.5V9.27a.5.5 0 01.5-.5h3z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
            <span>{currentChar.pinyin}</span>
            <span>部首：{currentChar.radical}</span>
            <span>笔画：{currentChar.strokes}画</span>
            <span>结构：{currentChar.decomposition}</span>
          </div>

          <div className="relative">
            <div className="absolute inset-0 z-0">
              <StrokeAnimationOverlay key={`${currentChar.char}-${replayKey}`} character={currentChar.char} />
            </div>
            <HandwritingPanel
              ref={panelRef}
              lineWidth={8}
              color="#333"
              showGrid
              gridType="tian"
              onUserStrokeEnd={handleStrokeEnd}
            />
            <button
              onClick={() => setReplayKey(k => k + 1)}
              className="absolute bottom-2 right-2 z-20 w-8 h-8 rounded-full
                bg-white/80 border border-gray-300 flex items-center justify-center
                text-gray-500 hover:bg-white active:scale-95 transition-all shadow-sm"
              type="button"
              title="重播动画"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="kid-card mt-3">
          <div className="text-sm font-medium text-gray-500 mb-1">释义</div>
          <p className="text-gray-700 mb-1">{currentChar.definition}</p>
          <div className="text-sm text-gray-400">
            组词：{(Array.isArray(currentChar.examples) ? currentChar.examples : (typeof currentChar.examples === 'string' ? JSON.parse(currentChar.examples || '[]') : [])).join('、')}
          </div>
        </div>

        {lastResult && !showSuccess && (
          <div className="mt-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-sm text-amber-700 mb-2">得分：{lastResult.score}分 · {lastResult.feedback}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 kid-button bg-amber-100 text-amber-700"
                type="button"
              >
                重写
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 kid-button bg-gray-100 text-gray-600"
                type="button"
              >
                换一个
              </button>
            </div>
          </div>
        )}

        {records.length > 0 && currentIdx < sessionChars.length - 1 && !showSuccess && !lastResult && (
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleRetry}
              className="flex-1 kid-button bg-gray-100 text-gray-600"
              type="button"
            >
              重写
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 kid-button bg-gray-100 text-gray-600"
              type="button"
            >
              跳过
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== Session Complete Phase =====
  if (phase === 'sessionComplete') {
    const avgScore = records.length > 0
      ? Math.round(records.reduce((s, r) => s + r.score, 0) / records.length)
      : 0;
    const passed = records.filter(r => r.score >= 70).length;

    return (
      <div className="page-container">
        <div className="kid-card text-center space-y-4">
          <div className="text-5xl">{avgScore >= 80 ? '🎉' : avgScore >= 60 ? '👍' : '💪'}</div>
          <h2 className="font-display text-2xl">练习完成！</h2>

          <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-2xl">
            <span className="text-3xl font-bold">{avgScore}</span>
            <span className="text-lg text-gray-600"> 平均分</span>
          </div>

          <p className="text-sm text-gray-400">
            {DIFFICULTIES.find(d => d.value === difficulty)?.label} · 通过 {passed}/{records.length} 字
          </p>

          <div className="space-y-2 text-left">
            {records.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <img src={r.handwritingData} alt={r.character}
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-300 shrink-0"
                />
                <span className="text-2xl w-6 text-center shrink-0">{r.character}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.score}分</span>
                    <span className="text-xs">{renderStar(r.score)}</span>
                  </div>
                  <p className="text-xs text-gray-400 break-words">{r.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Link to="/" className="kid-button flex-1 bg-gray-100 text-gray-600 text-center">
            返回首页
          </Link>
          <button
            onClick={() => setPhase('sessions')}
            className="kid-button flex-1 bg-gradient-to-r from-kid-orange to-orange-400 text-white"
            type="button"
          >
            查看作品墙
          </button>
        </div>
      </div>
    );
  }

  // ===== Sessions / History Phase =====
  if (phase === 'sessions') {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPhase('select')}
            className="text-gray-500 flex items-center gap-1"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h1 className="font-display text-3xl text-kid-orange">作品墙</h1>
        </div>

        <div className="kid-card">
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">还没有练习记录，去写一写吧！</p>
          ) : (
            <div className="space-y-3">
              {history.map((h: any) => {
                const recs = h.records || [];
                const passed = recs.filter((r: any) => r.score >= 70).length;
                return (
                  <div key={h.id} className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {DIFFICULTIES.find(d => d.value === h.difficulty)?.label || `难度${h.difficulty}`}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(h.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>平均分 <strong>{Math.round(h.score)}</strong></span>
                      <span>完成 <strong>{h.totalChars}</strong> 字</span>
                      <span>通过 <strong className="text-green-600">{passed}</strong>/{recs.length}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {recs.map((r: any, i: number) => (
                        <div key={i} className="relative" title={`${r.character}: ${r.score}分`}>
                          <img src={r.handwritingData} alt={r.character}
                            className={`w-10 h-10 rounded-lg object-contain bg-white border-2
                              ${r.score >= 70 ? 'border-green-400' : 'border-gray-300'}`}
                          />
                          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px]
                            font-bold flex items-center justify-center text-white
                            ${r.score >= 70 ? 'bg-green-500' : 'bg-gray-400'}`}>
                            {r.character}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
