import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { performLocalOCR } from '../ocr/tesseract';
import {
  analyzeScreenshotHeuristics,
  HeuristicAnalysisResult,
} from '../ocr/heuristics';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ScreenshotAnalysisPayload {
  category: 'chat' | 'game' | 'product' | 'poster_document' | 'other';
  confidence: number;
  ocr_text: string;
  visual_description: string;
  tags: string[];
  messages: Array<{
    sequence_number: number;
    message_text: string;
    sender_side: 'left' | 'right' | 'unknown';
    sender_label: string | null;
    confidence: number;
    bounding_box?: { x: number; y: number; width: number; height: number };
  }>;
  game_result: {
    game_name: string;
    mode: string | null;
    map_name: string | null;
    kills: number | null;
    score: number | null;
    rank: string | null;
    damage: number | null;
    match_date: string | null;
    extraction_confidence: number;
    raw_extracted_text: string;
  } | null;
}

export async function analyzeScreenshot(
  filePath: string,
  mimeType: string,
  originalFilename: string
): Promise<ScreenshotAnalysisPayload> {
  // If Gemini API Key is configured, use Gemini 2.5 Flash / 2.0 Flash for vision analysis
  if (genAI && apiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imageBytes = fs.readFileSync(filePath);
      const base64Data = imageBytes.toString('base64');

      const prompt = `
You are the AI extraction engine for RECALL, a screenshot search engine.
Analyze this image thoroughly.
Extract the following exact JSON structure (respond with VALID JSON ONLY, no markdown backticks, no extra text):
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": number between 0 and 1,
  "ocr_text": "all readable text transcribed accurately",
  "visual_description": "detailed physical description of colors, objects, garments, scene, layout",
  "tags": ["array", "of", "searchable", "keywords"],
  "messages": [
    // ONLY IF category is "chat", list each message in top-to-bottom conversational order:
    {
      "sequence_number": 1,
      "message_text": "text of message",
      "sender_side": "left" | "right" | "unknown",
      "sender_label": "You" or sender name if visible,
      "confidence": 0.95
    }
  ],
  "game_result": {
    // ONLY IF category is "game" (e.g. BGMI, PUBG, etc.):
    "game_name": "BGMI" or game name,
    "mode": "Classic" | "Ranked" | "TDM" or null,
    "map_name": "Erangel" | "Miramar" | "Livik" | "Sanhok" or null,
    "kills": integer number of kills or null,
    "score": integer or null,
    "rank": "#1 Winner Winner Chicken Dinner" or placement rank or null,
    "damage": integer or null,
    "match_date": string or null,
    "extraction_confidence": 0.95
  }
}

CRITICAL RULES:
1. For conversations, preserve strict chronological order (sequence_number 1, 2, 3...). Note sender_side (left=incoming message, right=outgoing user message).
2. For game results (BGMI/PUBG), exact kills MUST be a number, not text or estimate. If kills not visible, null.
3. Keep visual description precise (e.g. "Black cotton t-shirt with crew neck on white background").
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg',
          },
        },
      ]);

      const responseText = result.response.text().trim();
      // Clean possible code blocks ```json ... ```
      const cleaned = responseText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        category: parsed.category || 'other',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        ocr_text: parsed.ocr_text || '',
        visual_description: parsed.visual_description || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        game_result: parsed.game_result
          ? {
              game_name: parsed.game_result.game_name || 'BGMI',
              mode: parsed.game_result.mode || null,
              map_name: parsed.game_result.map_name || null,
              kills: typeof parsed.game_result.kills === 'number' ? parsed.game_result.kills : null,
              score: typeof parsed.game_result.score === 'number' ? parsed.game_result.score : null,
              rank: parsed.game_result.rank || null,
              damage: typeof parsed.game_result.damage === 'number' ? parsed.game_result.damage : null,
              match_date: parsed.game_result.match_date || null,
              extraction_confidence: parsed.game_result.extraction_confidence || 0.9,
              raw_extracted_text: parsed.ocr_text?.substring(0, 500) || '',
            }
          : null,
      };
    } catch (apiError) {
      console.warn('Gemini multimodal call failed or timed out, falling back to local OCR & heuristics:', apiError);
    }
  }

  // Fallback: Local Tesseract OCR + Heuristic parsing
  const localOcrText = await performLocalOCR(filePath);
  const heuristic: HeuristicAnalysisResult = analyzeScreenshotHeuristics(localOcrText, originalFilename);

  return {
    category: heuristic.category,
    confidence: heuristic.confidence,
    ocr_text: localOcrText,
    visual_description: heuristic.visual_description,
    tags: heuristic.tags,
    messages: heuristic.messages,
    game_result: heuristic.game_result,
  };
}
