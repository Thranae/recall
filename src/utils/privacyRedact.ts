export interface RedactOptions {
  autoSensitiveText: boolean;
  blurTopBar: boolean;
  blurBottomBar: boolean;
}

export interface RedactResult {
  dataUrl: string;
  blob: Blob;
  redactedCount: number;
}

const SENSITIVE_WORD_PATTERN =
  /(@|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+|\+?\d[\d\s-]{6,}\d|\b\d{4,8}\b|[₹$€£]\s*\d)/i;

const SENSITIVE_CUE_WORDS = new Set([
  'otp',
  'code',
  'pin',
  'password',
  'passcode',
  'upi',
  'cvv',
  'account',
  'card',
  'phone',
  'mobile',
  'email',
  'balance',
  'total',
  'amount',
]);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image onto privacy canvas.'));
    img.src = src;
  });
}

function drawPrivacyPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const pad = Math.max(4, Math.round(Math.min(w, h) * 0.14));
  const rx = Math.max(0, x - pad);
  const ry = Math.max(0, y - pad);
  const rw = w + pad * 2;
  const rh = h + pad * 2;
  const radius = Math.min(8, Math.round(rh / 3));

  ctx.save();
  ctx.fillStyle = 'rgba(23, 43, 77, 0.94)';
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, radius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export async function generateRedactedImage(
  imageUrl: string,
  options: RedactOptions
): Promise<RedactResult> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let redactedCount = 0;

  if (options.blurTopBar) {
    drawPrivacyPill(ctx, 0, 0, canvas.width, Math.round(canvas.height * 0.065));
    redactedCount++;
  }

  if (options.blurBottomBar) {
    const bh = Math.round(canvas.height * 0.085);
    drawPrivacyPill(ctx, 0, canvas.height - bh, canvas.width, bh);
    redactedCount++;
  }

  if (options.autoSensitiveText) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const recognized: any = await worker.recognize(canvas);
      await worker.terminate();

      const words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> =
        recognized?.data?.words || [];

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const clean = (w.text || '').trim();
        if (!clean || !w.bbox) continue;

        const prevWord = (words[i - 1]?.text || '').toLowerCase().replace(/[^a-z]/g, '');
        const isCueFollowed = SENSITIVE_CUE_WORDS.has(prevWord) && clean.length >= 2;
        const matchesSensitive = SENSITIVE_WORD_PATTERN.test(clean) || isCueFollowed;

        if (matchesSensitive) {
          const { x0, y0, x1, y1 } = w.bbox;
          if (x1 > x0 && y1 > y0) {
            drawPrivacyPill(ctx, x0, y0, x1 - x0, y1 - y0);
            redactedCount++;
          }
        }
      }
    } catch (ocrErr) {
      console.warn('Client OCR redaction warning:', ocrErr);
    }
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to encode redacted image.'));
    }, 'image/png');
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    blob,
    redactedCount,
  };
}

