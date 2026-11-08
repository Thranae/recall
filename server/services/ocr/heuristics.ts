export interface ParsedMessage {
  sequence_number: number;
  message_text: string;
  sender_side: 'left' | 'right' | 'unknown';
  sender_label: string | null;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

export interface ParsedGameResult {
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
}

export interface HeuristicAnalysisResult {
  category: 'chat' | 'game' | 'product' | 'poster_document' | 'other';
  confidence: number;
  visual_description: string;
  tags: string[];
  messages: ParsedMessage[];
  game_result: ParsedGameResult | null;
}

export function parseChatMessagesFromText(rawText: string): ParsedMessage[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const messages: ParsedMessage[] = [];
  let seq = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out common phone status bar items
    if (/^\d{1,2}:\d{2}\b/i.test(line) && line.length < 10) continue;
    if (/^(LTE|5G|4G|WiFi|Battery|\d+%)$/i.test(line)) continue;
    if (/^(Online|Typing\.\.\.|Last seen|Active now)$/i.test(line)) continue;

    // Check sender cues
    let sender_side: 'left' | 'right' | 'unknown' = 'unknown';
    let sender_label: string | null = null;
    let cleanText = line;

    if (/^(Me|You|Myself):\s*(.*)/i.test(line)) {
      const match = line.match(/^(Me|You|Myself):\s*(.*)/i);
      sender_side = 'right';
      sender_label = 'You';
      cleanText = match ? match[2] : line;
    } else if (/^([A-Za-z0-9_\s]+):\s*(.*)/.test(line)) {
      const match = line.match(/^([A-Za-z0-9_\s]+):\s*(.*)/);
      if (match && match[1].length < 25) {
        sender_side = 'left';
        sender_label = match[1].trim();
        cleanText = match[2];
      }
    }

    if (cleanText.trim().length > 0) {
      messages.push({
        sequence_number: seq++,
        message_text: cleanText.trim(),
        sender_side,
        sender_label,
        confidence: sender_side !== 'unknown' ? 0.88 : 0.65,
      });
    }
  }

  return messages;
}

