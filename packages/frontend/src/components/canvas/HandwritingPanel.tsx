import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';

interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

export interface HandwritingPanelHandle {
  getImageData: () => ImageData | null;
  getStrokes: () => Stroke[];
  clear: () => void;
  undo: () => void;
  toDataURL: () => string;
  getStrokeImage: (index: number) => ImageData | null;
}

interface HandwritingPanelProps {
  width?: number;
  height?: number;
  lineWidth?: number;
  color?: string;
  showGrid?: boolean;
  gridType?: 'tian' | 'mi' | 'none';
  referenceChar?: string;
  referenceColor?: string;
  referenceOpacity?: number;
  onStrokeEnd?: (imageData: ImageData) => void;
  onStrokesUpdate?: (strokes: Stroke[]) => void;
  disabled?: boolean;
  className?: string;
  strokePaths?: number[][][];
  currentStrokeIdx?: number;
  completedStrokeIdx?: number;
  onUserStrokeEnd?: () => void;
}

const HandwritingPanel = forwardRef<HandwritingPanelHandle, HandwritingPanelProps>(({
  width = 400,
  height = 300,
  lineWidth = 4,
  color = '#333',
  showGrid = false,
  gridType = 'none',
  referenceChar,
  referenceColor = 'rgba(244, 114, 182, 0.35)',
  referenceOpacity = 0.35,
  onStrokeEnd,
  onStrokesUpdate,
  disabled = false,
  className = '',
  strokePaths,
  currentStrokeIdx = -1,
  completedStrokeIdx = -1,
  onUserStrokeEnd,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const [displaySize, setDisplaySize] = useState({ width, height });

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
      pressure: e.pressure || 0.5,
      time: Date.now(),
    };
  }, [dpr]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid || gridType === 'none') return;
    const w = displaySize.width;
    const h = displaySize.height;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    if (gridType === 'tian') {
      const midX = w / 2;
      const midY = h / 2;
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, h);
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.strokeRect(0, 0, w, h);
    } else if (gridType === 'mi') {
      const midX = w / 2;
      const midY = h / 2;
      ctx.strokeRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, h);
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
    }
  }, [showGrid, gridType, displaySize]);

  const drawReference = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!referenceChar) return;
    const w = displaySize.width;
    const h = displaySize.height;

    ctx.save();
    ctx.globalAlpha = referenceOpacity;
    ctx.fillStyle = referenceColor;
    ctx.font = `bold ${h * 0.78}px "Noto Sans SC", "SimSun", "STSong", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(referenceChar, w / 2, h / 2 + h * 0.02);
    ctx.restore();
  }, [referenceChar, referenceColor, referenceOpacity, displaySize]);

  const drawStrokePaths = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!strokePaths || strokePaths.length === 0) return;
    const w = displaySize.width;
    const h = displaySize.height;

    const scaleX = (w * 0.85) / 100;
    const scaleY = (h * 0.85) / 100;
    const ox = w * 0.075;
    const oy = h * 0.075;

    for (let si = 0; si < strokePaths.length; si++) {
      const path = strokePaths[si];
      if (path.length < 2) continue;

      let alpha = 0.15;
      let strokeColor = '#94a3b8';
      let lineW = 2;
      let dash: number[] = [4, 4];

      if (si < completedStrokeIdx) {
        alpha = 0.1;
        strokeColor = '#22c55e';
        lineW = 2;
        dash = [];
      } else if (si === currentStrokeIdx) {
        alpha = 0.7;
        strokeColor = '#ef4444';
        lineW = 3;
        dash = [];
      } else if (si === currentStrokeIdx + 1) {
        alpha = 0.4;
        strokeColor = '#3b82f6';
        lineW = 2.5;
        dash = [6, 4];
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dash.length > 0) ctx.setLineDash(dash);

      ctx.beginPath();
      ctx.moveTo(path[0][0] * scaleX + ox, path[0][1] * scaleY + oy);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0] * scaleX + ox, path[i][1] * scaleY + oy);
      }
      ctx.stroke();

      if (si === currentStrokeIdx) {
        const last = path[path.length - 1];
        ctx.beginPath();
        ctx.arc(last[0] * scaleX + ox, last[1] * scaleY + oy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }

      ctx.restore();
    }
  }, [strokePaths, currentStrokeIdx, completedStrokeIdx, displaySize]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displaySize.width, displaySize.height);

    drawGrid(ctx);
    drawReference(ctx);
    drawStrokePaths(ctx);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x / dpr, stroke.points[0].y / dpr);
      ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (stroke.points[0].pressure ?? 0.5) * 1.4);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p = stroke.points[i];
        const next = stroke.points[i + 1];
        const xc = (p.x + next.x) / 2 / dpr;
        const yc = (p.y + next.y) / 2 / dpr;
        ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (p.pressure ?? 0.5) * 1.4);
        ctx.quadraticCurveTo(p.x / dpr, p.y / dpr, xc, yc);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (last.pressure ?? 0.5) * 1.4);
      ctx.lineTo(last.x / dpr, last.y / dpr);
      ctx.stroke();
    };

    for (const stroke of strokesRef.current) {
      renderStroke(stroke);
    }
    if (currentStrokeRef.current) {
      renderStroke(currentStrokeRef.current);
    }
  }, [drawGrid, drawReference, drawStrokePaths, displaySize, dpr, lineWidth]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasDrawn(true);
    currentStrokeRef.current = {
      points: [getPos(e)],
      color,
    };
  }, [disabled, color, getPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    const pos = getPos(e);
    const pts = currentStrokeRef.current.points;
    const last = pts[pts.length - 1];
    const dist = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2);
    if (dist < 1.5 * dpr) return;
    pts.push(pos);
    redraw();
  }, [isDrawing, getPos, redraw, dpr]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      onStrokesUpdate?.(strokesRef.current);
      if (onStrokeEnd || onUserStrokeEnd) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            onStrokeEnd?.(imgData);
            onUserStrokeEnd?.();
          }
        }
      }
      currentStrokeRef.current = null;
    }
  }, [isDrawing, onStrokeEnd, onStrokesUpdate, onUserStrokeEnd]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasDrawn(false);
    redraw();
  }, [redraw]);

  const undo = useCallback(() => {
    strokesRef.current.pop();
    setHasDrawn(strokesRef.current.length > 0);
    redraw();
  }, [redraw]);

  const getStrokeImage = useCallback((index: number): ImageData | null => {
    const canvas = document.createElement('canvas');
    canvas.width = displaySize.width * dpr;
    canvas.height = displaySize.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lineWidth * dpr;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    };

    if (index >= 0 && index < strokesRef.current.length) {
      renderStroke(strokesRef.current[index]);
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [displaySize, dpr, lineWidth]);

  useImperativeHandle(ref, () => ({
    getImageData() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
    getStrokes() {
      return strokesRef.current;
    },
    clear,
    undo,
    toDataURL() {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const ctx = tmp.getContext('2d')!;
      ctx.fillStyle = '#fffdf7';
      ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(canvas, 0, 0);
      return tmp.toDataURL('image/jpeg', 0.4);
    },
    getStrokeImage,
  }), [clear, undo, getStrokeImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = displaySize.width * dpr;
    canvas.height = displaySize.height * dpr;
    redraw();
  }, [redraw, displaySize, dpr, referenceChar, strokePaths, currentStrokeIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: cssW, height: cssH } = entry.contentRect;
        if (cssW > 0 && cssH > 0) {
          setDisplaySize({ width: Math.round(cssW), height: Math.round(cssH) });
        }
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full aspect-square touch-none rounded-2xl border-2 border-gray-200 cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {hasDrawn && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={undo}
            className="px-4 py-1.5 text-sm bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            type="button"
          >
            撤销
          </button>
          <button
            onClick={clear}
            className="px-4 py-1.5 text-sm bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            type="button"
          >
            清空
          </button>
        </div>
      )}
    </div>
  );
});

HandwritingPanel.displayName = 'HandwritingPanel';
export default HandwritingPanel;
