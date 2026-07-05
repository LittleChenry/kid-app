const SIZE = 28;

function renderDigit(digit: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#000';
  ctx.font = `bold ${SIZE * 0.8}px Arial, "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(digit), SIZE / 2, SIZE / 2 + 1);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

function toBinary(img: ImageData): Uint8Array {
  const out = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const idx = i * 4;
    out[i] = (img.data[idx] + img.data[idx + 1] + img.data[idx + 2]) / 3 < 128 ? 1 : 0;
  }
  return out;
}

interface Template {
  digit: number;
  binary: Uint8Array;
  pixelCount: number;
}

let templates: Template[] | null = null;

function getTemplates(): Template[] {
  if (templates) return templates;
  templates = [];
  for (let d = 0; d <= 9; d++) {
    const img = renderDigit(d);
    const binary = toBinary(img);
    templates.push({
      digit: d,
      binary,
      pixelCount: binary.reduce((a, b) => a + b, 0),
    });
  }
  return templates;
}

function extractBbox(binary: Uint8Array): { x: number; y: number; w: number; h: number } | null {
  let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (binary[y * SIZE + x]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        found = true;
      }
    }
  }
  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function resampleTo28x28(imageData: ImageData): ImageData {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = SIZE;
  dstCanvas.height = SIZE;
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);
  return dstCtx.getImageData(0, 0, SIZE, SIZE);
}

export function preprocessImageData(imageData: ImageData): {
  binary: Uint8Array;
  pixelCount: number;
  bbox: { x: number; y: number; w: number; h: number } | null;
  aspectRatio: number;
} {
  const resized = resampleTo28x28(imageData);
  const binary = toBinary(resized);
  const pixelCount = binary.reduce((a, b) => a + b, 0);
  const bbox = extractBbox(binary);
  const aspectRatio = bbox ? bbox.w / Math.max(bbox.h, 1) : 1;
  return { binary, pixelCount, bbox, aspectRatio };
}

/**
 * Normalized correlation using F1-score style combination of precision and recall.
 */
function correlate(
  userBin: Uint8Array,
  userCount: number,
  templateBin: Uint8Array,
  templateCount: number,
  offsetX = 0,
  offsetY = 0,
): number {
  if (userCount === 0 || templateCount === 0) return 0;

  let overlap = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const ux = x - offsetX;
      const uy = y - offsetY;
      if (ux < 0 || ux >= SIZE || uy < 0 || uy >= SIZE) continue;
      if (userBin[uy * SIZE + ux] && templateBin[y * SIZE + x]) {
        overlap++;
      }
    }
  }

  const precision = overlap / Math.max(userCount, 1);
  const recall = overlap / Math.max(templateCount, 1);
  return 2 * precision * recall / Math.max(precision + recall, 0.001);
}

function classifyByTemplateMatching(
  userBin: Uint8Array,
  userCount: number,
  aspectRatio: number,
): { digit: number; confidence: number } | null {
  if (userCount < 5) return null;

  const templates = getTemplates();
  let bestScore = -Infinity;
  let bestDigit = 0;

  for (const tmpl of templates) {
    let maxScore = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const score = correlate(userBin, userCount, tmpl.binary, tmpl.pixelCount, dx, dy);
        maxScore = Math.max(maxScore, score);
      }
    }

    const aspectPenalty = Math.abs(aspectRatio - 0.65) / 2;
    const finalScore = maxScore * 0.85 + (1 - Math.min(aspectPenalty, 1)) * 0.15;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestDigit = tmpl.digit;
    }
  }

  if (bestScore < 0.28) return null;
  return { digit: bestDigit, confidence: Math.round(bestScore * 100) };
}

export async function recognizeDigit(imageData: ImageData): Promise<number | null> {
  const { binary, pixelCount, aspectRatio } = preprocessImageData(imageData);
  const result = classifyByTemplateMatching(binary, pixelCount, aspectRatio);
  return result?.digit ?? null;
}

export async function recognizeDigits(
  imageData: ImageData,
): Promise<(number | null)[]> {
  const digit = await recognizeDigit(imageData);
  return [digit];
}
