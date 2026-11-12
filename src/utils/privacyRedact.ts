export interface RedactRegion {
  /** Normalized 0..1 coordinates relative to image dimensions */
  x: number;
  y: number;
  w: number;
  h: number;
  source: 'auto' | 'bar' | 'manual' | 'ai';
  label?: string;
}

export interface RedactOptions {
  autoSensitiveText: boolean;
  blurTopBar: boolean;
  blurBottomBar: boolean;
  extraHintTokens?: string[];
}

export interface RedactResult {
  dataUrl: string;
  blob: Blob;
  redactedCount: number;
  autoBoxes: RedactRegion[];
  imageWidth: number;
  imageHeight: number;
  ocrTimedOut?: boolean;
}

const SENSITIVE_WORD_PATTERN =
  /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+|@[a-zA-Z0-9_]{2,}|\+?\d[\d\s().-]{5,}\d|\b\d{4,12}\b|[₹$€£]\s*\d|^(?:rs\.?|inr|usd|eur)\s*\d|\b(?:\d{1,3}\.){3}\d{1,3}\b|https?:\/\/\S+|www\.\S+)/i;

const MULTI_WORD_SPAN_PATTERN =
  /(\+\d{1,3}[\s.-]?\d[\d\s.-]{5,}\d|\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{4}[\s.-]?\d{4}[\s.-]?\d{4}(?:[\s.-]?\d{4})?\b|[₹$€£]\s*[\d,]+(?:\.\d{1,2})?|(?:rs\.?|inr|usd|eur)\s*[\d,]+(?:\.\d{1,2})?)/i;

const ALPHANUMERIC_SECRET_PATTERN = /^(?=.*\d)(?=.*[a-zA-Z])[a-zA-Z0-9_-]{8,}$/;

const SENSITIVE_CUE_WORDS = new Set([
  'otp',
  'code',
  'pin',
  'password',
  'passcode',
  'secret',
  'token',
  'upi',
  'cvv',
  'account',
  'acct',
  'card',
  'phone',
  'mobile',
  'contact',
  'email',
  'mail',
  'balance',
  'total',
  'amount',
  'price',
  'order',
  'ref',
  'utr',
  'txn',
  'txnid',
  'pan',
  'aadhaar',
  'user',
  'id',
]);

const SKIP_CONNECTORS = new Set([':', '-', '=', '#', 'is', 'no', 'no.']);

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export function getStatusBarRegions(blurTopBar: boolean, blurBottomBar: boolean): RedactRegion[] {
  const regions: RedactRegion[] = [];
  if (blurTopBar) {
    regions.push({
      x: 0,
      y: 0,
      w: 1,
      h: 0.065,
      source: 'bar',
      label: 'Top status bar',
    });
  }
  if (blurBottomBar) {
    regions.push({
      x: 0,
      y: 0.915,
      w: 1,
      h: 0.085,
      source: 'bar',
      label: 'Bottom navigation bar',
    });
  }
  return regions;
}

export function extractSensitiveHintsFromText(rawText?: string | null): string[] {
  if (!rawText) return [];
  const matches = new Set<string>();
  const tokenRegex =
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+|\+?\d[\d\s-]{5,}\d|\b\d{4,12}\b|@[a-zA-Z0-9_]{2,})/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(rawText)) !== null) {
    const clean = m[0].trim().toLowerCase();
    if (clean.length >= 4) {
      matches.add(clean);
      const compact = clean.replace(/[\s-]/g, '');
      if (compact.length >= 4) matches.add(compact);
    }
  }
  return Array.from(matches).slice(0, 30);
}

function loadImageElement(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image onto privacy canvas.'));
    img.src = src;
  });
}

