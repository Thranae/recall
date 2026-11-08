import { createWorker } from 'tesseract.js';

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return workerPromise;
}

export async function performLocalOCR(imagePath: string): Promise<string> {
  try {
    const worker = await getWorker();
    const result = await worker.recognize(imagePath);
    return result.data.text || '';
  } catch (err) {
    console.error('Local Tesseract OCR error:', err);
    return '';
  }
}

