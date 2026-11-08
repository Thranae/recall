import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateTextEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 1. Try Gemini Text Embedding if API key is active with 1.5s timeout
  if (genAI && apiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 1500)
      );
      const result = await Promise.race([
        model.embedContent(text.substring(0, 1000)),
        timeoutPromise,
      ]);
      return result.embedding.values;
    } catch {
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
  let norm = 0;
  for (let i = 0; i < DIMENSIONS; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

// Cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export const computeCosineSimilarity = cosineSimilarity;
