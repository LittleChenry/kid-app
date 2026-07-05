import type { EvaluationResult } from '@kid-app/shared';

function renderReferenceChar(char: string, size: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.font = `bold ${size * 0.85}px "Noto Sans SC", "SimSun", "STSong", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, size / 2, size / 2 + size * 0.02);
  return ctx.getImageData(0, 0, size, size);
}

function imageDataToBinary(data: ImageData): Uint8Array {
  const pixels = new Uint8Array(data.width * data.height);
  for (let i = 0; i < pixels.length; i++) {
    const idx = i * 4;
    const brightness = (data.data[idx] + data.data[idx + 1] + data.data[idx + 2]) / 3;
    pixels[i] = brightness < 128 ? 1 : 0;
  }
  return pixels;
}

function computeCenterOfMass(pixels: Uint8Array, width: number, height: number): { cx: number; cy: number; count: number } {
  let cx = 0, cy = 0, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x]) {
        cx += x;
        cy += y;
        count++;
      }
    }
  }
  if (count === 0) return { cx: 0, cy: 0, count: 0 };
  return { cx: cx / count, cy: cy / count, count };
}

function computeMbr(pixels: Uint8Array, width: number, height: number): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        found = true;
      }
    }
  }
  if (!found) return null;
  return { minX, minY, maxX, maxY };
}

export function evaluateHandwriting(
  userStrokes: { points: { x: number; y: number }[] }[],
  referenceChar: string,
  canvasWidth: number,
  canvasHeight: number,
): EvaluationResult {
  const size = 64;
  const ref = renderReferenceChar(referenceChar, size);
  const refBin = imageDataToBinary(ref);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const ctx = tempCanvas.getContext('2d')!;

  ctx.fillStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;

  const sx = size / canvasWidth;
  const sy = size / canvasHeight;

  for (const stroke of userStrokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * sx, stroke.points[0].y * sy);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const xc = (stroke.points[i].x * sx + stroke.points[i + 1].x * sx) / 2;
      const yc = (stroke.points[i].y * sy + stroke.points[i + 1].y * sy) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x * sx, stroke.points[i].y * sy, xc, yc);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x * sx, last.y * sy);
    ctx.stroke();
  }

  const userPixels = ctx.getImageData(0, 0, size, size);
  const userBin = imageDataToBinary(userPixels);

  let overlap = 0, refCount = 0, userCount = 0;
  for (let i = 0; i < refBin.length; i++) {
    if (refBin[i]) refCount++;
    if (userBin[i]) userCount++;
    if (refBin[i] && userBin[i]) overlap++;
  }

  const coverage = refCount > 0 ? overlap / refCount : 0;
  const precision = userCount > 0 ? overlap / userCount : 0;
  const score = Math.round((coverage * 0.6 + precision * 0.4) * 100);

  const refCom = computeCenterOfMass(refBin, size, size);
  const userCom = computeCenterOfMass(userBin, size, size);
  const centerOffset = refCom.count > 0 && userCom.count > 0
    ? Math.sqrt((refCom.cx - userCom.cx) ** 2 + (refCom.cy - userCom.cy) ** 2) / (size / 2)
    : 1;

  const userMbr = computeMbr(userBin, size, size);
  const refMbr = computeMbr(refBin, size, size);
  let proportionScore = 1;
  if (userMbr && refMbr) {
    const userW = userMbr.maxX - userMbr.minX;
    const userH = userMbr.maxY - userMbr.minY;
    const refW = refMbr.maxX - refMbr.minX;
    const refH = refMbr.maxY - refMbr.minY;
    const aspectDiff = Math.abs(userW / userH - refW / refH) / Math.max(refW / refH, 0.01);
    proportionScore = Math.max(0, 1 - aspectDiff);
  }

  const strokeCount = userStrokes.length;

  const feedback: string[] = [];
  if (coverage > 0.7) feedback.push('覆盖完整，写得很到位！');
  else if (coverage > 0.4) feedback.push('大部分笔画已覆盖，再注意一下细节。');
  else feedback.push('可以再仔细对照范字练习。');

  if (precision < 0.5) feedback.push('注意控制笔画范围，不要多出多余的笔迹。');
  else feedback.push('笔画干净利落，不错！');

  if (centerOffset < 0.15) feedback.push('位置居中，掌握得很好。');
  else if (centerOffset < 0.3) feedback.push('位置基本正确，稍加调整会更好。');
  else feedback.push('注意把字写在格子中间位置。');

  if (proportionScore < 0.7) feedback.push('注意字的比例结构。');

  const finalScore = Math.min(100, Math.round(
    score * 0.5 +
    (1 - centerOffset) * 20 +
    proportionScore * 20 +
    Math.min(strokeCount / 8, 1) * 10
  ));

  return {
    score: finalScore,
    coverage: Math.round(coverage * 100),
    precision: Math.round(precision * 100),
    centerOffset: Math.round(centerOffset * 100),
    strokeCount,
    feedback,
  };
}
