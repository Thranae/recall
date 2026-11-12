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
  visual_entities?: {
    people?: string[];
    clothing_and_colors?: string[];
    dominant_colors?: string[];
    objects_and_scene?: string[];
  };
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

const COMMON_PROMPT = `You are RECALL's universal AI multimodal vision engine.
The input image may be EITHER a real-world photograph / portrait / camera picture OR a digital / mobile screenshot.
Inspect EVERYTHING in the image with forensic visual and textual accuracy — subjects, people, genders, clothing, exact colors, objects, background scenery, UI elements, AND all visible text.

Return a VALID JSON object matching this exact structure:
{
  "category": "chat" | "game" | "product" | "poster_document" | "other",
  "confidence": 0.98,
  "ocr_text": "Complete verbatim transcription of EVERY readable word, number, timestamp, name, price, URL, or label visible in the image. Return empty string \"\" if no text is present in the photo.",
  "visual_description": "Comprehensive 3-5 sentence description. If people are visible, explicitly state who they are (e.g., boy, girl, young man, young woman, child, man, woman, couple, group), their exact clothing & colors (e.g., black shirt, black t-shirt, blue jeans, red dress, white sneakers), accessories (glasses, watch, hat), expression, pose, objects, and setting. If it is an app screenshot, describe the app UI, layout, messages, scores, or prices clearly.",
  "visual_entities": {
    "people": ["exact person descriptors visible, e.g., boy, young man, male, smiling boy, OR girl, young woman, female — empty array if none"],
    "clothing_and_colors": ["every garment with color, e.g., black shirt, black t-shirt, black top, blue denim jeans, white shoes"],
    "dominant_colors": ["top 3-5 exact color names prominent in the image, e.g., black, white, blue, green, red"],
    "objects_and_scene": ["notable objects, animals, vehicles, lighting, indoor/outdoor environment, e.g., portrait, outdoor, sunglasses, car, dog, coffee"]
  },
  "tags": ["20-35 comprehensive searchable lowercase tags combining people, gender/age, clothing, exact colors, objects, scenery, actions, app names, brands, and key topics"],
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
    "score": 100,
    "rank": "#1 Winner Winner Chicken Dinner" or rank text,
    "damage": 2450,
    "match_date": null,
    "extraction_confidence": 0.95
  }
}

CATEGORIZATION RULES:
1. "chat": Any messaging UI with chat bubbles or conversational thread (WhatsApp, Telegram, iMessage, Instagram DMs, Discord, SMS, Slack, Messenger).
2. "game": Any video game match scoreboard, victory/defeat banner, kill counter, or in-game HUD.
3. "product": Any e-commerce product listing, shopping cart, or storefront page with price/Buy buttons (Amazon, Flipkart, Myntra, Nike, etc.). Note: A normal photo of a person wearing clothes is NOT "product" — classify real-world portraits/photos as "other".
4. "poster_document": Any document, PDF, receipt, bill, invoice, ticket, certificate, slide, book page, or event poster.
5. "other": Real-world photos, portraits, selfies, people (boys, girls, men, women), animals, cars, scenery, wallpapers, web browser UI, or settings.

PRECISION REQUIREMENT:
- For any photo containing people, ALWAYS include intuitive everyday words in visual_entities and tags (e.g., if a young male is shown, include BOTH "boy" / "man" / "male" as appropriate; if female, include "girl" / "woman" / "female"; for any dark top, include both "black" and "black shirt" / "black t-shirt" if applicable).
- Include single-word colors (e.g. "black", "blue", "white") AND combined phrases (e.g. "black shirt") in tags so searching either "black", "boy", or "black shirt" matches accurately.
- Never write "No text found" in ocr_text; use "" when no text is readable.`;

const PHOTO_VISUAL_SYNONYMS: Record<string, string[]> = {
  boy: ['boy', 'male'],
  'young man': ['boy', 'man', 'male', 'guy'],
  man: ['man', 'male'],
  girl: ['girl', 'female'],
  'young woman': ['girl', 'woman', 'female', 'lady'],
  woman: ['woman', 'female'],
  't-shirt': ['t-shirt', 'shirt', 'top'],
  tshirt: ['t-shirt', 'shirt', 'top'],
  tee: ['t-shirt', 'shirt', 'top'],
  shirt: ['shirt', 'top'],
  hoodie: ['hoodie', 'sweatshirt', 'top'],
  kurta: ['kurta', 'shirt', 'ethnic'],
  sneakers: ['sneakers', 'shoes'],
  jeans: ['jeans', 'pants', 'denim'],
  sunglasses: ['sunglasses', 'glasses'],
  puppy: ['puppy', 'dog'],
  kitten: ['kitten', 'cat'],
};