export async function loadUntaintedImage(
  imageUrl: string,
  existingImg?: HTMLImageElement | null
): Promise<HTMLImageElement> {
  // 1. If an existing image element is already fully loaded in the DOM, test if it can be drawn untainted
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;
      const testCtx = testCanvas.getContext('2d');
      if (testCtx) {
        testCtx.drawImage(existingImg, 0, 0, 1, 1, 0, 0, 1, 1);
        testCanvas.toDataURL('image/png'); // Throws SecurityError if tainted
        return existingImg; // 100% untainted, in memory, 0 network calls!
      }
    } catch {
      // tainted or error, fall through to safe loaders below
    }
  }

  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return loadImageElement(imageUrl);
  }

  // 2. Try loading directly via new Image with crossOrigin = 'anonymous'
  try {
    return await loadImageElement(imageUrl, 'anonymous');
  } catch {
    // 3. If direct element load fails, fetch as Blob and convert to permanent Data URL
    try {
      const headers: Record<string, string> = {};
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('recall_auth_token') : null;
      // If imageUrl doesn't already contain ?token=, add Authorization header
      if (token && !imageUrl.includes('token=')) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(imageUrl, {
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Image request failed (${response.status})`);
      }

      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image as Data URL'));
        reader.readAsDataURL(blob);
      });

      return await loadImageElement(dataUrl);
    } catch (fetchErr) {
      console.warn('loadUntaintedImage fallback warning:', fetchErr);
      throw new Error('Unable to fetch image for redaction. Please check your network connection.');
    }
  }
}

function prepareOcrCanvas(img: HTMLImageElement): {
  ocrCanvas: HTMLCanvasElement;
  scaleX: number;
  scaleY: number;
} {
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;
  const maxDim = Math.max(natW, natH);

  let targetW = natW;
  let targetH = natH;
  if (maxDim > 1400) {
    const ratio = 1400 / maxDim;
    targetW = Math.round(natW * ratio);
    targetH = Math.round(natH * ratio);
  } else if (maxDim < 600) {
    const ratio = Math.min(2, 900 / maxDim);
    targetW = Math.round(natW * ratio);
    targetH = Math.round(natH * ratio);
  }

  const ocrCanvas = document.createElement('canvas');
  ocrCanvas.width = Math.max(1, targetW);
  ocrCanvas.height = Math.max(1, targetH);
  const ctx = ocrCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, ocrCanvas.width, ocrCanvas.height);
  }

  return {
    ocrCanvas,
    scaleX: natW / ocrCanvas.width,
    scaleY: natH / ocrCanvas.height,
  };
}

function extractWordsByLine(recognized: any): OcrWord[][] {
  const linesOut: OcrWord[][] = [];
  const blocks = recognized?.data?.blocks;

  if (Array.isArray(blocks) && blocks.length > 0) {
    for (const block of blocks) {
      const paragraphs = Array.isArray(block?.paragraphs) ? block.paragraphs : [];
      for (const para of paragraphs) {
        const lines = Array.isArray(para?.lines) ? para.lines : [];
        for (const line of lines) {
          const words: OcrWord[] = (Array.isArray(line?.words) ? line.words : []).filter(
            (w: any) => w && typeof w.text === 'string' && w.bbox
          );
          if (words.length > 0) linesOut.push(words);
        }
      }
    }
  }

  if (linesOut.length === 0 && Array.isArray(recognized?.data?.words)) {
    const fallbackWords = recognized.data.words.filter(
      (w: any) => w && typeof w.text === 'string' && w.bbox
    );
    if (fallbackWords.length > 0) linesOut.push(fallbackWords);
  }

  return linesOut;
}

function buildNormalizedBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  imgW: number,
  imgH: number,
  label?: string
): RedactRegion | null {
  if (x1 <= x0 || y1 <= y0 || imgW <= 0 || imgH <= 0) return null;
  const x = Math.max(0, Math.min(1, x0 / imgW));
  const y = Math.max(0, Math.min(1, y0 / imgH));
  const w = Math.max(0.015, Math.min(1 - x, (x1 - x0) / imgW));
  const h = Math.max(0.015, Math.min(1 - y, (y1 - y0) / imgH));
  return { x, y, w, h, source: 'auto', label };
}

async function recognizeWordLines(
  img: HTMLImageElement,
  timeoutMs: number
): Promise<{
  wordLines: OcrWord[][];
  natW: number;
  natH: number;
  scaleX: number;
  scaleY: number;
  timedOut: boolean;
}> {
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;
  const { ocrCanvas, scaleX, scaleY } = prepareOcrCanvas(img);

  let worker: any = null;
  let timedOut = false;

  const ocrTask = (async () => {
    const tesseractMod: any = await import('tesseract.js');
    const createWorkerFn = tesseractMod.createWorker || tesseractMod.default?.createWorker;
    if (typeof createWorkerFn !== 'function') {
      throw new Error('OCR worker loader unavailable.');
    }

    let rejectWorkerErr: ((reason?: unknown) => void) | null = null;
    const workerErrorPromise = new Promise<never>((_, reject) => {
      rejectWorkerErr = reject;
    });

    worker = await Promise.race([
      createWorkerFn('eng', undefined, {
        errorHandler: (err: unknown) => rejectWorkerErr?.(err),
      }),
      workerErrorPromise,
    ]);

    const recognized: any = await worker.recognize(ocrCanvas, {}, { text: true, blocks: true });
    return extractWordsByLine(recognized);
  })();

  const timeoutPromise = new Promise<OcrWord[][]>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve([]);
    }, timeoutMs);
  });

  let wordLines: OcrWord[][] = [];
  try {
    wordLines = await Promise.race([ocrTask, timeoutPromise]);
  } catch (err) {
    console.warn('Client OCR redaction warning:', err);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
  }

  return { wordLines, natW, natH, scaleX, scaleY, timedOut };
}

function buildWordHintsFromLines(
  wordLines: Array<Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>>,
  natW: number,
  natH: number,
  scaleX: number,
  scaleY: number
): Array<{ text: string; box_2d: [number, number, number, number] }> {
  const hints: Array<{ text: string; box_2d: [number, number, number, number] }> = [];

  for (const line of wordLines) {
    for (const word of line) {
      const text = word.text.trim();
      if (!text || !word.bbox) continue;
      const ymin = Math.max(0, Math.min(1000, Math.round(((word.bbox.y0 * scaleY) / natH) * 1000)));
      const xmin = Math.max(0, Math.min(1000, Math.round(((word.bbox.x0 * scaleX) / natW) * 1000)));
      const ymax = Math.max(ymin + 1, Math.min(1000, Math.round(((word.bbox.y1 * scaleY) / natH) * 1000)));
      const xmax = Math.max(xmin + 1, Math.min(1000, Math.round(((word.bbox.x1 * scaleX) / natW) * 1000)));
      hints.push({ text, box_2d: [ymin, xmin, ymax, xmax] });
      if (hints.length >= 160) return hints;
    }
  }

  return hints;
}

export async function extractOcrWordHints(
  img: HTMLImageElement,
  timeoutMs = 5000
): Promise<Array<{ text: string; box_2d: [number, number, number, number] }>> {
  const { wordLines, natW, natH, scaleX, scaleY } = await recognizeWordLines(img, timeoutMs);
  return buildWordHintsFromLines(wordLines, natW, natH, scaleX, scaleY);
}

export async function detectSensitiveRegions(
  img: HTMLImageElement,
  options?: { timeoutMs?: number; extraHintTokens?: string[] }
): Promise<{
  boxes: RedactRegion[];
  timedOut: boolean;
  wordHints: Array<{ text: string; box_2d: [number, number, number, number] }>;
}> {
  const hintSet = new Set((options?.extraHintTokens || []).map((t) => t.toLowerCase()));
  const { wordLines, natW, natH, scaleX, scaleY, timedOut } = await recognizeWordLines(
    img,
    options?.timeoutMs ?? 12000
  );
  const wordHints = buildWordHintsFromLines(wordLines, natW, natH, scaleX, scaleY);

  const boxes: RedactRegion[] = [];

  for (const line of wordLines) {
    const marked = new Set<number>();

    for (let i = 0; i < line.length; i++) {
      const clean = line[i].text.trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      const compactLower = lower.replace(/[\s-]/g, '');

      // Check cue words preceding this token on the same line (skip optional separators like ":" or "-")
      let cueFound = false;
      for (let lookback = 1; lookback <= 2 && i - lookback >= 0; lookback++) {
        const candidate = line[i - lookback].text.trim().toLowerCase();
        const alphaOnly = candidate.replace(/[^a-z]/g, '');
        if (SENSITIVE_CUE_WORDS.has(alphaOnly) && !SKIP_CONNECTORS.has(lower) && clean.length >= 2) {
          cueFound = true;
          break;
        }
        if (!SKIP_CONNECTORS.has(candidate)) break;
      }

      const matchesSingle =
        SENSITIVE_WORD_PATTERN.test(clean) ||
        ALPHANUMERIC_SECRET_PATTERN.test(clean) ||
        cueFound ||
        (hintSet.size > 0 && (hintSet.has(lower) || hintSet.has(compactLower)));

      if (matchesSingle) {
        marked.add(i);
      }

      // Check 2-word and 3-word spans on the same line (splits like "+91 98765 43210" or "Rs. 1,500")
      if (i + 1 < line.length) {
        const pair = `${clean} ${line[i + 1].text.trim()}`;
        if (MULTI_WORD_SPAN_PATTERN.test(pair)) {
          marked.add(i);
          marked.add(i + 1);
        }
      }
      if (i + 2 < line.length) {
        const triple = `${clean} ${line[i + 1].text.trim()} ${line[i + 2].text.trim()}`;
        if (MULTI_WORD_SPAN_PATTERN.test(triple)) {
          marked.add(i);
          marked.add(i + 1);
          marked.add(i + 2);
        }
      }
    }

    // Merge consecutive marked words on the same line into clean continuous boxes
    let runStart = -1;
    for (let i = 0; i <= line.length; i++) {
      if (i < line.length && marked.has(i)) {
        if (runStart === -1) runStart = i;
      } else if (runStart !== -1) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const labels: string[] = [];
        for (let j = runStart; j < i; j++) {
          const b = line[j].bbox;
          minX = Math.min(minX, b.x0);
          minY = Math.min(minY, b.y0);
          maxX = Math.max(maxX, b.x1);
          maxY = Math.max(maxY, b.y1);
          labels.push(line[j].text.trim());
        }
        const box = buildNormalizedBox(
          minX * scaleX,
          minY * scaleY,
          maxX * scaleX,
          maxY * scaleY,
          natW,
          natH,
          labels.join(' ')
        );
        if (box) boxes.push(box);
        runStart = -1;
      }
    }
  }

  return { boxes, timedOut, wordHints };
}

function drawPrivacyMask(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Generous safety margin so numbers, letters, colons, and edge serifs are 100% masked
  const padX = Math.max(10, Math.round(Math.max(w * 0.08, Math.min(w, h) * 0.28) + 4));
  const padY = Math.max(7, Math.round(Math.max(h * 0.14, Math.min(w, h) * 0.22) + 3));
  const rx = Math.max(0, Math.round(x - padX));
  const ry = Math.max(0, Math.round(y - padY));
  const rw = Math.max(16, Math.min(canvasWidth - rx, Math.round(w + padX * 2)));
  const rh = Math.max(14, Math.min(canvasHeight - ry, Math.round(h + padY * 2)));
  // Keep corner radius small (1..4px) so curved corners never shave off outer digits
  const radius = Math.min(4, Math.max(1, Math.round(Math.min(rw, rh) / 8)));

  // 100% opaque solid redaction fill so underlying text/details are completely invisible
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, radius);
  ctx.fillStyle = '#0B1220';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(1, Math.min(2, Math.round(canvasWidth / 600)));
  ctx.stroke();
  ctx.restore();
}

export async function composeRedactedImage(
  img: HTMLImageElement,
  boxes: RedactRegion[]
): Promise<{ dataUrl: string; blob: Blob; redactedCount: number }> {
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;

  // Keep output fast & mobile-safe (within iOS Safari's canvas pixel limits) while preserving sharp resolution
  const maxOutDim = 1600;
  const scale = Math.max(natW, natH) > maxOutDim ? maxOutDim / Math.max(natW, natH) : 1;
  const outW = Math.max(1, Math.round(natW * scale));
  const outH = Math.max(1, Math.round(natH * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas 2D context is unavailable.');
  outCtx.drawImage(img, 0, 0, outW, outH);

  for (const box of boxes) {
    const px = box.x * outW;
    const py = box.y * outH;
    const pw = box.w * outW;
    const ph = box.h * outH;
    drawPrivacyMask(outCtx, outW, outH, px, py, pw, ph);
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    outCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to encode redacted image.'));
    }, 'image/png');
  });

  return {
    dataUrl: outCanvas.toDataURL('image/png'),
    blob,
    redactedCount: boxes.length,
  };
}

export async function generateRedactedImage(
  imageUrl: string,
  options: RedactOptions
): Promise<RedactResult> {
  const img = await loadUntaintedImage(imageUrl);
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;

  let autoBoxes: RedactRegion[] = [];
  let ocrTimedOut = false;

  if (options.autoSensitiveText) {
    const scan = await detectSensitiveRegions(img, {
      extraHintTokens: options.extraHintTokens,
    });
    autoBoxes = scan.boxes;
    ocrTimedOut = scan.timedOut;
  }

  const allBoxes = [
    ...getStatusBarRegions(options.blurTopBar, options.blurBottomBar),
    ...autoBoxes,
  ];

  const composed = await composeRedactedImage(img, allBoxes);

  return {
    ...composed,
    autoBoxes,
    imageWidth: natW,
    imageHeight: natH,
    ocrTimedOut,
  };
}
