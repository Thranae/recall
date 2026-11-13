import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeCosineSimilarity } from './ai/embeddings';

export interface ScreenshotCandidate {
  id: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
  category: string;
  ocr_text?: string | null;
  visual_description?: string | null;
  text_embedding?: string | number[] | null;
  tags?: string | string[] | null;
  image_data?: string | null;
}

export interface DuplicateItem {
  id: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
  reason: string;
  confidence: number;
}

export interface DuplicateGroup {
  keep: {
    id: string;
    original_filename: string;
    file_size: number;
    uploaded_at: string;
  };
  duplicates: DuplicateItem[];
}

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const AI_VERIFICATION_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

/**
 * Strips volatile status-bar timestamps, network speed, battery levels,
 * and ephemeral chrome to extract substantive content for comparison.
 */
export function cleanSubstantiveOcr(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    // Strip time like 10:47, 11:00, 7:38 PM
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ')
    // Strip battery like 100%, 99%
    .replace(/\b\d{1,3}%\b/g, ' ')
    // Strip network speeds like 870 KB/s, 7.60 KB/s
    .replace(/\b\d+(?:\.\d+)?\s*(?:kb|mb|gb)\/s\b/gi, ' ')
    // Strip network badges
    .replace(/\b(?:5g\+?|4g|lte|vowifi|volte|wifi)\b/gi, ' ')
    // Strip relative message statuses like 'seen 25m ago'
    .replace(/\bseen\s+\d+\w*\s+ago\b/gi, ' ')
    // Strip common browser/search chrome
    .replace(/\bsearch\s+google\s+or\s+type\b/gi, ' ')
    // Strip non-alphanumeric except space
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase();

  return cleaned.split(/\s+/).filter((w) => w.length > 2 && !/^\d+$/.test(w));
}

/**
 * Computes Jaccard word set similarity between two token arrays.
 */
export function computeTokenJaccard(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Computes Character Bigram Dice Coefficient (resilient against slight OCR character noise).
 */
export function computeBigramDice(textA: string, textB: string): number {
  const strA = textA.toLowerCase().replace(/\s+/g, '');
  const strB = textB.toLowerCase().replace(/\s+/g, '');
  if (!strA || !strB) return 0;
  if (strA === strB) return 1.0;
  if (strA.length < 2 || strB.length < 2) return 0;

  const getBigrams = (str: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const bgA = getBigrams(strA);
  const bgB = getBigrams(strB);
  let intersection = 0;

  for (const [bg, countA] of bgA.entries()) {
    if (bgB.has(bg)) {
      intersection += Math.min(countA, bgB.get(bg)!);
    }
  }

  const total = strA.length - 1 + (strB.length - 1);
  return total > 0 ? (2 * intersection) / total : 0;
}

/**
 * Detects whether two filenames follow sequential burst capture numbering
 * e.g., 1000052994.jpg and 1000052996.jpg, or ..._428.jpg and ..._429.jpg
 */
export function isBurstFilename(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  if (nameA === nameB) return true;

  const matchA = nameA.match(/^(.*?)(\d+)(\.[a-z0-9]+)$/i);
  const matchB = nameB.match(/^(.*?)(\d+)(\.[a-z0-9]+)$/i);
  if (!matchA || !matchB) return false;

  // Same prefix and same extension
  if (matchA[1] !== matchB[1] || matchA[3].toLowerCase() !== matchB[3].toLowerCase()) return false;

  const numA = parseInt(matchA[2], 10);
  const numB = parseInt(matchB[2], 10);
  if (isNaN(numA) || isNaN(numB)) return false;

  // Number difference within 5 units
  return Math.abs(numA - numB) <= 5;
}

function parseTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).toLowerCase());
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((t: any) => String(t).toLowerCase());
    } catch {
      return raw.toLowerCase().split(/[,\s]+/).filter(Boolean);
    }
  }
  return [];
}

function parseEmbedding(raw: any): number[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/**
 * AI-powered deep verification for borderline near-duplicate candidate pairs.
 */
export async function verifyWithAi(
  a: ScreenshotCandidate,
  b: ScreenshotCandidate
): Promise<{ is_duplicate: boolean; confidence: number; reason: string } | null> {
  if (!genAI) return null;

  const prompt = `You are RECALL's expert screenshot and photo duplicate verifier.
Compare these two screenshots and determine if they are duplicate or near-duplicate captures of the same content/moment (e.g. identical screenshot, sequential burst captures of the exact same scene, or same chat conversation with minor clock drift).

Screenshot 1:
- Filename: "${a.original_filename}"
- Category: "${a.category}"
- Substantive OCR: "${(a.ocr_text || '').replace(/\s+/g, ' ').slice(0, 350)}"
- Visual Description: "${(a.visual_description || '').slice(0, 350)}"
- Tags: ${parseTags(a.tags).slice(0, 15).join(', ')}

Screenshot 2:
- Filename: "${b.original_filename}"
- Category: "${b.category}"
- Substantive OCR: "${(b.ocr_text || '').replace(/\s+/g, ' ').slice(0, 350)}"
- Visual Description: "${(b.visual_description || '').slice(0, 350)}"
- Tags: ${parseTags(b.tags).slice(0, 15).join(', ')}

Respond ONLY with valid JSON in this exact structure:
{
  "is_duplicate": boolean,
  "confidence": number,
  "reason": "concise one-sentence explanation"
}`;

  for (const modelName of AI_VERIFICATION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI verification timeout')), 2200)
      );
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.is_duplicate === 'boolean' && typeof parsed.confidence === 'number') {
          return {
            is_duplicate: parsed.is_duplicate,
            confidence: parsed.confidence,
            reason: String(parsed.reason || 'Verified near-duplicate by AI'),
          };
        }
      }
    } catch {
      // Try next model or fall back to heuristic
    }
  }

  return null;
}