function enrichVisualTags(rawTags: string[], visualEntities: any, visualDescription: string): string[] {
  const tagSet = new Set<string>();

  const pushTag = (t: string) => {
    const clean = String(t || '').trim().toLowerCase();
    if (!clean || clean.length < 2) return;
    tagSet.add(clean);
    // Split multi-word apparel/color tags like "black shirt" into individual searchable atoms too ("black", "shirt")
    const parts = clean.split(/[\s,/]+/).filter(p => p.length >= 2);
    for (const part of parts) {
      if (!['with', 'and', 'the', 'for', 'wearing', 'looking'].includes(part)) {
        tagSet.add(part);
      }
    }
    if (PHOTO_VISUAL_SYNONYMS[clean]) {
      for (const syn of PHOTO_VISUAL_SYNONYMS[clean]) {
        tagSet.add(syn);
      }
    }
  };

  if (Array.isArray(rawTags)) {
    rawTags.forEach(pushTag);
  }

  if (visualEntities && typeof visualEntities === 'object') {
    for (const bucket of ['people', 'clothing_and_colors', 'dominant_colors', 'objects_and_scene']) {
      if (Array.isArray(visualEntities[bucket])) {
        visualEntities[bucket].forEach(pushTag);
      }
    }
  }

  // Extract explicit visual subject/color cues mentioned in visual_description if missing
  const descLower = (visualDescription || '').toLowerCase();
  const explicitCues = [
    'boy', 'girl', 'man', 'woman', 'child', 'kid', 'person', 'people', 'portrait', 'selfie',
    'black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'brown', 'grey', 'gray',
    'shirt', 't-shirt', 'hoodie', 'jacket', 'dress', 'jeans', 'shoes', 'sneakers', 'glasses', 'sunglasses',
    'car', 'bike', 'dog', 'cat', 'outdoor', 'indoor', 'smiling',
  ];
  for (const cue of explicitCues) {
    const re = new RegExp(`\\b${cue}\\b`, 'i');
    if (re.test(descLower)) {
      pushTag(cue);
    }
  }

  return Array.from(tagSet).slice(0, 45);
}

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
  if (/^(none|n\/a|no text|no readable text)$/i.test(ocrText.trim())) {
    ocrText = '';
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

  const rawOcrLower = ocrText.toLowerCase();
  const descLower = visualDescription.toLowerCase();

  // Secondary intelligent category validation (strictly using OCR + UI indicators so portraits are never misclassified)
  if (category === 'other') {
    if (
      (Array.isArray(parsed.messages) && parsed.messages.length > 0) ||
      descLower.includes('whatsapp') ||
      descLower.includes('imessage') ||
      descLower.includes('telegram') ||
      descLower.includes('chat bubble') ||
      descLower.includes('messaging app') ||
      rawOcrLower.includes('online •') ||
      rawOcrLower.includes('type a message') ||
      rawOcrLower.includes('last seen') ||
      rawOcrLower.includes('double tick') ||
      rawOcrLower.includes('✓✓') ||
      (/\b(delivered|read\s+\d|sent\s+\d)\b/.test(rawOcrLower) && rawOcrLower.length > 10)
    ) {
      category = 'chat';
    } else if (
      (parsed.game_result && typeof parsed.game_result.kills === 'number') ||
      rawOcrLower.includes('winner winner') ||
      rawOcrLower.includes('chicken dinner') ||
      rawOcrLower.includes('bgmi') ||
      rawOcrLower.includes('pubg') ||
      rawOcrLower.includes('victory royale') ||
      rawOcrLower.includes('booyah') ||
      /\b(\d+\s*kills?|kills?\s*:\s*\d+)\b/.test(rawOcrLower)
    ) {
      category = 'game';
    } else if (
      rawOcrLower.includes('add to cart') ||
      rawOcrLower.includes('buy now') ||
      rawOcrLower.includes('mrp') ||
      (descLower.includes('e-commerce') && /[\$₹€£]\s*\d+/.test(rawOcrLower)) ||
      (rawOcrLower.includes('flipkart') || rawOcrLower.includes('amazon') || rawOcrLower.includes('myntra'))
    ) {
      category = 'product';
    } else if (
      rawOcrLower.includes('invoice') ||
      rawOcrLower.includes('receipt') ||
      rawOcrLower.includes('boarding pass') ||
      rawOcrLower.includes('total amount') ||
      rawOcrLower.includes('certificate')
    ) {
      category = 'poster_document';
    }
  }

  const enrichedTags = enrichVisualTags(
    Array.isArray(parsed.tags) ? parsed.tags : [],
    parsed.visual_entities,
    visualDescription
  );

  return {
    category,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
    ocr_text: ocrText,
    visual_description: visualDescription,
    tags: enrichedTags,
    visual_entities: parsed.visual_entities,
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

function safeParseJson(raw: string): any {
  const cleaned = (raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Invalid JSON payload from vision provider');
  }
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
      const parsed = safeParseJson(responseText);
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
  const parsed = safeParseJson(content);
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
  const parsed = safeParseJson(content);
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
  const parsed = safeParseJson(content);
  return normalizeAnalysis({ ...parsed, ocr_text: ocrText }, 'Groq LPU (GPT-OSS-120B)');
}

function resolveCleanImagePayload(
  filePath: string,
  mimeType: string,
  originalFilename: string,
  fallbackBase64?: string | null
): { base64Data: string | null; resolvedMime: string } {
  let rawBase64: string | null = fallbackBase64 || null;
  if (!rawBase64 && filePath && fs.existsSync(filePath)) {
    try {
      rawBase64 = fs.readFileSync(filePath).toString('base64');
    } catch (readErr) {
      console.warn('Failed to read image file from disk:', readErr);
    }
  }

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

  return { base64Data, resolvedMime };
}

export async function analyzeScreenshot(
  filePath: string,
  mimeType: string,
  originalFilename: string,
  fallbackBase64?: string | null
): Promise<ScreenshotAnalysisPayload> {
  const { base64Data, resolvedMime } = resolveCleanImagePayload(filePath, mimeType, originalFilename, fallbackBase64);

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

/**
 * Interactive Visual Q&A ("Memory Lens"):
 * Inspects a single image directly with the multimodal vision ensemble to answer follow-up user questions.
 */
export async function answerImageQuestion(
  filePath: string,
  mimeType: string,
  originalFilename: string,
  fallbackBase64: string | null | undefined,
  storedContext: { visual_description?: string; ocr_text?: string; tags?: string[] },
  question: string
): Promise<{ answer: string; provider: string }> {
  const { base64Data, resolvedMime } = resolveCleanImagePayload(filePath, mimeType, originalFilename, fallbackBase64);

  const qaPrompt = `You are RECALL's visual intelligence assistant answering a user's question about THIS specific image ("${originalFilename}").
Answer directly, accurately, and concisely (2-4 crisp sentences) based strictly on what is visible in the image.
If the user asks about people (boy, girl, man, woman), clothing, colors, objects, numbers, or text, inspect carefully and state exact details.

User Question: "${question}"`;

  if (base64Data) {
    const tasks: Promise<{ answer: string; provider: string }>[] = [];

    if (genAI && geminiApiKey) {
      tasks.push(
        (async () => {
          for (const modelName of CANDIDATE_GEMINI_MODELS.slice(0, 3)) {
            try {
              const model = genAI.getGenerativeModel({ model: modelName });
              const result = await model.generateContent([
                qaPrompt,
                { inlineData: { data: base64Data, mimeType: resolvedMime } },
              ]);
              const text = result.response.text().trim();
              if (text) return { answer: text, provider: `Gemini (${modelName})` };
            } catch {}
          }
          throw new Error('Gemini QA failed');
        })()
      );
    }

    if (mistralApiKey) {
      tasks.push(
        (async () => {
          const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${mistralApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'pixtral-12b-2409',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: qaPrompt },
                    { type: 'image_url', image_url: `data:${resolvedMime};base64,${base64Data}` },
                  ],
                },
              ],
              max_tokens: 450,
              temperature: 0.2,
            }),
          });
          if (!res.ok) throw new Error('Mistral QA failed');
          const data: any = await res.json();
          const answer = data.choices?.[0]?.message?.content?.trim();
          if (!answer) throw new Error('Empty Mistral QA answer');
          return { answer, provider: 'Mistral Pixtral 12B' };
        })()
      );
    }

    if (openrouterApiKey) {
      tasks.push(
        (async () => {
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
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: qaPrompt },
                    { type: 'image_url', image_url: { url: `data:${resolvedMime};base64,${base64Data}` } },
                  ],
                },
              ],
              max_tokens: 450,
              temperature: 0.2,
            }),
          });
          if (!res.ok) throw new Error('OpenRouter QA failed');
          const data: any = await res.json();
          const answer = data.choices?.[0]?.message?.content?.trim();
          if (!answer) throw new Error('Empty OpenRouter QA answer');
          return { answer, provider: 'GPT-4o-mini' };
        })()
      );
    }

    if (tasks.length > 0) {
      try {
        return await Promise.any(tasks);
      } catch (err) {
        console.warn('Multimodal image QA failed, trying text context fallback:', err);
      }
    }
  }

  // Fallback to Groq LPU using extracted metadata
  if (groqApiKey) {
    try {
      const contextText = `Visual Description: ${storedContext.visual_description || 'N/A'}\nOCR Text: ${storedContext.ocr_text || 'None'}\nTags: ${(storedContext.tags || []).join(', ')}`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'user',
              content: `Based on this indexed image metadata for "${originalFilename}":\n${contextText}\n\nAnswer concisely: "${question}"`,
            },
          ],
          max_tokens: 300,
          temperature: 0.2,
        }),
      });
      if (res.ok) {
        const data: any = await res.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        if (answer) return { answer, provider: 'Groq LPU Context' };
      }
    } catch {}
  }

  return {
    answer: storedContext.visual_description || 'Could not reach AI vision providers at the moment. Try clicking Re-Analyze above.',
    provider: 'Cached Summary',
  };
}

