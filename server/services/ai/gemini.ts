import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { performLocalOCR } from '../ocr/tesseract';
import {
  analyzeScreenshotHeuristics,
  HeuristicAnalysisResult,
} from '../ocr/heuristics';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const mistralApiKey = process.env.MISTRAL_API_KEY || '';
const openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Multi-model resilience cascade for Google Gemini
const CANDIDATE_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

export interface ScreenshotAnalysisPayload {
  category: 'chat' | 'game' | 'product' | 'poster_document' | 'other';
  confidence: number;
  ocr_text: string;
  visual_description: string;
  tags: string[];
  provider?: string;
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

const COMMON_PROMPT = `You are RECALL's high-precision AI multimodal vision engine.
Analyze this mobile screenshot with extreme accuracy. Transcribe all text verbatim and classify the screenshot into the exact category.

Return a VALID JSON object matching this structure:
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": 0.98,
  "ocr_text": "Complete, verbatim transcription of EVERY readable word, number, timestamp, name, price, URL, and label visible in the image without summarization or omitting anything.",
  "visual_description": "Comprehensive 3-5 sentence description detailing the specific application (e.g. WhatsApp, Instagram, Amazon, BGMI, Google Chrome, Settings), UI layout, dialogs, buttons, colors, subjects, and the context of what is happening in this screenshot.",
  "tags": ["15-25", "searchable", "semantic", "tags", "including", "app_names", "brands", "topics", "keywords"],
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
    "score": 100, // integer score or null
    "rank": "#1 Winner Winner Chicken Dinner" or rank text,
    "damage": 2450, // integer total damage or null
    "match_date": null,
    "extraction_confidence": 0.95
  }
}

CATEGORIZATION RULES:
1. "chat": Any conversation or messaging interface (WhatsApp, Telegram, iMessage, Instagram DMs, Discord, SMS, Slack, Facebook Messenger). Look for chat bubbles, typing bars, sender names, read receipts, or conversational replies.
2. "game": Any game match summary, victory/defeat banner ("Winner Winner Chicken Dinner", "Victory Royale", "Defeat", "Booyah"), scoreboard, kill counter, or in-game HUD.
3. "product": Any e-commerce product page, apparel, sneakers, electronic gadget listing, price tag ($/₹/€/£), shopping cart, or "Add to Cart" screen (Amazon, Flipkart, Myntra, Nike, etc.).
4. "poster_document": Any text document, PDF, bill, receipt, invoice, boarding pass, ticket, certificate, book page, slide, or event flyer.
5. "other": Only use if the image does not fit any of the above (e.g. wallpaper, camera landscape photo, phone settings, web browser UI).

PRECISION REQUIREMENT:
- If conversation messages are visible, category MUST be "chat" and messages MUST be populated in chronological order.
- If game stats or kill count are visible, category MUST be "game" and game_result MUST contain the exact integer kills count.
- Never summarize ocr_text: transcribe all visible on-screen text faithfully.`;

function normalizeAnalysis(parsed: any, provider: string): ScreenshotAnalysisPayload {
  let category: ScreenshotAnalysisPayload['category'] = 'other';
  if (['chat', 'game', 'product', 'poster_document', 'other'].includes(parsed.category)) {
    category = parsed.category;
  }

  // Handle ocr_text whether string, object, or array
  let ocrText = '';
  if (typeof parsed.ocr_text === 'string') {
    ocrText = parsed.ocr_text;
  } else if (parsed.ocr_text && typeof parsed.ocr_text === 'object') {
    ocrText = Object.values(parsed.ocr_text)
      .map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join('\n');
  }

  // Handle visual_description whether string or object
  let visualDescription = '';
  if (typeof parsed.visual_description === 'string') {
    visualDescription = parsed.visual_description;
  } else if (parsed.visual_description && typeof parsed.visual_description === 'object') {
    visualDescription = Object.entries(parsed.visual_description)
      .map(([k, v]) => `${k}: ${v}`)
      .join('. ');
  }

  const ocrLower = (ocrText + ' ' + visualDescription).toLowerCase();

  // Secondary intelligent category validation to guarantee zero false "other" badges
  if (category === 'other') {
    if (
      (Array.isArray(parsed.messages) && parsed.messages.length > 0) ||
      ocrLower.includes('online •') ||
      ocrLower.includes('type a message') ||
      ocrLower.includes('imessage') ||
      ocrLower.includes('whatsapp') ||
      ocrLower.includes('message...') ||
      ocrLower.includes('last seen') ||
      ocrLower.includes('telegram') ||
      ocrLower.includes('signal') ||
      ocrLower.includes('snapchat') ||
      ocrLower.includes('double tick') ||
      ocrLower.includes('blue tick') ||
      ocrLower.includes('✓✓') ||
      ocrLower.includes('facebook messenger') ||
      ocrLower.includes('slack') ||
      ocrLower.includes('discord') ||
      /\b(replied|typing|delivered|seen|read\s+\d|sent\s+\d|dm|inbox)\b/.test(ocrLower)
    ) {
      category = 'chat';
    } else if (
      (parsed.game_result && typeof parsed.game_result.kills === 'number') ||
      ocrLower.includes('winner winner') ||
      ocrLower.includes('chicken dinner') ||
      ocrLower.includes('bgmi') ||
      ocrLower.includes('pubg') ||
      ocrLower.includes('eliminated') ||
      ocrLower.includes('victory royale') ||
      ocrLower.includes('booyah') ||
      ocrLower.includes('defeat') ||
      ocrLower.includes('game over') ||
      ocrLower.includes('match result') ||
      ocrLower.includes('mvp') ||
      ocrLower.includes('headshot') ||
      ocrLower.includes('free fire') ||
      ocrLower.includes('valorant') ||
      ocrLower.includes('clash') ||
      ocrLower.includes('cod mobile') ||
      /\b(\d+\s*kills?|kills?\s*:\s*\d+|squad|solo|duo)\b/.test(ocrLower)
    ) {
      category = 'game';
    } else if (
      ocrLower.includes('add to cart') ||
      ocrLower.includes('buy now') ||
      ocrLower.includes('in stock') ||
      ocrLower.includes('wishlist') ||
      ocrLower.includes('save for later') ||
      ocrLower.includes('ratings') ||
      ocrLower.includes('reviews') ||
      ocrLower.includes('shipping') ||
      ocrLower.includes('delivery') ||
      ocrLower.includes('flipkart') ||
      ocrLower.includes('amazon') ||
      ocrLower.includes('myntra') ||
      ocrLower.includes('meesho') ||
      ocrLower.includes('mrp') ||
      ocrLower.includes('discount') ||
      /[\$₹€£]\s*\d+/.test(ocrLower) ||
      /\d+%\s*off\b/.test(ocrLower)
    ) {
      category = 'product';
    } else if (
      ocrLower.includes('invoice') ||
      ocrLower.includes('receipt') ||
      ocrLower.includes('boarding pass') ||
      ocrLower.includes('total amount') ||
      ocrLower.includes('certificate') ||
      ocrLower.includes('memo') ||
      ocrLower.includes('notice') ||
      ocrLower.includes('bill') ||
      ocrLower.includes('statement') ||
      ocrLower.includes('page ') ||
      ocrLower.includes('.pdf')
    ) {
      category = 'poster_document';
    }
  }

  return {
    category,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
    ocr_text: ocrText,
    visual_description: visualDescription,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    provider,
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
          raw_extracted_text: ocrText.substring(0, 500),
        }
      : null,
  };
}

