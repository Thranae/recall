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

  // Surgical margin (0.2%) to cover antialiased glyph contours without bleeding into adjacent words or icons
  const marginX = 0.002;
  const marginY = 0.002;

  const ymin = Math.max(0, Math.min(1, nums[0] / scale - marginY));
  const xmin = Math.max(0, Math.min(1, nums[1] / scale - marginX));
  const ymax = Math.max(0, Math.min(1, nums[2] / scale + marginY));
  const xmax = Math.max(0, Math.min(1, nums[3] / scale + marginX));

  const w = xmax - xmin;
  const h = ymax - ymin;
  if (w <= 0.004 || h <= 0.004) return null;
  if (w > 0.96 && h > 0.96) return null;

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
  const isBatteryQuery = /\b(battery|charge|charging|power|percent|percentage)\b/.test(q);
  const isNetworkQuery = /\b(wifi|wi-fi|signal|network|speed|carrier|5g|4g|lte|vowifi|volte|kb\/s|mb\/s)\b/.test(q);
  const isPriceQuery = /\b(price|amount|cost|total|balance|rs|inr|usd|\$|₹)\b/.test(q);
  const isEmailQuery = /\b(email|mail|gmail)\b/.test(q);
  const isPhoneQuery = /\b(phone|mobile|number|contact|call)\b/.test(q);
  const isUrlQuery = /\b(url|link|website|domain|site)\b/.test(q);
  const isHandleQuery = /\b(handle|username|account|id)\b/.test(q);

  const timePattern = /^(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[ap]m)?$/i;
  const batteryPercentPattern = /^\d{1,3}%$/;
  const batteryNumPattern = /^(?:100|[1-9]?\d)$/;
  const networkPattern = /^(?:vowifi|volte|wifi|wi-fi|5g|4g|3g|lte|vo|kb\/s|mb\/s)$/i;
  const pricePattern = /^(?:[₹$€£]\s*\d[\d,.]*|\d[\d,.]*\s?(?:rs|inr|usd))$/i;
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const phonePattern = /(?:\+?\d[\d\s-]{5,}\d)/;
  const urlPattern = /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|org|net|app|io|dev|in)\b)/i;
  const handlePattern = /^@[a-z0-9_.]{2,}$/i;

  const stopWords = new Set(['blur', 'redact', 'hide', 'mask', 'only', 'the', 'this', 'image', 'screenshot', 'in', 'from', 'all', 'please', 'my', 'and', 'or']);
  const keywords = q
    .replace(/[^\w\s:]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const targets: AiRedactTarget[] = [];
  for (const hint of ocrWordHints) {
    const t = hint.text.trim();
    if (!t) continue;
    const [ymin, xmin] = hint.box_2d;
    const inTopStatusBar = ymin <= 85;
    const inTopRightStatus = ymin <= 85 && xmin >= 620;

    let matched = false;
    let label = 'Match';
    if (isTimeQuery && timePattern.test(t)) {
      matched = true;
      label = 'Time';
    } else if (
      isBatteryQuery &&
      (batteryPercentPattern.test(t) || (inTopRightStatus && batteryNumPattern.test(t)))
    ) {
      matched = true;
      label = 'Battery';
    } else if (isNetworkQuery && (networkPattern.test(t) || (inTopStatusBar && /(?:kb|mb)\/s/i.test(t)))) {
      matched = true;
      label = 'Network';
    } else if (isPriceQuery && pricePattern.test(t)) {
      matched = true;
      label = 'Amount';
    } else if (isEmailQuery && emailPattern.test(t)) {
      matched = true;
      label = 'Email';
    } else if (isPhoneQuery && phonePattern.test(t)) {
      matched = true;
      label = 'Phone';
    } else if (isUrlQuery && urlPattern.test(t)) {
      matched = true;
      label = 'URL';
    } else if (isHandleQuery && handlePattern.test(t)) {
      matched = true;
      label = 'Handle';
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
 * using multimodal vision grounding, Groq semantic OCR reasoning, and tight word coordinates.
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
    .slice(0, 140)
    .filter((h) => h && typeof h.text === 'string' && Array.isArray(h.box_2d) && h.box_2d.length === 4);

  const hintsSection =
    compactHints.length > 0
      ? `\nOCR word boxes (0..1000 [ymin,xmin,ymax,xmax]):\n${JSON.stringify(compactHints)}\n`
      : '';

  const redactPrompt = `You are RECALL's surgical privacy redaction vision system.
Locate tight, exact bounding boxes matching ONLY this user instruction: "${instruction}".
Coordinates MUST use 0..1000 integers [ymin, xmin, ymax, xmax].

SURGICAL ISOLATION (CRITICAL):
- Mask ONLY the specific entity requested by "${instruction}". Strictly DO NOT mask any surrounding or adjacent elements.
- For example: if asked to redact "time", enclose ONLY the digits of the time (e.g. "10:20"). Do NOT cover nearby app notification icons, WiFi glyphs, network signal, or battery percentages.
- If asked to redact "battery", enclose ONLY the battery glyph and numeric percentage. Do NOT cover adjacent WiFi, network, or time.
- If asked to redact "name", enclose ONLY the name or handle text, not the avatar or message text next to it.
- If asked to redact "price" or "amount", enclose ONLY the price digits and currency symbol, not the product description or transaction text.
- If asked to redact "face" or "avatar", enclose ONLY the face/avatar circle, not the username or background.
- When enclosing numbers or time, fit tightly to the outermost edges of the first and last glyphs. Never mask extra pixels outside the requested target.
- Prefer tightly cropped OCR word box coordinates when readable tokens are provided below.

Return strict JSON ONLY:
{"targets":[{"box_2d":[ymin,xmin,ymax,xmax],"label":"1-2 word label","matched_text":"text or empty"}],"summary":"concise confirmation"}
${hintsSection}`;

  const callGeminiRestVision = async (
    modelName: string,
    disableThinking: boolean,
    timeoutMs: number
  ): Promise<AiRedactResult> => {
    if (!geminiApiKey || !base64Data) throw new Error('Gemini unavailable');
    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      temperature: 0.05,
      maxOutputTokens: 400,
    };
    if (disableThinking) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: redactPrompt },
                { inlineData: { mimeType: resolvedMime, data: base64Data } },
              ],
            },
          ],
          generationConfig,
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini ${modelName} HTTP ${res.status}: ${errText.slice(0, 140)}`);
    }
    const payload: any = await res.json();
    const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = safeParseJson(rawText.trim());
    return parseAiRedactResponse(parsed, `Gemini (${modelName})`);
  };

  const callMistralVision = async (modelName: string, timeoutMs: number): Promise<AiRedactResult> => {
    if (!mistralApiKey || !base64Data) throw new Error('Mistral unavailable');
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mistralApiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: modelName,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: redactPrompt },
              { type: 'image_url', image_url: { url: `data:${resolvedMime};base64,${base64Data}` } },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.05,
      }),
    });
    if (!res.ok) throw new Error(`Mistral ${modelName} status ${res.status}`);
    const data: any = await res.json();
    const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
    return parseAiRedactResponse(parsed, `Mistral (${modelName})`);
  };

  const callOpenRouterVision = async (modelName: string, timeoutMs: number): Promise<AiRedactResult> => {
    if (!openrouterApiKey || !base64Data) throw new Error('OpenRouter unavailable');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://recall.dev',
        'X-Title': 'Recall AI',
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: modelName,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: redactPrompt },
              { type: 'image_url', image_url: { url: `data:${resolvedMime};base64,${base64Data}` } },
            ],
          },
        ],
        max_tokens: 350,
        temperature: 0.05,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${modelName} status ${res.status}`);
    const data: any = await res.json();
    const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
    return parseAiRedactResponse(parsed, `OpenRouter (${modelName})`);
  };

  const callGroqSemanticOcrMatch = async (): Promise<AiRedactResult | null> => {
    if (!groqApiKey || compactHints.length === 0) return null;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: `Select OCR tokens matching "${instruction}" from this list (0..1000 [ymin,xmin,ymax,xmax]):\n${JSON.stringify(
                compactHints
              )}\nNote: battery percentages often sit at top status bar (ymin<=70, xmin>=700) as e.g. "53" or "53%".\nReturn JSON {"targets":[{"box_2d":[ymin,xmin,ymax,xmax],"label":"short label","matched_text":"text"}],"summary":"concise confirmation"}.`,
            },
          ],
          max_tokens: 350,
          temperature: 0.05,
        }),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const parsed = safeParseJson(data.choices?.[0]?.message?.content || '{}');
      return parseAiRedactResponse(parsed, 'Groq LPU Semantic Matcher');
    } catch (err) {
      console.warn('Groq semantic OCR match failed:', err);
      return null;
    }
  };

  if (base64Data) {
    let bestEmptyResult: AiRedactResult | null = null;
    const requireDetectedTargets = async (runner: Promise<AiRedactResult>): Promise<AiRedactResult> => {
      const res = await runner;
      if (res.targets.length > 0) return res;
      if (!bestEmptyResult) bestEmptyResult = res;
      throw new Error(`${res.provider} returned 0 targets`);
    };

    // Tier 1: Fast spatial grounding race across Gemini Flash-Lite variants
    if (geminiApiKey) {
      const tier1: Array<Promise<AiRedactResult>> = [];
      let primaryWon = false;

      tier1.push(
        requireDetectedTargets(callGeminiRestVision('gemini-3.1-flash-lite-preview', true, 6500)).then(
          (res) => {
            primaryWon = true;
            return res;
          }
        )
      );

      tier1.push(
        (async () => {
          await new Promise((r) => setTimeout(r, 2200));
          if (primaryWon) throw new Error('Superseded');
          return requireDetectedTargets(callGeminiRestVision('gemini-flash-lite-latest', false, 9500));
        })()
      );

      tier1.push(
        (async () => {
          await new Promise((r) => setTimeout(r, 3200));
          if (primaryWon) throw new Error('Superseded');
          return requireDetectedTargets(callGeminiRestVision('gemini-3.1-flash-lite', true, 9000));
        })()
      );

      try {
        return await Promise.any(tier1);
      } catch (err) {
        console.warn('AI redact Gemini Tier 1 did not yield targets, trying secondary vision APIs:', err);
      }
    }

    // Tier 2: Secondary Multimodal APIs (Mistral Pixtral / Small & OpenRouter Vision)
    const tier2: Array<Promise<AiRedactResult>> = [];
    if (mistralApiKey) {
      tier2.push(requireDetectedTargets(callMistralVision('pixtral-12b-2409', 5000)));
      tier2.push(requireDetectedTargets(callMistralVision('mistral-small-latest', 5000)));
    }
    if (openrouterApiKey) {
      tier2.push(requireDetectedTargets(callOpenRouterVision('openai/gpt-4o-mini', 5000)));
    }

    if (tier2.length > 0) {
      try {
        return await Promise.any(tier2);
      } catch (err) {
        console.warn('AI redact Tier 2 vision APIs finished without targets:', err);
      }
    }

    // Tier 3: Groq LPU Semantic OCR Token Matching
    const groqResult = await callGroqSemanticOcrMatch();
    if (groqResult && groqResult.targets.length > 0) {
      return groqResult;
    }

    const hintFallback = deterministicRedactHintFallback(instruction, compactHints);
    if (hintFallback.targets.length > 0) {
      return hintFallback;
    }

    if (bestEmptyResult) {
      return bestEmptyResult;
    }
  }

  return deterministicRedactHintFallback(instruction, compactHints);
}
