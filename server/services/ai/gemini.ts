import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { performLocalOCR } from '../ocr/tesseract';
import {
  analyzeScreenshotHeuristics,
  HeuristicAnalysisResult,
} from '../ocr/heuristics';

const apiKey = process.env.GEMINI_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';
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
  originalFilename: string,
  fallbackBase64?: string | null
): Promise<ScreenshotAnalysisPayload> {
  // Read image bytes safely
  let base64Data: string | null = fallbackBase64 || null;
  if (!base64Data && filePath && fs.existsSync(filePath)) {
    try {
      base64Data = fs.readFileSync(filePath).toString('base64');
    } catch (readErr) {
      console.warn('Failed to read image file from disk:', readErr);
    }
  }

  let resolvedMime = mimeType || 'image/jpeg';
  if (originalFilename.endsWith('.svg') || resolvedMime.includes('svg')) {
    resolvedMime = 'image/svg+xml';
  } else if (originalFilename.endsWith('.png')) {
    resolvedMime = 'image/png';
  } else if (originalFilename.endsWith('.webp')) {
    resolvedMime = 'image/webp';
  }

  // Tier 1: Gemini 3.5 Flash Lite Multimodal AI Vision with Native JSON Mode
  if (genAI && apiKey && base64Data) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `You are RECALL's high-precision AI multimodal vision engine.
Analyze this mobile screenshot with extreme accuracy. Transcribe all text verbatim and classify the screenshot into the exact category.

Return a VALID JSON object matching this structure:
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": 0.95,
  "ocr_text": "Complete, verbatim transcription of EVERY readable word, number, timestamp, name, price, and label visible in the image without summarization or omitting anything.",
  "visual_description": "Detailed visual description of the visual scene, layout, colors, UI elements, objects, clothing, and structure.",
  "tags": ["array", "of", "10-15", "searchable", "semantic", "tags", "including", "app_names", "topics", "keywords"],
  "messages": [
    // ONLY IF category is "chat" (WhatsApp, Telegram, iMessage, Instagram DM, Discord, SMS):
    {
      "sequence_number": 1,
      "message_text": "exact text inside this message bubble",
      "sender_side": "left" | "right" | "unknown",
      "sender_label": "Name of contact or 'You'",
      "confidence": 0.95
    }
  ],
  "game_result": {
    // ONLY IF category is "game" (BGMI, PUBG, Call of Duty, Free Fire, Valorant, Clash, etc.):
    "game_name": "BGMI" or game title,
    "mode": "Classic" | "Ranked" | "TDM" or null,
    "map_name": "Erangel" | "Miramar" | "Livik" | "Sanhok" or null,
    "kills": 18, // MUST be an integer number of eliminations/kills if visible, otherwise null
    "score": integer score or null,
    "rank": "#1 Winner Winner Chicken Dinner" or rank text,
    "damage": integer total damage or null,
    "match_date": string date or null,
    "extraction_confidence": 0.95
  }
}

CATEGORIZATION RULES:
1. "chat": Any conversation or messaging interface (WhatsApp, Telegram, iMessage, Instagram DMs, Discord, SMS, Slack, Facebook Messenger). Look for chat bubbles, typing bars, sender names, read receipts, or conversational replies.
2. "game": Any game match summary, victory/defeat banner ("Winner Winner Chicken Dinner", "Victory Royale", "Defeat", "Booyah"), scoreboard, kill counter, or in-game HUD.
3. "product": Any e-commerce product page, apparel, sneakers, electronic gadget listing, price tag ($/₹/€/£), shopping cart, or "Add to Cart" screen (Amazon, Flipkart, Myntra, Nike, etc.).
4. "poster_document": Any text document, PDF, bill, receipt, invoice, boarding pass, ticket, certificate, book page, slide, or event flyer.
5. "other": Only use if the image does not fit any of the above (e.g. wallpaper, camera landscape photo, phone settings).

PRECISION REQUIREMENT:
- If conversation messages are visible, category MUST be "chat" and messages MUST be populated in chronological order.
- If game stats or kill count are visible, category MUST be "game" and game_result MUST contain the exact integer kills count.
- Never summarize ocr_text: transcribe all visible on-screen text faithfully.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: resolvedMime,
          },
        },
      ]);

      const responseText = result.response.text().trim();
      const parsed = JSON.parse(responseText);

      if (parsed) {
        let category = parsed.category || 'other';
        const ocrLower = (parsed.ocr_text || '').toLowerCase();

        // Secondary intelligent category validation to guarantee zero false "other" badges
        if (category === 'other') {
          if (
            parsed.messages?.length > 0 ||
            ocrLower.includes('online •') ||
            ocrLower.includes('type a message') ||
            ocrLower.includes('imessage') ||
            ocrLower.includes('whatsapp') ||
            ocrLower.includes('message...') ||
            /\b(replied|typing|delivered|seen)\b/.test(ocrLower)
          ) {
            category = 'chat';
          } else if (
            parsed.game_result?.kills != null ||
            ocrLower.includes('winner winner') ||
            ocrLower.includes('chicken dinner') ||
            ocrLower.includes('bgmi') ||
            ocrLower.includes('pubg') ||
            ocrLower.includes('eliminated') ||
            /\b(\d+\s*kills?|kills?\s*:\s*\d+)\b/.test(ocrLower)
          ) {
            category = 'game';
          } else if (
            ocrLower.includes('add to cart') ||
            ocrLower.includes('buy now') ||
            ocrLower.includes('in stock') ||
            /[\$₹€£]\s*\d+/.test(ocrLower)
          ) {
            category = 'product';
          } else if (
            ocrLower.includes('invoice') ||
            ocrLower.includes('receipt') ||
            ocrLower.includes('boarding pass') ||
            ocrLower.includes('total amount')
          ) {
            category = 'poster_document';
          }
        }

        return {
          category,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          ocr_text: parsed.ocr_text || '',
          visual_description: parsed.visual_description || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          game_result: parsed.game_result
            ? {
                game_name: parsed.game_result.game_name || 'Game',
                mode: parsed.game_result.mode || null,
                map_name: parsed.game_result.map_name || null,
                kills: typeof parsed.game_result.kills === 'number' ? parsed.game_result.kills : null,
                score: typeof parsed.game_result.score === 'number' ? parsed.game_result.score : null,
                rank: parsed.game_result.rank || null,
                damage: typeof parsed.game_result.damage === 'number' ? parsed.game_result.damage : null,
                match_date: parsed.game_result.match_date || null,
                extraction_confidence: parsed.game_result.extraction_confidence || 0.95,
                raw_extracted_text: (parsed.ocr_text || '').substring(0, 500),
              }
            : null,
        };
      }
    } catch (apiError) {
      console.warn('Gemini 3.5 Flash Lite call failed, proceeding to secondary Groq AI pipeline:', apiError);
    }
  }

  // Tier 2: Groq High-Speed AI Structurer (openai/gpt-oss-120b)
  let localOcrText = '';
  try {
    if (filePath && fs.existsSync(filePath)) {
      localOcrText = await performLocalOCR(filePath);
    }
  } catch (ocrErr) {
    console.warn('Local OCR execution notice:', ocrErr);
  }

  const effectiveGroqKey = process.env.GROQ_API_KEY || groqApiKey;
  if (effectiveGroqKey && (localOcrText.trim().length > 0 || originalFilename.length > 0)) {
    try {
      const groqPrompt = `You are RECALL's secondary AI structuring engine.
Analyze this text extracted from screenshot filename "${originalFilename}":
"""
${localOcrText.substring(0, 3000) || originalFilename}
"""

Return a VALID JSON object matching this structure:
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": 0.90,
  "visual_description": "Clear visual description of content and layout",
  "tags": ["array", "of", "searchable", "tags"],
  "messages": [
    // IF chat:
    {"sequence_number": 1, "message_text": "text", "sender_side": "left" | "right" | "unknown", "sender_label": "Name", "confidence": 0.9}
  ],
  "game_result": {
    // IF game:
    "game_name": "BGMI",
    "kills": 18,
    "rank": "#1 Winner Winner Chicken Dinner",
    "mode": "Classic",
    "map_name": "Erangel",
    "score": null,
    "damage": null,
    "match_date": null,
    "extraction_confidence": 0.95
  }
}`;

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveGroqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: groqPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (groqRes.ok) {
        const groqData: any = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content?.trim() || '';
        if (content) {
          const parsed = JSON.parse(content);
          return {
            category: parsed.category || 'other',
            confidence: parsed.confidence || 0.9,
            ocr_text: localOcrText || originalFilename,
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
                  raw_extracted_text: localOcrText.substring(0, 500),
                }
              : null,
          };
        }
      }
    } catch (groqErr) {
      console.warn('Groq structuring failed, falling back to heuristics:', groqErr);
    }
  }

  // Tier 3: Deterministic Rule-Based Heuristic Parser
  const heuristic: HeuristicAnalysisResult = analyzeScreenshotHeuristics(localOcrText, originalFilename);

  return {
    category: heuristic.category,
    confidence: heuristic.confidence,
    ocr_text: localOcrText || originalFilename,
    visual_description: heuristic.visual_description,
    tags: heuristic.tags,
    messages: heuristic.messages,
    game_result: heuristic.game_result,
  };
}