/**
 * Provider 1: Google Gemini Multimodal Vision
 */
async function callGeminiVision(base64Data: string, mimeType: string): Promise<ScreenshotAnalysisPayload> {
  if (!genAI || !geminiApiKey) throw new Error('Gemini API not configured');

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const result = await model.generateContent([
        COMMON_PROMPT,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);

      const responseText = result.response.text().trim();
      const parsed = JSON.parse(responseText);
      return normalizeAnalysis(parsed, `Google Gemini (${modelName})`);
    } catch (err: any) {
      console.warn(`Gemini ${modelName} returned status ${err.status || err.message?.substring(0, 50)}, falling back...`);
    }
  }

  throw new Error('All Gemini candidate models failed');
}

/**
 * Provider 2: Mistral Pixtral Vision (High precision multilingual OCR and layout)
 */
async function callMistralVision(base64Data: string, mimeType: string): Promise<ScreenshotAnalysisPayload> {
  if (!mistralApiKey) throw new Error('Mistral API not configured');

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: COMMON_PROMPT },
            { type: 'image_url', image_url: `data:${mimeType};base64,${base64Data}` },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Mistral API error: ${JSON.stringify(errorData)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = JSON.parse(content);
  return normalizeAnalysis(parsed, 'Mistral Pixtral 12B');
}