export function parseGameStatsFromText(rawText: string): ParsedGameResult | null {
  const lower = rawText.toLowerCase();

  const isBgmiOrPubg =
    lower.includes('bgmi') ||
    lower.includes('battlegrounds') ||
    lower.includes('pubg') ||
    lower.includes('winner winner') ||
    lower.includes('chicken dinner') ||
    lower.includes('eliminated') ||
    lower.includes('total rating') ||
    (lower.includes('kills') && (lower.includes('damage') || lower.includes('rank') || lower.includes('erangel')));

  if (!isBgmiOrPubg) {
    return null;
  }

  let kills: number | null = null;
  let score: number | null = null;
  let rank: string | null = null;
  let damage: number | null = null;
  let map_name: string | null = null;
  let mode: string | null = null;

  // Extract kills: e.g. "Kills 18", "18 Kills", "Eliminations: 14"
  const killsMatch =
    rawText.match(/(?:kills?|eliminations?)\s*[:\-]?\s*(\d+)/i) ||
    rawText.match(/(\d+)\s*(?:kills?|eliminations?)/i);
  if (killsMatch) {
    kills = parseInt(killsMatch[1], 10);
  }

  // Extract rank / placement
  if (/winner\s+winner\s+chicken\s+dinner/i.test(rawText) || /#1\s*\/\s*\d+/i.test(rawText) || /#1\s+Winner/i.test(rawText)) {
    rank = '#1 Winner Winner Chicken Dinner';
  } else {
    const rankMatch = rawText.match(/#(\d+)(?:\s*\/\s*\d+)?/);
    if (rankMatch) {
      rank = `#${rankMatch[1]}`;
    }
  }

  // Extract damage
  const damageMatch = rawText.match(/(?:damage|dmg)\s*[:\-]?\s*(\d+)/i);
  if (damageMatch) {
    damage = parseInt(damageMatch[1], 10);
  }

  // Extract score / rating
  const scoreMatch = rawText.match(/(?:score|rating|pts)\s*[:\-]?\s*(\d+)/i);
  if (scoreMatch) {
    score = parseInt(scoreMatch[1], 10);
  }

  // Extract map
  if (/erangel/i.test(rawText)) map_name = 'Erangel';
  else if (/miramar/i.test(rawText)) map_name = 'Miramar';
  else if (/sanhok/i.test(rawText)) map_name = 'Sanhok';
  else if (/livik/i.test(rawText)) map_name = 'Livik';
  else if (/vikendi/i.test(rawText)) map_name = 'Vikendi';
  else if (/nusa/i.test(rawText)) map_name = 'Nusa';

  // Extract mode
  if (/classic/i.test(rawText)) mode = 'Classic';
  else if (/arena|tdm/i.test(rawText)) mode = 'Arena / TDM';
  else if (/ranked/i.test(rawText)) mode = 'Ranked';

  return {
    game_name: 'BGMI',
    mode,
    map_name,
    kills,
    score,
    rank,
    damage,
    match_date: null,
    extraction_confidence: kills !== null ? 0.92 : 0.7,
    raw_extracted_text: rawText.substring(0, 500),
  };
}

export function analyzeScreenshotHeuristics(ocrText: string, filename: string): HeuristicAnalysisResult {
  const lowerText = ocrText.toLowerCase();
  const lowerName = filename.toLowerCase();

  // 1. Check Game Result
  const gameStats = parseGameStatsFromText(ocrText);
  if (gameStats) {
    return {
      category: 'game',
      confidence: 0.9,
      visual_description: `BGMI match outcome screen showing ${gameStats.kills ?? 'several'} kills on ${gameStats.map_name ?? 'battlefield'} with rank ${gameStats.rank ?? 'recorded'}.`,
      tags: ['bgmi', 'pubg', 'gaming', 'match result', gameStats.map_name?.toLowerCase() || 'game'].filter(Boolean),
      messages: [],
      game_result: gameStats,
    };
  }

  // 2. Check Chat Conversation
  const isChat =
    lowerText.includes('message') ||
    lowerText.includes('whatsapp') ||
    lowerText.includes('instagram') ||
    lowerText.includes('chat') ||
    lowerName.includes('chat') ||
    lowerName.includes('wa_') ||
    lowerName.includes('screenshot_') ||
    /(?:i love you|reply|replied|said|miss you|meeting|see you|call me|where are you|hey|hello|good night)/i.test(ocrText);

  const messages = parseChatMessagesFromText(ocrText);
  if (isChat || messages.length >= 2) {
    return {
      category: 'chat',
      confidence: messages.length >= 2 ? 0.88 : 0.65,
      visual_description: `Chat messaging interface thread with ${messages.length} visible messages exchange.`,
      tags: ['chat', 'conversation', 'messaging', 'text exchange'],
      messages,
      game_result: null,
    };
  }

  // 3. Check Product / Shopping
  const isProduct =
    /(\$|₹|€|£|\bprice\b|\bbuy now\b|\badd to cart\b|\boutfit\b|\bshirt\b|\bsneakers\b|\bshoes\b|\bbackpack\b|\bdress\b)/i.test(ocrText) ||
    lowerName.includes('product') ||
    lowerName.includes('shirt');

  if (isProduct) {
    return {
      category: 'product',
      confidence: 0.8,
      visual_description: 'E-commerce or shopping item screenshot displaying item features and price.',
      tags: ['product', 'shopping', 'clothing', 'item'],
      messages: [],
      game_result: null,
    };
  }

  // 4. Check Poster / Document
  const isPosterOrDoc =
    /(?:fest|symposium|conference|workshop|invitation|venue|date|registration|ticket|address|phone|bill|receipt|invoice)/i.test(ocrText);

  if (isPosterOrDoc) {
    return {
      category: 'poster_document',
      confidence: 0.82,
      visual_description: 'Official informational poster, event announcement, or receipt document.',
      tags: ['poster', 'document', 'event', 'information'],
      messages: [],
      game_result: null,
    };
  }

  return {
    category: 'other',
    confidence: 0.5,
    visual_description: 'Captured screen image containing visual and textual content.',
    tags: ['screenshot', 'general'],
    messages: [],
    game_result: null,
  };
}