/**
 * Cross-Gallery Answer Synthesis ("Ask Recall AI"):
 * Synthesizes a direct, conversational answer across top matching images/screenshots using Groq / Gemini / OpenRouter.
 */
export async function synthesizeVaultAnswer(
  query: string,
  topMatches: Array<{
    id: string;
    filename: string;
    category: string;
    visual_description?: string;
    ocr_text?: string;
    tags?: string[];
    matched_game?: any;
    matched_messages?: any[];
  }>
): Promise<{ answer: string; cited_ids: string[]; provider: string }> {
  if (topMatches.length === 0) {
    return {
      answer: `I couldn't find any images or screenshots in your vault matching "${query}". Try uploading or re-analyzing recent photos.`,
      cited_ids: [],
      provider: 'Recall Index',
    };
  }

  const evidenceBlock = topMatches
    .slice(0, 6)
    .map((m, idx) => {
      const parts = [`[Item ${idx + 1} | ID: ${m.id} | File: ${m.filename} | Category: ${m.category}]`];
      if (m.visual_description) parts.push(`Visual: ${m.visual_description.substring(0, 350)}`);
      if (m.tags && m.tags.length > 0) parts.push(`Tags: ${m.tags.slice(0, 20).join(', ')}`);
      if (m.ocr_text) parts.push(`Text: ${m.ocr_text.substring(0, 350).replace(/\n+/g, ' ')}`);
      if (m.matched_game) parts.push(`Game Stat: ${m.matched_game.game_name}, ${m.matched_game.kills} kills, Rank ${m.matched_game.rank}`);
      return parts.join('\n');
    })
    .join('\n\n');

  const synthesisPrompt = `You are Recall AI, the user's private visual & screenshot memory assistant.
Answer the user's question directly and concisely (2-3 crisp sentences max) using ONLY the matched gallery evidence below.
Be specific: mention names, clothing/colors, exact numbers, replies, or filenames when relevant. Do not invent facts.

Return a VALID JSON object:
{
  "answer": "Concise, helpful direct answer synthesizing what is found across the images.",
  "cited_ids": ["exact_item_ids_that_directly_support_the_answer"]
}

User Question: "${query}"

Matched Vault Items:
${evidenceBlock}`;

  const tasks: Promise<{ answer: string; cited_ids: string[]; provider: string }>[] = [];

  if (groqApiKey) {
    tasks.push(
      (async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: synthesisPrompt }],
            response_format: { type: 'json_object' },
            max_tokens: 400,
            temperature: 0.15,
          }),
        });
        if (!res.ok) throw new Error('Groq synthesis failed');
        const data: any = await res.json();
        const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
        if (!parsed.answer) throw new Error('Empty Groq answer');
        return {
          answer: parsed.answer,
          cited_ids: Array.isArray(parsed.cited_ids) ? parsed.cited_ids : [topMatches[0].id],
          provider: 'Groq LPU',
        };
      })()
    );
  }

  if (openrouterApiKey) {
    tasks.push(
      (async () => {
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
            messages: [{ role: 'user', content: synthesisPrompt }],
            response_format: { type: 'json_object' },
            max_tokens: 400,
            temperature: 0.15,
          }),
        });
        if (!res.ok) throw new Error('OpenRouter synthesis failed');
        const data: any = await res.json();
        const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
        if (!parsed.answer) throw new Error('Empty OpenRouter answer');
        return {
          answer: parsed.answer,
          cited_ids: Array.isArray(parsed.cited_ids) ? parsed.cited_ids : [topMatches[0].id],
          provider: 'GPT-4o-mini',
        };
      })()
    );
  }

  if (genAI && geminiApiKey) {
    tasks.push(
      (async () => {
        const model = genAI.getGenerativeModel({
          model: CANDIDATE_GEMINI_MODELS[0],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.15 },
        });
        const result = await model.generateContent(synthesisPrompt);
        const parsed = safeParseJson(result.response.text().trim());
        if (!parsed.answer) throw new Error('Empty Gemini answer');
        return {
          answer: parsed.answer,
          cited_ids: Array.isArray(parsed.cited_ids) ? parsed.cited_ids : [topMatches[0].id],
          provider: 'Gemini Flash',
        };
      })()
    );
  }

  if (tasks.length > 0) {
    try {
      return await Promise.any(tasks);
    } catch {}
  }

  // Deterministic clean summary fallback
  const lead = topMatches[0];
  return {
    answer: `Found ${topMatches.length} matching item${topMatches.length === 1 ? '' : 's'}. Top match is ${lead.filename}: ${lead.visual_description || lead.ocr_text?.substring(0, 120) || 'Visual match detected.'}`,
    cited_ids: [lead.id],
    provider: 'Recall Index',
  };
}