/**
 * High-precision duplicate detection engine combining exact binary hashing,
 * substantive OCR Jaccard & Bigram similarity, burst shot heuristics,
 * semantic visual embeddings, and optional AI verification.
 */
export async function detectDuplicateGroups(
  screenshots: ScreenshotCandidate[],
  options: { enableAiVerification?: boolean } = {}
): Promise<DuplicateGroup[]> {
  const { enableAiVerification = true } = options;

  // Pre-process items for fast pairwise evaluation
  const items = screenshots.map((s) => {
    const tags = parseTags(s.tags);
    const embedding = parseEmbedding(s.text_embedding);
    const ocrTokens = cleanSubstantiveOcr(s.ocr_text || '');
    const cleanOcrStr = ocrTokens.join(' ');
    const descWords = (s.visual_description || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    return {
      ...s,
      parsedTags: tags,
      embedding,
      ocrTokens,
      cleanOcrStr,
      descWords,
    };
  });

  const claimed = new Set<string>();
  const duplicate_groups: DuplicateGroup[] = [];

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (claimed.has(a.id)) continue;

    const dupsForA: DuplicateItem[] = [];

    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (claimed.has(b.id)) continue;

      let isDup = false;
      let reason = '';
      let confidence = 0;

      // 1. EXACT BINARY OR METADATA IDENTITY (100% confidence)
      const sameSize = a.file_size > 0 && a.file_size === b.file_size;
      const sameFilename = a.original_filename && a.original_filename === b.original_filename;
      const sameImageBytes =
        Boolean(a.image_data) &&
        Boolean(b.image_data) &&
        a.image_data === b.image_data;

      if (sameImageBytes) {
        isDup = true;
        confidence = 1.0;
        reason = 'Exact identical image file (binary hash match)';
      } else if (sameSize && sameFilename) {
        isDup = true;
        confidence = 1.0;
        reason = 'Identical file size and filename';
      }

      // 2. SUBSTANTIVE OCR TEXT & CONVERSATION OVERLAP
      if (!isDup && a.ocrTokens.length >= 5 && b.ocrTokens.length >= 5) {
        const jaccard = computeTokenJaccard(a.ocrTokens, b.ocrTokens);
        const dice = computeBigramDice(a.cleanOcrStr, b.cleanOcrStr);
        const textSim = Math.max(jaccard, dice);

        if (textSim >= 0.82) {
          isDup = true;
          confidence = Math.min(0.99, textSim);
          reason = `${Math.round(textSim * 100)}% text & dialogue match`;
        }
      }

      // 3. BURST SHOT HEURISTICS (Sequential filenames + high visual/embedding match)
      const isBurst = isBurstFilename(a.original_filename, b.original_filename);
      const embSim =
        a.embedding.length > 0 && b.embedding.length > 0
          ? computeCosineSimilarity(a.embedding, b.embedding)
          : 0;
      const tagSim = computeTokenJaccard(a.parsedTags, b.parsedTags);
      const descSim = computeTokenJaccard(a.descWords, b.descWords);

      if (!isDup && isBurst) {
        if (embSim >= 0.90 || (tagSim >= 0.55 && embSim >= 0.85) || descSim >= 0.60) {
          isDup = true;
          confidence = Math.min(0.98, Math.max(embSim, descSim, 0.92));
          reason = `Burst shot sequence (${Math.round(confidence * 100)}% visual match)`;
        }
      }

      // 4. HIGH SEMANTIC & VISUAL SCENE MATCH (Same category + very high embedding & tag overlap)
      if (!isDup && a.category === b.category && a.category !== 'other') {
        if (embSim >= 0.94 && tagSim >= 0.65 && descSim >= 0.65) {
          isDup = true;
          confidence = Math.min(0.96, embSim);
          reason = `Visual duplicate (${Math.round(embSim * 100)}% visual scene match)`;
        }
      }

      // 5. AI VERIFICATION FOR BORDERLINE CANDIDATES (Ambiguous near-duplicates)
      if (!isDup && enableAiVerification && genAI && (embSim >= 0.86 || (a.ocrTokens.length >= 6 && b.ocrTokens.length >= 6 && computeTokenJaccard(a.ocrTokens, b.ocrTokens) >= 0.70))) {
        try {
          const aiCheck = await verifyWithAi(a, b);
          if (aiCheck && aiCheck.is_duplicate && aiCheck.confidence >= 0.80) {
            isDup = true;
            confidence = aiCheck.confidence;
            reason = aiCheck.reason;
          }
        } catch {}
      }

      if (isDup) {
        dupsForA.push({
          id: b.id,
          original_filename: b.original_filename,
          file_size: b.file_size,
          uploaded_at: b.uploaded_at,
          reason,
          confidence,
        });
        claimed.add(b.id);
      }
    }

    if (dupsForA.length > 0) {
      claimed.add(a.id);
      duplicate_groups.push({
        keep: {
          id: a.id,
          original_filename: a.original_filename,
          file_size: a.file_size,
          uploaded_at: a.uploaded_at,
        },
        duplicates: dupsForA,
      });
    }
  }

  return duplicate_groups;
}
