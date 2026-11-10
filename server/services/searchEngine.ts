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

export interface SearchResultItem {
  screenshot: any;
  match_score: number;
  match_type: 'conversation_sequence' | 'game_stats' | 'exact_phrase' | 'semantic_visual' | 'text_keyword';
  match_explanation: string;
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
  // Pattern 1: ... said "X" and she replied "Y"
  const quotedSeqMatch = q.match(/["']([^"']+)["']\s*(?:and\s+)?(?:she|he|they|other)?\s*(?:replied|said|sent|answered)\s*["']([^"']+)["']/i);
  if (quotedSeqMatch) {
    is_conversation_sequence = true;
    detected_first_message = quotedSeqMatch[1].trim();
    detected_reply_message = quotedSeqMatch[2].trim();
  }

  // Pattern 2: ... said X and she replied Y (unquoted)
  if (!is_conversation_sequence) {
    const unquotedSeqMatch = q.match(/(?:i said|where i said|i told her)\s+([^,]+?)\s+(?:and\s+)?(?:she|he|they)\s+(?:replied|said|answered)\s+([^,\.\?]+)/i);
    if (unquotedSeqMatch) {
      is_conversation_sequence = true;
      detected_first_message = unquotedSeqMatch[1].replace(/["']/g, '').trim();
      detected_reply_message = unquotedSeqMatch[2].replace(/["']/g, '').trim();
    }
  }

  // Pattern 3: general conversation queries
  const isGeneralChatQuery =
    lower.includes('conversation') ||
    lower.includes('chat') ||
    lower.includes('where i told her') ||
    lower.includes('where she said') ||
    lower.includes('we discussed');

  // 2. Detect Game Stat Queries
  // Examples: "BGMI match where I got 18 kills", "more than 15 kills", "kills > 15", "at least 10 kills"
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
      // e.g. "18 kills"
      const val = parseInt(killComparisonMatch[1] || killComparisonMatch[2], 10);
      if (!isNaN(val)) {
        detected_kill_filter = { operator: '=', value: val };
      }
    }
  }

  if (lower.includes('bgmi') || lower.includes('pubg') || lower.includes('chicken dinner') || lower.includes('winner winner')) {
    is_game_stat_query = true;
  }

  // 3. Detect Visual Object Queries
  if (
    /(shirt|sneakers|shoes|backpack|dress|jacket|outfit|coffee shop|watch|bag|car|room|poster|photo of|picture of)/i.test(q) &&
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

export async function executeHybridSearch(userId: string, rawQuery: string, filters?: SearchFilter): Promise<SearchResponse> {
  const query = rawQuery.trim();
  const intent = parseQueryIntent(query);
  const resultsMap = new Map<string, SearchResultItem>();

  // Fetch all screenshots belonging to this user (excluding image_data to prevent high memory usage)
  const getUserScreenshots = db.prepare(`
    SELECT 
      id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
      captured_at, uploaded_at, category, processing_status, processing_error,
      ocr_text, visual_description, text_embedding, tags, created_at, updated_at
    FROM screenshots 
    WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = (SELECT email FROM users WHERE id = ?) AND email IS NOT NULL AND email != '')))
      AND processing_status != 'queued'
    ORDER BY created_at DESC
  `);
  const userScreenshots = getUserScreenshots.all(userId, userId) as any[];

  if (userScreenshots.length === 0) {
    return {
      query,
      parsed_intent: intent,
      total_results: 0,
      results: [],
    };
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
    const allMessages = getMessages.all(userId) as any[];

    // Group messages by screenshot_id
    const messagesByScreenshot = new Map<string, any[]>();
    for (const msg of allMessages) {
      if (!messagesByScreenshot.has(msg.screenshot_id)) {
        messagesByScreenshot.set(msg.screenshot_id, []);
      }
      messagesByScreenshot.get(msg.screenshot_id)!.push(msg);
    }

    for (const [screenshotId, msgs] of messagesByScreenshot.entries()) {
      // Find index of first message matching firstTarget
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
            matched_messages: [m1, m2],
            confidence: Math.min(m1.confidence, m2.confidence),
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK B: STRUCTURED GAME STATS SEARCH (BGMI / PUBG)
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
    const matchingGames = getMatchingGames.all(userId, value) as any[];

    for (const g of matchingGames) {
      const sc = userScreenshots.find(s => s.id === g.screenshot_id);
      if (sc) {
        resultsMap.set(g.screenshot_id, {
          screenshot: sc,
          match_score: 0.95,
          match_type: 'game_stats',
          match_explanation: `Exact game stat match: ${g.game_name} match with ${g.kills} kills (${sqlOp} ${value} kills filter), Rank: ${g.rank || 'N/A'}, Map: ${g.map_name || 'N/A'}.`,
          matched_game: g,
          confidence: g.extraction_confidence,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK C: EXACT PHRASE & FTS5 FULL-TEXT RETRIEVAL
  // --------------------------------------------------------------------------
  const cleanFtsQuery = query.replace(/[^\w\s]/g, ' ').trim();
  if (cleanFtsQuery.length > 0) {
    try {
      // Use FTS5 match query
      const ftsMatches = db.prepare(`
        SELECT screenshot_id, ocr_text, visual_description, category
        FROM screenshots_fts 
        WHERE user_id = ? AND screenshots_fts MATCH ?
      `).all(userId, cleanFtsQuery) as any[];

      for (const m of ftsMatches) {
        if (!resultsMap.has(m.screenshot_id)) {
          const sc = userScreenshots.find(s => s.id === m.screenshot_id);
          if (sc) {
            resultsMap.set(m.screenshot_id, {
              screenshot: sc,
              match_score: 0.85,
              match_type: 'exact_phrase',
              match_explanation: `Text match found in OCR content: contains keywords "${query}".`,
              confidence: 0.88,
            });
          }
        }
      }
    } catch {
      // Fallback to LIKE substring match if FTS syntax error
      for (const sc of userScreenshots) {
        if (!resultsMap.has(sc.id)) {
          const ocr = (sc.ocr_text || '').toLowerCase();
          const desc = (sc.visual_description || '').toLowerCase();
          const qLower = query.toLowerCase();

          if (ocr.includes(qLower) || desc.includes(qLower)) {
            resultsMap.set(sc.id, {
              screenshot: sc,
              match_score: 0.82,
              match_type: 'exact_phrase',
              match_explanation: `Direct text match: screenshot text contains "${query}".`,
              confidence: 0.85,
            });
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // TRACK D: SEMANTIC & VISUAL VECTOR EMBEDDING RETRIEVAL
  // --------------------------------------------------------------------------
  try {
    const queryEmbedding = await generateTextEmbedding(query);

    for (const sc of userScreenshots) {
      if (resultsMap.has(sc.id)) continue; // Already matched with higher exact/relational priority

      let docEmbedding: number[] = [];
      if (sc.text_embedding) {
        try {
          docEmbedding = JSON.parse(sc.text_embedding);
        } catch {}
      }

      const similarity = computeCosineSimilarity(queryEmbedding, docEmbedding);

      // Check if semantic similarity passes relevance threshold
      if (similarity > 0.45) {
        resultsMap.set(sc.id, {
          screenshot: sc,
          match_score: similarity,
          match_type: 'semantic_visual',
          match_explanation: `Semantic & visual relevance (${Math.round(similarity * 100)}% match): relates conceptually to "${query}".`,
          confidence: Math.round(similarity * 100) / 100,
        });
      }
    }
  } catch (err) {
    console.warn('Semantic embedding retrieval warning:', err);
  }

  // Convert map to array and sort by match_score descending
  let rankedResults = Array.from(resultsMap.values()).sort((a, b) => b.match_score - a.match_score);

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