export interface SmartCoachResponse {
  mode: 'chat_replies' | 'receipt_safety' | 'memory_insight';
  title: string;
  summary: string;
  replies?: Array<{ tone: string; text: string }>;
  safety_status?: 'safe' | 'caution';
  safety_note?: string;
  detected_amount?: string | null;
  key_points?: string[];
  provider: string;
}

/**
 * Smart Coach & Receipt/Safety Inspector:
 * Generates 3 contextual chat replies for chat screenshots, scam/total extraction for receipts/links,
 * or highlights for gaming & real-world photos.
 */
export async function generateSmartCoachInsights(payload: {
  category: string;
  original_filename: string;
  visual_description: string;
  ocr_text: string;
  tags: string[];
  messages?: Array<{ sender_side?: string; sender_label?: string; message_text: string }>;
  game_result?: { game_name?: string; kills?: number | null; rank?: string | null; damage?: number | null; map_name?: string | null } | null;
}): Promise<SmartCoachResponse> {
  const ocr = (payload.ocr_text || '').trim();
  const desc = (payload.visual_description || '').trim();
  const msgs = payload.messages || [];
  const isChat = payload.category === 'chat' || msgs.length > 0;
  const hasFinancialOrLink =
    /[$₹€£]\s*\d+|total|paid|amount|invoice|order|otp|http[s]?:\/\/|bit\.ly|tinyurl|verify|urgent|bank|upi/i.test(ocr) ||
    payload.category === 'product' ||
    payload.category === 'poster_document';

  const mode: SmartCoachResponse['mode'] = isChat
    ? 'chat_replies'
    : hasFinancialOrLink
      ? 'receipt_safety'
      : 'memory_insight';

  const chatSnippet = msgs.length > 0
    ? msgs.map(m => `${m.sender_side === 'right' ? 'Me' : (m.sender_label || 'Them')}: ${m.message_text}`).join('\n')
    : ocr.substring(0, 1200);

  const coachPrompt = isChat
    ? `You are RECALL's Smart Chat Reply Coach.
Based on this chat conversation screenshot:
"""
${chatSnippet || desc}
"""
Visual context: ${desc}

Return ONLY valid JSON:
{
  "summary": "One crisp sentence summarizing the chat mood and what needs a reply",
  "replies": [
    { "tone": "Casual", "text": "Natural friendly reply under 18 words" },
    { "tone": "Warm", "text": "Warm thoughtful reply under 20 words" },
    { "tone": "Concise", "text": "Short direct reply under 10 words" }
  ]
}`
    : hasFinancialOrLink
      ? `You are RECALL's Receipt & Link Safety Inspector.
Inspect this screenshot/photo:
Filename: ${payload.original_filename}
Visual: ${desc}
Text/OCR:
"""
${ocr.substring(0, 1600) || '(no text)'}
"""

Analyze any prices, totals, URLs, domains, urgent requests, or verification codes. Flag phishing/suspicious shortened links or urgent money demands as "caution".
Return ONLY valid JSON:
{
  "summary": "1-2 sentence breakdown of the item, order, document, or link",
  "detected_amount": "$XX.XX or null",
  "safety_status": "safe" | "caution",
  "safety_note": "Short explanation of why link/sender looks safe or needs verification",
  "key_points": ["2 to 3 crisp factual bullet insights"]
}`
      : `You are RECALL's Memory Coach.
Analyze this saved image/scoreboard:
Category: ${payload.category}
Visual: ${desc}
Tags: ${(payload.tags || []).slice(0, 12).join(', ')}
Game Stats: ${payload.game_result ? JSON.stringify(payload.game_result) : 'None'}
OCR: ${ocr.substring(0, 800)}

Return ONLY valid JSON:
{
  "summary": "1-2 sentence insightful highlight of what stands out in this image",
  "key_points": ["2 to 3 helpful observations, colors, outfits, or performance stats"]
}`;

  const mapCoachResult = (parsed: any, provider: string): SmartCoachResponse => ({
    mode,
    title: isChat ? 'Suggested Replies' : hasFinancialOrLink ? 'Receipt & Safety Check' : 'Memory Insights',
    summary: parsed.summary || desc || 'Analyzed memory.',
    replies: Array.isArray(parsed.replies) ? parsed.replies.slice(0, 3) : undefined,
    safety_status: parsed.safety_status === 'caution' ? 'caution' : parsed.safety_status === 'safe' ? 'safe' : undefined,
    safety_note: parsed.safety_note,
    detected_amount: parsed.detected_amount ?? null,
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 4) : undefined,
    provider,
  });

  const tasks: Promise<SmartCoachResponse>[] = [];

  if (groqApiKey) {
    tasks.push(
      (async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: coachPrompt }],
            response_format: { type: 'json_object' },
            max_tokens: 450,
            temperature: 0.2,
          }),
        });
        if (!res.ok) throw new Error('Groq coach failed');
        const data: any = await res.json();
        return mapCoachResult(safeParseJson(data.choices?.[0]?.message?.content || '{}'), 'Groq LPU');
      })()
    );
  }

  if (openrouterApiKey) {
    tasks.push(
      (async () => {
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
            messages: [{ role: 'user', content: coachPrompt }],
            response_format: { type: 'json_object' },
            max_tokens: 450,
            temperature: 0.2,
          }),
        });
        if (!res.ok) throw new Error('OpenRouter coach failed');
        const data: any = await res.json();
        return mapCoachResult(safeParseJson(data.choices?.[0]?.message?.content || '{}'), 'GPT-4o-mini');
      })()
    );
  }

  if (genAI && geminiApiKey) {
    tasks.push(
      (async () => {
        const model = genAI.getGenerativeModel({
          model: CANDIDATE_GEMINI_MODELS[0],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        });
        const result = await model.generateContent(coachPrompt);
        return mapCoachResult(safeParseJson(result.response.text().trim()), 'Gemini Flash');
      })()
    );
  }

  if (tasks.length > 0) {
    try {
      return await Promise.any(tasks);
    } catch {}
  }

  // Deterministic fallback
  if (isChat) {
    return {
      mode: 'chat_replies',
      title: 'Suggested Replies',
      summary: 'Ready-to-send replies drafted from your conversation thread.',
      replies: [
        { tone: 'Casual', text: 'Sounds good to me! Let me check and get back to you.' },
        { tone: 'Warm', text: 'Thanks for letting me know—appreciate it!' },
        { tone: 'Concise', text: 'Got it, noted!' },
      ],
      provider: 'Recall Coach',
    };
  }

  const priceMatch = ocr.match(/([₹$€£]\s*[\d,]+(?:\.\d{1,2})?)/);
  const suspicious = /(bit\.ly|tinyurl|kyc\s*suspend|verify\s*now|urgent\s*transfer|claim\s*prize)/i.test(ocr);

  if (hasFinancialOrLink) {
    return {
      mode: 'receipt_safety',
      title: 'Receipt & Safety Check',
      summary: desc || 'Extracted payment, product, or document text.',
      detected_amount: priceMatch ? priceMatch[1] : null,
      safety_status: suspicious ? 'caution' : 'safe',
      safety_note: suspicious
        ? 'Contains shortened links or urgent phrasing—verify sender before acting.'
        : 'No common urgency or shortened phishing markers detected in extracted text.',
      key_points: payload.tags.slice(0, 3).map(t => `Detected topic: ${t}`),
      provider: 'Recall Coach',
    };
  }

  return {
    mode: 'memory_insight',
    title: 'Memory Insights',
    summary: desc || 'Indexed visual memory ready for search.',
    key_points: payload.tags.slice(0, 4),
    provider: 'Recall Index',
  };
}

