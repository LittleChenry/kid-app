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
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      time: Date.now(),
    };
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid || gridType === 'none') return;
    const w = canvasRef.current!.width / devicePixelRatio;
    const h = canvasRef.current!.height / devicePixelRatio;

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
  }, [showGrid, gridType, devicePixelRatio]);

  const drawReference = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!referenceChar) return;
    const w = canvasRef.current!.width / devicePixelRatio;
    const h = canvasRef.current!.height / devicePixelRatio;

    ctx.save();
    ctx.globalAlpha = referenceOpacity;
    ctx.fillStyle = referenceColor;
    ctx.font = `bold ${h * 0.85}px "Noto Sans SC", "SimSun", "STSong", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(referenceChar, w / 2, h / 2 + h * 0.02);
    ctx.restore();
  }, [referenceChar, referenceColor, referenceOpacity, devicePixelRatio]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx);
    drawReference(ctx);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (stroke.points[0].pressure ?? 0.5) * 1.4);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p = stroke.points[i];
        const next = stroke.points[i + 1];
        const xc = (p.x + next.x) / 2;
        const yc = (p.y + next.y) / 2;
        ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (p.pressure ?? 0.5) * 1.4);
        ctx.quadraticCurveTo(p.x, p.y, xc, yc);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineWidth = Math.max(lineWidth * 0.5, lineWidth * (last.pressure ?? 0.5) * 1.4);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    };

    for (const stroke of strokesRef.current) {
      renderStroke(stroke);
    }
    if (currentStrokeRef.current) {
      renderStroke(currentStrokeRef.current);
    }
  }, [drawGrid, drawReference, devicePixelRatio, lineWidth]);

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
    if (dist < 1.5) return;
    pts.push(pos);
    redraw();
  }, [isDrawing, getPos, redraw]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      onStrokesUpdate?.(strokesRef.current);
      if (onStrokeEnd) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            onStrokeEnd(ctx.getImageData(0, 0, canvas.width, canvas.height));
          }
        }
      }
      currentStrokeRef.current = null;
    }
  }, [isDrawing, onStrokeEnd, onStrokesUpdate]);

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
      return canvas.toDataURL('image/png');
    },
  }), [clear, undo]);

  useEffect(() => {
    redraw();
  }, [redraw, width, height, referenceChar]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-2xl border-2 border-gray-200 cursor-crosshair"
        style={{ width, height }}
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
