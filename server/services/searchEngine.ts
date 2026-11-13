import { db } from '../db';
import { generateTextEmbedding, computeCosineSimilarity } from './ai/embeddings';

export interface SearchFilter {
  category?: string;
  minKills?: number;
  maxKills?: number;
  exactGame?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PreciseValue {
  headline: string;
  detail: string;
  badge?: string;
}

export interface SearchResultItem {
  screenshot: any;
  match_score: number;
  match_type: 'conversation_sequence' | 'game_stats' | 'exact_phrase' | 'semantic_visual' | 'text_keyword';
  match_explanation: string;
  precise_value?: PreciseValue;
  matched_tags?: string[];
  matched_messages?: any[];
  matched_game?: any;
  confidence: number;
}

export interface SearchResponse {
  query: string;
  parsed_intent: {
    is_conversation_sequence: boolean;
    is_game_stat_query: boolean;
    is_visual_query: boolean;
    detected_first_message?: string;
    detected_reply_message?: string;
    detected_kill_filter?: { operator: string; value: number };
  };
  total_results: number;
  results: SearchResultItem[];
}

const STOP_WORDS = new Set([
  'find', 'where', 'is', 'the', 'a', 'an', 'of', 'in', 'to', 'my', 'me', 'show',
  'i', 'got', 'had', 'with', 'about', 'and', 'for', 'what', 'did', 'who', 'this',
  'that', 'from', 'her', 'she', 'he', 'him', 'they', 'them', 'was', 'were', 'at',
  'pic', 'pics', 'picture', 'pictures', 'photo', 'photos', 'image', 'images',
  'screenshot', 'screenshots', 'wearing', 'dressed', 'having', 'looking', 'seen',
  'some', 'any', 'there', 'please', 'give', 'tell', 'one', 'has', 'have'
]);

const VISUAL_CONCEPT_SYNONYMS: Record<string, string[]> = {
  boy: ['boy', 'young man', 'male', 'guy', 'teen', 'lad', 'kid'],
  girl: ['girl', 'young woman', 'female', 'lady', 'teen', 'woman'],
  man: ['man', 'male', 'gentleman', 'guy', 'boy'],
  woman: ['woman', 'female', 'lady', 'girl'],
  kid: ['kid', 'child', 'boy', 'girl', 'toddler'],
  child: ['child', 'kid', 'boy', 'girl'],
  person: ['person', 'people', 'human', 'man', 'woman', 'boy', 'girl'],
  shirt: ['shirt', 't-shirt', 'tshirt', 'tee', 'top', 'polo', 'kurta', 'hoodie', 'sweatshirt', 'blouse'],
  tshirt: ['t-shirt', 'tshirt', 'tee', 'shirt', 'top'],
  tee: ['t-shirt', 'tshirt', 'tee', 'shirt', 'top'],
  hoodie: ['hoodie', 'sweatshirt', 'jacket', 'shirt', 'top'],
  dress: ['dress', 'gown', 'frock', 'outfit', 'kurti', 'skirt'],
  jeans: ['jeans', 'pants', 'trousers', 'denim'],
  pants: ['pants', 'trousers', 'jeans', 'chinos'],
  shoes: ['shoes', 'shoe', 'sneakers', 'sneaker', 'footwear', 'boots', 'heels', 'sandals'],
  sneakers: ['sneakers', 'sneaker', 'shoes', 'shoe', 'footwear'],
  black: ['black', 'dark', 'charcoal', 'ebony', 'jet black', 'onyx'],
  white: ['white', 'ivory', 'cream', 'off-white'],
  blue: ['blue', 'navy', 'denim', 'cobalt', 'azure', 'sky blue', 'royal blue'],
  red: ['red', 'crimson', 'maroon', 'scarlet', 'burgundy'],
  green: ['green', 'olive', 'emerald', 'lime', 'mint'],
  yellow: ['yellow', 'mustard', 'gold', 'golden'],
  pink: ['pink', 'rose', 'magenta', 'blush'],
  glasses: ['glasses', 'sunglasses', 'eyewear', 'spectacles', 'shades'],
  sunglasses: ['sunglasses', 'glasses', 'shades'],
  car: ['car', 'vehicle', 'sedan', 'suv', 'automobile'],
  bike: ['bike', 'motorcycle', 'motorbike', 'scooter', 'bicycle'],
  dog: ['dog', 'puppy', 'canine', 'pet'],
  cat: ['cat', 'kitten', 'feline', 'kitty', 'pet'],
  smiling: ['smiling', 'smile', 'happy', 'laughing'],
  happy: ['happy', 'smiling', 'smile', 'laughing'],
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSynonymsForTerm(term: string): string[] {
  const lower = term.toLowerCase();
  const base = VISUAL_CONCEPT_SYNONYMS[lower] || [lower];
  return Array.from(new Set([lower, ...base]));
}

export function checkFilenameRelevance(
  originalFilename: string,
  rawQuery: string,
  keywords: string[] = []
): {
  isMatch: boolean;
  score: number;
  matchType: 'exact_filename' | 'exact_phrase' | 'text_keyword';
  explanation: string;
} {
  if (!originalFilename) return { isMatch: false, score: 0, matchType: 'text_keyword', explanation: '' };

  const nameClean = originalFilename.toLowerCase();
  const nameBase = nameClean.replace(/\.[a-z0-9]+$/i, '').trim();
  const qClean = (rawQuery || '').toLowerCase().trim();
  const qKeywords = Array.isArray(keywords) && keywords.length > 0 ? keywords : qClean.split(/\s+/).filter(Boolean);

  const normName = nameBase.replace(/[_-]+/g, ' ').trim();
  const normQ = qClean.replace(/[_-]+/g, ' ').trim();

  const significantKeywords = qKeywords.filter((k) => !STOP_WORDS.has(k) && k.length > 1);
  const targetKeywords = significantKeywords.length > 0 ? significantKeywords : qKeywords;

  // 1. Exact full title match (with or without file extension or separators)
  if (nameBase === qClean || nameClean === qClean || normName === normQ) {
    return {
      isMatch: true,
      score: 1.0,
      matchType: 'exact_filename',
      explanation: `Exact title match: "${originalFilename}".`,
    };
  }

  // Count matching words
  let matchingWordsCount = 0;
  for (const kw of targetKeywords) {
    const wordRe = new RegExp(`(^|\\s)${escapeRegExp(kw)}(\\s|$)`, 'i');
    if (wordRe.test(normName)) {
      matchingWordsCount++;
    }
  }

  // 2. Query is an exact whole-phrase inside the title (e.g. query "flight ticket", title "Tokyo Flight Ticket")
  const phraseRe = new RegExp(`(^|\\s)${escapeRegExp(normQ)}(\\s|$)`, 'i');
  if (phraseRe.test(normName)) {
    return {
      isMatch: true,
      score: 0.995,
      matchType: 'exact_filename',
      explanation: `Direct title match: contains "${rawQuery}".`,
    };
  }

  // 3. ALL target query keywords match in the title (e.g. query "find my wifi password" -> title "Wifi Password")
  if (targetKeywords.length > 0 && matchingWordsCount === targetKeywords.length) {
    return {
      isMatch: true,
      score: 0.992,
      matchType: 'exact_filename',
      explanation: `Title matches search terms: "${originalFilename}".`,
    };
  }

  return { isMatch: false, score: 0, matchType: 'text_keyword', explanation: '' };
}

function scoreVisualAndTextMatch(
  keywords: string[],
  rawQuery: string,
  sc: any
): { score: number; matchedKeywords: string[]; matchedTags: string[]; isExactVisualHit: boolean } {
  const descLower = (sc.visual_description || '').toLowerCase();
  const ocrLower = (sc.ocr_text || '').toLowerCase();
  const filenameLower = (sc.original_filename || '').toLowerCase();
  let parsedTags: string[] = [];
  if (typeof sc.tags === 'string') {
    try {
      const tmp = JSON.parse(sc.tags);
      if (Array.isArray(tmp)) parsedTags = tmp.map((t: any) => String(t).toLowerCase());
    } catch {
      parsedTags = sc.tags.toLowerCase().split(/[,\s]+/);
    }
  } else if (Array.isArray(sc.tags)) {
    parsedTags = sc.tags.map((t: any) => String(t).toLowerCase());
  }
  const tagsJoined = parsedTags.join(' ');
  const combinedVisual = `${tagsJoined} ${descLower}`;
  const combinedAll = `${tagsJoined} ${descLower} ${ocrLower} ${filenameLower}`;

  if (keywords.length === 0) {
    return { score: 0, matchedKeywords: [], matchedTags: [], isExactVisualHit: false };
  }

  let totalWeight = 0;
  const matchedKeywords: string[] = [];
  const matchedTagSet = new Set<string>();
  let visualHits = 0;

  for (const kw of keywords) {
    const exactWordRe = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
    const syns = getSynonymsForTerm(kw);

    // Priority 1: Exact whole-word match in visual tags or description (e.g. \bboy\b vs "boyfriend")
    if (exactWordRe.test(combinedVisual)) {
      totalWeight += 1.0;
      visualHits++;
      matchedKeywords.push(kw);
      matchedTagSet.add(kw);
    } else if (exactWordRe.test(ocrLower) || exactWordRe.test(filenameLower)) {
      // Priority 2: Exact whole-word match in OCR or filename
      totalWeight += 0.92;
      matchedKeywords.push(kw);
    } else {
      // Priority 3: Whole-word synonym match in visual tags or description
      let synMatched: string | null = null;
      for (const syn of syns) {
        if (syn === kw) continue;
        const synRe = new RegExp(`\\b${escapeRegExp(syn)}\\b`, 'i');
        if (synRe.test(combinedVisual)) {
          synMatched = syn;
          break;
        }
      }
      if (synMatched) {
        totalWeight += 0.78;
        visualHits++;
        matchedKeywords.push(kw);
        matchedTagSet.add(synMatched);
      } else if (combinedAll.includes(kw)) {
        // Priority 4: Partial substring match (lower weight so \bboy\b beats "boyfriend")
        totalWeight += 0.42;
        matchedKeywords.push(kw);
      }
    }
  }

  if (matchedKeywords.length === 0) {
    return { score: 0, matchedKeywords: [], matchedTags: [], isExactVisualHit: false };
  }

  const coverage = totalWeight / keywords.length;
  const qClean = keywords.join(' ');
  const exactPhraseBonus =
    keywords.length >= 2 &&
    (combinedVisual.includes(qClean) ||
      ocrLower.includes(qClean) ||
      filenameLower.includes(qClean) ||
      combinedVisual.includes(rawQuery.toLowerCase()) ||
      filenameLower.includes(rawQuery.toLowerCase()))
      ? 0.08
      : 0;

  // Compute calibrated relevance score: full multi-term matches rank 0.91 - 0.97, single partial matches ~0.68 - 0.84
  const score = Math.min(0.97, 0.56 + coverage * 0.35 + exactPhraseBonus);

  // Pull up to 4 most descriptive tags from the item that relate to the query
  for (const tag of parsedTags) {
    if (matchedTagSet.size >= 4) break;
    if (keywords.some(kw => tag.includes(kw))) {
      matchedTagSet.add(tag);
    }
  }

  return {
    score,
    matchedKeywords,
    matchedTags: Array.from(matchedTagSet).slice(0, 4),
    isExactVisualHit: visualHits > 0,
  };
}

export function extractSubstantiveKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^-+|-+$/g, ''))
    .filter(word => !STOP_WORDS.has(word) && word.length > 1);
  // Deduplicate preserving order
  return Array.from(new Set(words));
}