export interface AiRedactWordHint {
  text: string;
  box_2d: [number, number, number, number];
}

export interface AiRedactTarget {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  matched_text?: string;
}

export interface AiRedactResult {
  targets: AiRedactTarget[];
  summary: string;
  provider: string;
}

function normalizeBox2dToRegion(
  rawBox: unknown,
  label: string,
  matchedText?: string
): AiRedactTarget | null {
  if (!Array.isArray(rawBox) || rawBox.length !== 4) return null;
  const nums = rawBox.map((n) => Number(n));
  if (nums.some((n) => !Number.isFinite(n))) return null;

  const isNormalizedUnit = nums.every((n) => n >= 0 && n <= 1.01) && nums.some((n) => n > 0 && n < 1);
  const scale = isNormalizedUnit ? 1 : 1000;

  const ymin = Math.max(0, Math.min(1, nums[0] / scale));
  const xmin = Math.max(0, Math.min(1, nums[1] / scale));
  const ymax = Math.max(0, Math.min(1, nums[2] / scale));
  const xmax = Math.max(0, Math.min(1, nums[3] / scale));

  const w = xmax - xmin;
  const h = ymax - ymin;
  if (w <= 0.004 || h <= 0.004) return null;
  if (w > 0.94 && h > 0.94) return null;

  return {
    x: xmin,
    y: ymin,
    w,
    h,
    label: label.trim() || 'Target',
    ...(matchedText ? { matched_text: matchedText.trim() } : {}),
  };
}

