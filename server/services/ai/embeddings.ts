import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateTextEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. Try Gemini Text Embedding if API key is active
  if (genAI && apiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text.substring(0, 1000));
      return result.embedding.values;
    } catch (err) {
      // Fallback gracefully
    }
  }

  // 2. High-performance deterministic semantic hashing & frequency vector for offline semantic ranking
  return generateLocalSemanticVector(text);
}

// Local 64-dimensional semantic fingerprint (character n-grams + term hashing)
export function generateLocalSemanticVector(text: string): number[] {
  const DIMENSIONS = 64;
  const vector = new Array(DIMENSIONS).fill(0);
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  if (words.length === 0) return vector;

  for (const word of words) {
    // Hash word into vector dimensions with weight
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % DIMENSIONS;
    vector[idx] += 1;

    // Sub-word bigrams for partial semantic match
    for (let i = 0; i < word.length - 1; i++) {
      const bigramHash = (word.charCodeAt(i) * 31 + word.charCodeAt(i + 1)) & 0xffffffff;
      const bIdx = Math.abs(bigramHash) % DIMENSIONS;
      vector[bIdx] += 0.35;
    }
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      vector[i] = vector[i] / magnitude;
    }
  }

  return vector;
}

// Compute cosine similarity between two vectors
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator > 0 ? dotProduct / denominator : 0;
}