/**
 * Provider 3: OpenRouter Multimodal Vision (OpenAI GPT-4o-mini)
 */
async function callOpenRouterVision(base64Data: string, mimeType: string): Promise<ScreenshotAnalysisPayload> {
  if (!openrouterApiKey) throw new Error('OpenRouter API not configured');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://recall.dev',
      'X-Title': 'Recall AI',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: COMMON_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`OpenRouter error: ${JSON.stringify(errorData)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = JSON.parse(content);
  return normalizeAnalysis(parsed, 'OpenAI GPT-4o-mini (OpenRouter)');
}

/**
 * Provider 4: Groq High-Speed LPU Structurer (openai/gpt-oss-120b)
 */
async function callGroqStructuring(ocrText: string, originalFilename: string): Promise<ScreenshotAnalysisPayload> {
  if (!groqApiKey) throw new Error('Groq API not configured');

  const groqPrompt = `You are RECALL's secondary AI structuring engine.
Analyze this text extracted from screenshot filename "${originalFilename}":
"""
${ocrText.substring(0, 3000) || originalFilename}
"""

Return a VALID JSON object matching:
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": 0.90,
  "visual_description": "Clear visual description of content and layout",
  "tags": ["array", "of", "searchable", "tags"],
  "messages": [],
  "game_result": null
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: groqPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!res.ok) throw new Error('Groq structuring request failed');
  const groqData: any = await res.json();
  const content = groqData.choices?.[0]?.message?.content?.trim() || '';
  const parsed = JSON.parse(content);
  return normalizeAnalysis({ ...parsed, ocr_text: ocrText }, 'Groq LPU (GPT-OSS-120B)');
}

export async function analyzeScreenshot(
  filePath: string,
  mimeType: string,
  originalFilename: string,
  fallbackBase64?: string | null
): Promise<ScreenshotAnalysisPayload> {
  // Read and sanitize image bytes safely
  let rawBase64: string | null = fallbackBase64 || null;
  if (!rawBase64 && filePath && fs.existsSync(filePath)) {
    try {
      rawBase64 = fs.readFileSync(filePath).toString('base64');
    } catch (readErr) {
      console.warn('Failed to read image file from disk:', readErr);
    }
  }

  // Strip any data URI prefix to ensure clean base64 data
  const base64Data = rawBase64
    ? rawBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim()
    : null;

  let resolvedMime = mimeType || 'image/jpeg';
  if (originalFilename.endsWith('.svg') || resolvedMime.includes('svg')) {
    resolvedMime = 'image/svg+xml';
  } else if (originalFilename.endsWith('.png')) {
    resolvedMime = 'image/png';
  } else if (originalFilename.endsWith('.webp')) {
    resolvedMime = 'image/webp';
  }

  // Tier 1: Multi-Provider Vision Race (Gemini + Mistral Pixtral + OpenRouter)
  // Whichever high-precision vision model responds successfully first wins!
  if (base64Data) {
    const visionTasks: Promise<ScreenshotAnalysisPayload>[] = [];

    if (geminiApiKey) {
      visionTasks.push(callGeminiVision(base64Data, resolvedMime));
    }
    if (mistralApiKey) {
      visionTasks.push(callMistralVision(base64Data, resolvedMime));
    }
    if (openrouterApiKey) {
      visionTasks.push(callOpenRouterVision(base64Data, resolvedMime));
    }

    if (visionTasks.length > 0) {
      try {
        const winningResult = await Promise.any(visionTasks);
        console.log(`⚡ AI Vision processed screenshot via ${winningResult.provider || 'Ensemble'}`);
        return winningResult;
      } catch (raceErr) {
        console.warn('All multi-provider vision models failed or were busy, proceeding to Tier 2:', raceErr);
      }
    }
  }

  // Tier 2: Groq High-Speed LPU Structurer + Local OCR
  let localOcrText = '';
  try {
    if (filePath && fs.existsSync(filePath)) {
      localOcrText = await performLocalOCR(filePath);
    }
  } catch (ocrErr) {
    console.warn('Local OCR execution notice:', ocrErr);
  }

  if (groqApiKey && (localOcrText.trim().length > 0 || originalFilename.length > 0)) {
    try {
      const groqResult = await callGroqStructuring(localOcrText || originalFilename, originalFilename);
      return groqResult;
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
    provider: 'Rule-Based Heuristics',
    messages: heuristic.messages,
    game_result: heuristic.game_result,
  };
}