function parseAiRedactResponse(
  rawParsed: any,
  provider: string
): AiRedactResult {
  const rawTargets = Array.isArray(rawParsed?.targets) ? rawParsed.targets : [];
  const targets: AiRedactTarget[] = [];

  for (const item of rawTargets) {
    const label = typeof item?.label === 'string' ? item.label : 'Redacted';
    const matchedText = typeof item?.matched_text === 'string' ? item.matched_text : undefined;
    const region = normalizeBox2dToRegion(item?.box_2d ?? item?.bbox ?? item?.box, label, matchedText);
    if (region) {
      targets.push(region);
    }
  }

  const summary =
    typeof rawParsed?.summary === 'string' && rawParsed.summary.trim()
      ? rawParsed.summary.trim()
      : targets.length > 0
      ? `Targeted ${targets.length} matching region${targets.length === 1 ? '' : 's'}`
      : 'No matching element found for that instruction';

  return {
    targets: targets.slice(0, 24),
    summary,
    provider,
  };
}

function deterministicRedactHintFallback(
  instruction: string,
  ocrWordHints: AiRedactWordHint[]
): AiRedactResult {
  const q = instruction.toLowerCase();
  const isTimeQuery = /\b(time|clock|hour|timestamp|am|pm)\b/.test(q);
  const isPriceQuery = /\b(price|amount|cost|total|rs|inr|usd|\$|₹)\b/.test(q);
  const isEmailQuery = /\b(email|mail|gmail)\b/.test(q);
  const isPhoneQuery = /\b(phone|mobile|number|contact|call)\b/.test(q);

  const timePattern = /^(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[ap]m)?$/i;
  const pricePattern = /^(?:[₹$€£]\s*\d[\d,.]*|\d[\d,.]*\s?(?:rs|inr|usd))$/i;
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const phonePattern = /(?:\+?\d[\d\s-]{5,}\d)/;

  const stopWords = new Set(['blur', 'redact', 'hide', 'mask', 'only', 'the', 'this', 'image', 'screenshot', 'in', 'from', 'all', 'please', 'my']);
  const keywords = q
    .replace(/[^\w\s:]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const targets: AiRedactTarget[] = [];
  for (const hint of ocrWordHints) {
    const t = hint.text.trim();
    if (!t) continue;
    let matched = false;
    let label = 'Match';
    if (isTimeQuery && timePattern.test(t)) {
      matched = true;
      label = 'Time';
    } else if (isPriceQuery && pricePattern.test(t)) {
      matched = true;
      label = 'Amount';
    } else if (isEmailQuery && emailPattern.test(t)) {
      matched = true;
      label = 'Email';
    } else if (isPhoneQuery && phonePattern.test(t)) {
      matched = true;
      label = 'Phone';
    } else if (keywords.some((kw) => t.toLowerCase().includes(kw))) {
      matched = true;
      label = keywords[0];
    }

    if (matched) {
      const box = normalizeBox2dToRegion(hint.box_2d, label, t);
      if (box) targets.push(box);
    }
  }

  return {
    targets: targets.slice(0, 20),
    summary:
      targets.length > 0
        ? `Matched ${targets.length} item${targets.length === 1 ? '' : 's'} for "${instruction}"`
        : `No exact match found for "${instruction}"`,
    provider: 'Recall Precision Index',
  };
}

/**
 * Targeted AI Visual & Textual Redaction:
 * Locates ONLY the exact region(s) requested by the user's natural-language prompt
 * using multimodal vision grounding plus optional tight OCR word coordinates.
 */
export async function detectAiRedactTargets(
  filePath: string,
  mimeType: string,
  originalFilename: string,
  fallbackBase64: string | null | undefined,
  instruction: string,
  ocrWordHints: AiRedactWordHint[] = []
): Promise<AiRedactResult> {
  const { base64Data, resolvedMime } = resolveCleanImagePayload(
    filePath,
    mimeType,
    originalFilename,
    fallbackBase64
  );

  const compactHints = ocrWordHints
    .slice(0, 180)
    .filter((h) => h && typeof h.text === 'string' && Array.isArray(h.box_2d) && h.box_2d.length === 4);

  const hintsSection =
    compactHints.length > 0
      ? `\nMeasured OCR word tokens on a 0..1000 [ymin, xmin, ymax, xmax] grid:\n${JSON.stringify(compactHints)}\n`
      : '';

  const redactPrompt = `You are RECALL's surgical privacy redaction vision system.
The user wants to mask ONLY specific item(s) matching this instruction:
"${instruction}"

STRICT RULES:
1. Return tight bounding boxes ONLY for the requested item(s) in "targets". Do NOT redact anything else in the image unless it directly matches "${instruction}".
2. Coordinates in "box_2d" MUST use [ymin, xmin, ymax, xmax] integers in the normalized 0..1000 image coordinate space (0 = top/left edge, 1000 = bottom/right edge).
3. If the requested item is readable text (for example: time like "9:41" or "10:30 PM", date, price, phone number, OTP, name, handle, URL) AND matching tokens exist in the Measured OCR word tokens list below, use those exact tight bounds (or the minimal union covering a multi-word target). Keep the box tight around only those characters—never include nearby unrelated words or empty margin.
4. Notice special care for "time": if user asks to redact "the time", include visible clock/time indicators (such as status bar time or chat message timestamps if relevant), and do NOT include battery percentage, signal bars, dates unless requested, or sender names.
5. If the requested item is visual (such as "face", "shirt", "logo", "person", "background photo", "status bar"), return tight bounds strictly enclosing that visual subject.
6. If multiple instances match the user's instruction cleanly, return each separate tight box; if nothing in the image matches, return an empty array "targets": [].
${hintsSection}
Return STRICTLY valid JSON:
{
  "targets": [
    {
      "box_2d": [16, 44, 38, 128],
      "label": "Short 1-2 word label",
      "matched_text": "Exact visible text if textual, otherwise empty string"
    }
  ],
  "summary": "Brief 1-sentence confirmation of what was targeted"
}`;

  const visionModels = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
  ];

  if (base64Data) {
    if (genAI && geminiApiKey) {
      for (const modelName of visionModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.05,
            },
          });
          const result = await model.generateContent([
            redactPrompt,
            { inlineData: { data: base64Data, mimeType: resolvedMime } },
          ]);
          const parsed = safeParseJson(result.response.text().trim());
          return parseAiRedactResponse(parsed, `Gemini (${modelName})`);
        } catch (err) {
          console.warn(`AI redact Gemini (${modelName}) attempt failed:`, err);
        }
      }
    }

    if (openrouterApiKey) {
      try {
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
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: redactPrompt },
                  { type: 'image_url', image_url: { url: `data:${resolvedMime};base64,${base64Data}` } },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 700,
            temperature: 0.05,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
          return parseAiRedactResponse(parsed, 'GPT-4o-mini Vision');
        }
      } catch (err) {
        console.warn('AI redact OpenRouter attempt failed:', err);
      }
    }

    if (mistralApiKey) {
      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${mistralApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'pixtral-12b-2409',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: redactPrompt },
                  { type: 'image_url', image_url: `data:${resolvedMime};base64,${base64Data}` },
                ],
              },
            ],
            max_tokens: 700,
            temperature: 0.05,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
          return parseAiRedactResponse(parsed, 'Mistral Pixtral 12B');
        }
      } catch (err) {
        console.warn('AI redact Mistral attempt failed:', err);
      }
    }
  }

  return deterministicRedactHintFallback(instruction, compactHints);
}