// Parse natural language queries for conversation sequencing, game stats, and visual cues
export function parseQueryIntent(query: string) {
  const q = query.trim();
  const lower = q.toLowerCase();

  let is_conversation_sequence = false;
  let detected_first_message: string | undefined;
  let detected_reply_message: string | undefined;

  let is_game_stat_query = false;
  let detected_kill_filter: { operator: string; value: number } | undefined;

  let is_visual_query = false;

  // 1. Detect Conversation Sequences
  const quotedSeqMatch = q.match(/["']([^"']+)["']\s*(?:and\s+)?(?:she|he|they|other)?\s*(?:replied|said|sent|answered)\s*["']([^"']+)["']/i);
  if (quotedSeqMatch) {
    is_conversation_sequence = true;
    detected_first_message = quotedSeqMatch[1].trim();
    detected_reply_message = quotedSeqMatch[2].trim();
  }

  if (!is_conversation_sequence) {
    const unquotedSeqMatch = q.match(/(?:i said|where i said|i told her)\s+([^,]+?)\s+(?:and\s+)?(?:she|he|they)\s+(?:replied|said|answered)\s+([^,\.\?]+)/i);
    if (unquotedSeqMatch) {
      is_conversation_sequence = true;
      detected_first_message = unquotedSeqMatch[1].replace(/["']/g, '').trim();
      detected_reply_message = unquotedSeqMatch[2].replace(/["']/g, '').trim();
    }
  }

  const isGeneralChatQuery =
    lower.includes('conversation') ||
    lower.includes('chat') ||
    lower.includes('where i told her') ||
    lower.includes('where she said') ||
    lower.includes('we discussed');

  // 2. Detect Game Stat Queries
  const killComparisonMatch =
    q.match(/(?:kills?|eliminations?)\s*(>|>=|<|<=|=)\s*(\d+)/i) ||
    q.match(/(?:more than|over|greater than)\s*(\d+)\s*kills?/i) ||
    q.match(/(?:at least|minimum of)\s*(\d+)\s*kills?/i) ||
    q.match(/(?:fewer than|under|less than)\s*(\d+)\s*kills?/i) ||
    q.match(/(?:got|with|had)\s*(\d+)\s*kills?/i) ||
    q.match(/(\d+)\s*kills?/i);

  if (killComparisonMatch) {
    is_game_stat_query = true;
    if (q.match(/(?:more than|over|greater than)\s*(\d+)\s*kills?/i)) {
      detected_kill_filter = { operator: '>', value: parseInt(RegExp.$1, 10) };
    } else if (q.match(/(?:at least|minimum of)\s*(\d+)\s*kills?/i)) {
      detected_kill_filter = { operator: '>=', value: parseInt(RegExp.$1, 10) };
    } else if (q.match(/(?:fewer than|under|less than)\s*(\d+)\s*kills?/i)) {
      detected_kill_filter = { operator: '<', value: parseInt(RegExp.$1, 10) };
    } else if (q.match(/(?:kills?|eliminations?)\s*(>|>=|<|<=|=)\s*(\d+)/i)) {
      detected_kill_filter = { operator: RegExp.$1, value: parseInt(RegExp.$2, 10) };
    } else {
      const val = parseInt(killComparisonMatch[1] || killComparisonMatch[2], 10);
      if (!isNaN(val)) {
        detected_kill_filter = { operator: '=', value: val };
      }
    }
  }

  if (lower.includes('bgmi') || lower.includes('pubg') || lower.includes('chicken dinner') || lower.includes('winner winner')) {
    is_game_stat_query = true;
  }

  // 3. Detect Visual Subject, People, Clothing, Colors & Object Queries
  if (
    /\b(boy|girl|man|woman|kid|child|person|people|portrait|selfie|shirt|t-shirt|tshirt|tee|hoodie|jeans|pants|sneakers|shoes|backpack|dress|jacket|outfit|black|white|blue|red|green|yellow|pink|purple|orange|brown|grey|gray|glasses|sunglasses|watch|bag|car|bike|dog|cat|room|poster|photo|picture)\b/i.test(q) &&
    !is_conversation_sequence &&
    !is_game_stat_query
  ) {
    is_visual_query = true;
  }

  return {
    is_conversation_sequence,
    is_general_chat_query: isGeneralChatQuery,
    is_game_stat_query,
    is_visual_query,
    detected_first_message,
    detected_reply_message,
    detected_kill_filter,
  };
}

/**
 * Intelligent Precise Value Extractor:
 * Pinpoints the exact answer, numerical metric, dialogue bubble, price, error text, OR visual subject attribute
 * that answers the user's specific request.
 */
function extractPreciseValue(query: string, sc: any, fallbackHeadline?: string, matchedTags?: string[]): PreciseValue {
  const ocr = (sc.ocr_text || '').trim();
  const desc = (sc.visual_description || '').trim();
  const keywords = extractSubstantiveKeywords(query);
  const qLower = query.toLowerCase();

  const lines = ocr.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

  // 1. Error Alert / Dialog Extraction
  if (qLower.includes('error') || qLower.includes('fail') || qLower.includes('alert') || qLower.includes('exception')) {
    const errorLine = lines.find((l: string) => /error|failed|constraint|exception|denied|invalid|crash/i.test(l));
    if (errorLine) {
      return {
        headline: errorLine,
        detail: `Error detected on ${sc.original_filename}`,
        badge: 'Error Alert',
      };
    }
  }

  // 2. Price / E-Commerce / Transaction Extraction (only when OCR contains pricing cues)
  if (qLower.includes('price') || qLower.includes('cost') || qLower.includes('how much') || qLower.includes('buy') || qLower.includes('cart') || qLower.includes('order') || (qLower.includes('shirt') && lines.length > 0)) {
    const priceLine = lines.find((l: string) => /[\$₹€£]\s*\d+|price\s*[:\-]?\s*[\d,]+|\b\d+%\s*off\b|mrp/i.test(l));
    if (priceLine) {
      return {
        headline: priceLine,
        detail: `${sc.original_filename} · Product Specs`,
        badge: 'Price Value',
      };
    }
  }

  // 3. Visual Description Priority if query matched visual scene / subjects / colors / attributes
  if (desc.length > 0 && keywords.length > 0) {
    const sentences = desc.split(/(?<=[.?!])\s+/);
    for (const sent of sentences) {
      const sentLower = sent.toLowerCase();
      const hitInSentence = keywords.some(kw => getSynonymsForTerm(kw).some(syn => new RegExp(`\\b${escapeRegExp(syn)}\\b`, 'i').test(sentLower)));
      if (hitInSentence) {
        return {
          headline: sent.trim(),
          detail: matchedTags && matchedTags.length > 0
            ? `Detected: ${matchedTags.join(', ')}`
            : `Visual understanding · ${sc.original_filename}`,
          badge: 'Visual Match',
        };
      }
    }
  }

  // 4. Keyword / Sentence Match in OCR Lines
  if (lines.length > 0 && keywords.length > 0) {
    let bestLine = '';
    let maxMatches = 0;

    for (const line of lines) {
      const lineLower = line.toLowerCase();
      let matches = 0;
      for (const kw of keywords) {
        if (lineLower.includes(kw)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestLine = line;
      }
    }

    if (maxMatches > 0 && bestLine.length > 0) {
      return {
        headline: bestLine,
        detail: `Transcribed text in ${sc.original_filename}`,
        badge: 'OCR Match',
      };
    }
  }

  if (matchedTags && matchedTags.length > 0) {
    return {
      headline: desc ? desc.split(/(?<=[.?!])\s+/)[0] : `Matched: ${matchedTags.join(', ')}`,
      detail: `Detected tags: ${matchedTags.join(', ')}`,
      badge: 'Visual Match',
    };
  }

  return {
    headline: fallbackHeadline || sc.original_filename,
    detail: desc ? desc.substring(0, 90) + '...' : `${sc.category?.toUpperCase() || 'IMAGE'}`,
    badge: sc.category === 'other' ? 'IMAGE' : (sc.category?.toUpperCase() || 'MATCH'),
  };
}

export async function executeHybridSearch(
  userId: string,
  rawQuery: string,
  filters?: SearchFilter,
  userEmail?: string
): Promise<SearchResponse> {
  const query = rawQuery.trim();
  const intent = parseQueryIntent(query);
  const resultsMap = new Map<string, SearchResultItem>();

  // Fetch all screenshots belonging to this user (excluding heavy image_data for speed)
  const getUserScreenshots = db.prepare(`
    SELECT 
      id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
      captured_at, uploaded_at, category, processing_status, processing_error,
      ocr_text, visual_description, text_embedding, tags, created_at, updated_at
    FROM screenshots 
    WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
      AND processing_status != 'queued'
    ORDER BY created_at DESC
  `);
  const userScreenshots = (await getUserScreenshots.all(userId, userEmail || userId)) as any[];

  if (userScreenshots.length === 0) {
    return {
      query,
      parsed_intent: intent,
      total_results: 0,
      results: [],
    };
  }

  // --------------------------------------------------------------------------
  // TRACK 0: EXACT & CUSTOM TITLE MATCH (HIGHEST PRECEDENCE)
  // --------------------------------------------------------------------------
  for (const sc of userScreenshots) {
    const fnCheck = checkFilenameRelevance(sc.original_filename, query, intent.keywords);
    if (fnCheck.isMatch) {
      resultsMap.set(sc.id, {
        screenshot: sc,
        match_score: fnCheck.score,
        match_type: fnCheck.matchType,
        match_explanation: fnCheck.explanation,
        precise_value: {
          headline: sc.original_filename,
          detail: `Matched Screenshot Title · ${sc.category?.toUpperCase() || 'IMAGE'}`,
          badge: 'Title Match',
        },
        matched_tags: [],
        confidence: Math.min(1.0, fnCheck.score),
      });
    }
  }

  // --------------------------------------------------------------------------
  // TRACK A: CONVERSATION RELATIONSHIP SEARCH (FLAGSHIP CAPABILITY)
  // --------------------------------------------------------------------------
  if (intent.is_conversation_sequence && intent.detected_first_message && intent.detected_reply_message) {
    const firstTarget = intent.detected_first_message.toLowerCase();
    const replyTarget = intent.detected_reply_message.toLowerCase();

    // Query all messages for user's chat screenshots
    const getMessages = db.prepare(`
      SELECT * FROM extracted_messages 
      WHERE user_id = ? 
      ORDER BY screenshot_id, sequence_number ASC
    `);
    const allMessages = (await getMessages.all(userId)) as any[];

    // Group messages by screenshot_id
    const messagesByScreenshot = new Map<string, any[]>();
    for (const msg of allMessages) {
      if (!messagesByScreenshot.has(msg.screenshot_id)) {
        messagesByScreenshot.set(msg.screenshot_id, []);
      }
      messagesByScreenshot.get(msg.screenshot_id)!.push(msg);
    }

    for (const [screenshotId, msgs] of messagesByScreenshot.entries()) {
      let firstMsgIdx = -1;
      let replyMsgIdx = -1;

      for (let i = 0; i < msgs.length; i++) {
        const text = msgs[i].message_text.toLowerCase();
        if (firstMsgIdx === -1 && (text.includes(firstTarget) || firstTarget.includes(text))) {
          firstMsgIdx = i;
          continue;
        }
        if (firstMsgIdx !== -1 && (text.includes(replyTarget) || replyTarget.includes(text))) {
          replyMsgIdx = i;
          break; // Found correct chronological sequence
        }
      }

      // STRICT RELATIONAL VERIFICATION:
      // Both messages MUST be in the SAME screenshot, AND reply MUST follow first message
      if (firstMsgIdx !== -1 && replyMsgIdx !== -1 && replyMsgIdx > firstMsgIdx) {
        const m1 = msgs[firstMsgIdx];
        const m2 = msgs[replyMsgIdx];

        const sc = userScreenshots.find(s => s.id === screenshotId);
        if (sc) {
          resultsMap.set(screenshotId, {
            screenshot: sc,
            match_score: 0.98,
            match_type: 'conversation_sequence',
            match_explanation: `Verified same-screenshot conversation sequence: "${m1.message_text}" (Msg #${m1.sequence_number}) followed by reply "${m2.message_text}" (Msg #${m2.sequence_number}).`,
            precise_value: {
              headline: `"${m2.message_text}"`,
              detail: `Replied by ${m2.sender_label || 'Other'} after "${m1.message_text}"`,
              badge: `Reply #${m2.sequence_number}`,
            },
            matched_messages: [m1, m2],
            confidence: Math.min(m1.confidence, m2.confidence),
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK B: STRUCTURED GAME STATS SEARCH (BGMI / PUBG / COD)
  // --------------------------------------------------------------------------
  if (intent.is_game_stat_query && intent.detected_kill_filter) {
    const { operator, value } = intent.detected_kill_filter;

    let sqlOp = '=';
    if (operator === '>') sqlOp = '>';
    else if (operator === '>=') sqlOp = '>=';
    else if (operator === '<') sqlOp = '<';
    else if (operator === '<=') sqlOp = '<=';

    const getMatchingGames = db.prepare(`
      SELECT * FROM game_results 
      WHERE user_id = ? AND kills IS NOT NULL AND kills ${sqlOp} ?
      ORDER BY kills DESC
    `);
    const matchingGames = (await getMatchingGames.all(userId, value)) as any[];

    for (const g of matchingGames) {
      const sc = userScreenshots.find(s => s.id === g.screenshot_id);
      if (sc) {
        resultsMap.set(g.screenshot_id, {
          screenshot: sc,
          match_score: 0.95,
          match_type: 'game_stats',
          match_explanation: `Exact game stat match: ${g.game_name} match with ${g.kills} kills (${sqlOp} ${value} kills filter), Rank: ${g.rank || 'N/A'}, Map: ${g.map_name || 'N/A'}.`,
          precise_value: {
            headline: `${g.kills} Kills · ${g.game_name}`,
            detail: `${g.rank || 'Match Result'} on ${g.map_name || 'Standard'} (Damage: ${g.damage ?? 'N/A'})`,
            badge: `${g.kills} KILLS`,
          },
          matched_game: g,
          confidence: g.extraction_confidence,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK C: DIRECT MESSAGE SEARCH IN CHAT THREADS
  // --------------------------------------------------------------------------
  const keywords = extractSubstantiveKeywords(query);
  if (keywords.length > 0 && !intent.is_conversation_sequence) {
    try {
      const getMsgs = db.prepare(`
        SELECT * FROM extracted_messages 
        WHERE user_id = ? 
        ORDER BY sequence_number ASC
      `);
      const msgs = (await getMsgs.all(userId)) as any[];

      for (const m of msgs) {
        const mTextLower = m.message_text.toLowerCase();
        const matchesAll = keywords.every(kw => mTextLower.includes(kw));
        const matchesAny = keywords.some(kw => mTextLower.includes(kw));

        if (matchesAll || (matchesAny && keywords.length >= 2)) {
          const sc = userScreenshots.find(s => s.id === m.screenshot_id);
          if (sc && !resultsMap.has(m.screenshot_id)) {
            // Precision guard: if user requested a structured game filter, do not add rejected games
            if (intent.is_game_stat_query && intent.detected_kill_filter && sc.category === 'game') {
              continue;
            }

            resultsMap.set(m.screenshot_id, {
              screenshot: sc,
              match_score: matchesAll ? 0.94 : 0.88,
              match_type: 'exact_phrase',
              match_explanation: `Conversation match: "${m.message_text}" from ${m.sender_label || 'Sender'}.`,
              precise_value: {
                headline: `"${m.message_text}"`,
                detail: `Message #${m.sequence_number} from ${m.sender_label || (m.sender_side === 'right' ? 'You' : 'Sender')}`,
                badge: `Chat Bubble`,
              },
              matched_messages: [m],
              confidence: m.confidence,
            });
          }
        }
      }
    } catch {}
  }

  // --------------------------------------------------------------------------
  // TRACK D: VISUAL, TAG & FULL-TEXT HYBRID RETRIEVAL (WORD-BOUNDARY & SYNONYM AWARE)
  // --------------------------------------------------------------------------
  const cleanFtsQuery = query.replace(/[^\w\s]/g, ' ').trim();
  const ftsTerms = keywords.length > 0 ? keywords : cleanFtsQuery.split(/\s+/).filter(Boolean);
  const effectiveKeywords = ftsTerms;

  if (ftsTerms.length > 0) {
    try {
      const ftsExpr = ftsTerms.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
      const ftsMatches = (await db.prepare(`
        SELECT screenshot_id
        FROM screenshots_fts 
        WHERE user_id = ? AND screenshots_fts MATCH ?
      `).all(userId, ftsExpr)) as any[];

      for (const m of ftsMatches) {
        if (!resultsMap.has(m.screenshot_id)) {
          const sc = userScreenshots.find(s => s.id === m.screenshot_id);
          if (!sc) continue;

          if (intent.is_game_stat_query && intent.detected_kill_filter && sc.category === 'game') {
            continue;
          }
          if (intent.is_conversation_sequence && intent.detected_first_message && intent.detected_reply_message && sc.category === 'chat') {
            continue;
          }

          const scored = scoreVisualAndTextMatch(effectiveKeywords, query, sc);
          const finalScore = scored.score > 0 ? scored.score : 0.78;
          const matchedTags = scored.matchedTags;
          const preciseVal = extractPreciseValue(query, sc, `Contains "${query}"`, matchedTags);
          const hitRatio = `${scored.matchedKeywords.length || 1}/${effectiveKeywords.length}`;

          resultsMap.set(m.screenshot_id, {
            screenshot: sc,
            match_score: finalScore,
            match_type: scored.isExactVisualHit || finalScore >= 0.88 ? 'exact_phrase' : 'text_keyword',
            match_explanation: scored.isExactVisualHit
              ? `Visual match (${hitRatio} concepts)${matchedTags.length > 0 ? `: ${matchedTags.join(', ')}` : ''}.`
              : `Matched ${hitRatio} terms for "${query}".`,
            precise_value: preciseVal,
            matched_tags: matchedTags,
            confidence: Math.min(0.96, finalScore + 0.02),
          });
        }
      }
    } catch {
      // Fall through to in-memory precision scan below
    }
  }

  // Unified in-memory visual/tag/OCR scan (catches synonyms, multi-term coverage, and SQLite fallback)
  if (effectiveKeywords.length > 0) {
    for (const sc of userScreenshots) {
      if (resultsMap.has(sc.id)) continue;

      if (intent.is_game_stat_query && intent.detected_kill_filter && sc.category === 'game') {
        continue;
      }
      if (intent.is_conversation_sequence && intent.detected_first_message && intent.detected_reply_message && sc.category === 'chat') {
        continue;
      }

      const scored = scoreVisualAndTextMatch(effectiveKeywords, query, sc);
      if (scored.score > 0) {
        const preciseVal = extractPreciseValue(query, sc, undefined, scored.matchedTags);
        const hitRatio = `${scored.matchedKeywords.length}/${effectiveKeywords.length}`;
        resultsMap.set(sc.id, {
          screenshot: sc,
          match_score: scored.score,
          match_type: scored.isExactVisualHit && scored.score >= 0.85 ? 'exact_phrase' : 'text_keyword',
          match_explanation: scored.isExactVisualHit
            ? `Visual match (${hitRatio} concepts)${scored.matchedTags.length > 0 ? `: ${scored.matchedTags.join(', ')}` : ''}.`
            : `Keyword match: found ${hitRatio} relevant terms in content.`,
          precise_value: preciseVal,
          matched_tags: scored.matchedTags,
          confidence: Math.min(0.95, scored.score),
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK E: SEMANTIC & VISUAL VECTOR EMBEDDING RETRIEVAL
  // --------------------------------------------------------------------------
  try {
    const queryEmbedding = await generateTextEmbedding(query);

    for (const sc of userScreenshots) {
      if (resultsMap.has(sc.id)) continue; // Already matched with higher exact/relational priority

      // Precision guard
      if (intent.is_game_stat_query && intent.detected_kill_filter && sc.category === 'game') {
        continue;
      }
      if (intent.is_conversation_sequence && intent.detected_first_message && intent.detected_reply_message && sc.category === 'chat') {
        continue;
      }

      let docEmbedding: number[] = [];
      if (sc.text_embedding) {
        try {
          docEmbedding = JSON.parse(sc.text_embedding);
        } catch {}
      }

      const similarity = computeCosineSimilarity(queryEmbedding, docEmbedding);

      // Check if semantic similarity passes relevance threshold
      if (similarity > 0.45) {
        const preciseVal = extractPreciseValue(query, sc);
        resultsMap.set(sc.id, {
          screenshot: sc,
          match_score: similarity,
          match_type: 'semantic_visual',
          match_explanation: `Semantic & visual relevance (${Math.round(similarity * 100)}% match): relates conceptually to "${query}".`,
          precise_value: preciseVal,
          confidence: Math.round(similarity * 100) / 100,
        });
      }
    }
  } catch (err) {
    console.warn('Semantic embedding retrieval warning:', err);
  }

  // Convert map to array and sort: exact/custom title matches ALWAYS come first, then by match_score descending
  let rankedResults = Array.from(resultsMap.values()).sort((a, b) => {
    const aFn = checkFilenameRelevance(a.screenshot.original_filename, query, intent.keywords);
    const bFn = checkFilenameRelevance(b.screenshot.original_filename, query, intent.keywords);
    if (aFn.isMatch && !bFn.isMatch) return -1;
    if (!aFn.isMatch && bFn.isMatch) return 1;
    if (aFn.isMatch && bFn.isMatch && aFn.score !== bFn.score) return bFn.score - aFn.score;
    return b.match_score - a.match_score;
  });

  // Apply optional category filters
  if (filters?.category && filters.category !== 'all') {
    rankedResults = rankedResults.filter(r => r.screenshot.category === filters.category);
  }

  return {
    query,
    parsed_intent: intent,
    total_results: rankedResults.length,
    results: rankedResults,
  };
}
