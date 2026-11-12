export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  google_id?: string;
  is_verified?: number | boolean;
}

export interface ExtractedMessage {
  id: string;
  screenshot_id: string;
  sequence_number: number;
  message_text: string;
  sender_side: 'left' | 'right' | 'unknown';
  sender_label: string | null;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

export interface GameResult {
  id: string;
  screenshot_id: string;
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

export interface Screenshot {
  id: string;
  user_id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  width?: number;
  height?: number;
  file_size: number;
  captured_at?: string;
  uploaded_at: string;
  category: 'chat' | 'game' | 'product' | 'poster_document' | 'other';
  processing_status: 'queued' | 'processing' | 'ready' | 'needs_review' | 'failed';
  processing_error?: string;
  ocr_text?: string;
  visual_description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface PreciseValue {
  headline: string;
  detail: string;
  badge?: string;
}

export interface SearchResultItem {
  screenshot: Screenshot;
  match_score: number;
  match_type: 'conversation_sequence' | 'game_stats' | 'exact_phrase' | 'semantic_visual' | 'text_keyword';
  match_explanation: string;
  precise_value?: PreciseValue;
  matched_tags?: string[];
  matched_messages?: ExtractedMessage[];
  matched_game?: GameResult;
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

export interface VaultAnswer {
  answer: string;
  cited_ids: string[];
  provider: string;
}

export interface VaultAskResponse extends SearchResponse {
  ai_answer: VaultAnswer;
}

export interface ImageQuestionResponse {
  screenshot_id: string;
  question: string;
  answer: string;
  provider: string;
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

export interface AiRedactResponse {
  screenshot_id: string;
  instruction: string;
  targets: AiRedactTarget[];
  summary: string;
  provider: string;
}

export interface BatchReanalyzeResponse {
  total: number;
  upgraded: number;
  failed: number;
  message: string;
}

export interface SimilarMemoryItem {
  screenshot: Screenshot;
  similarity: number;
  shared_tags: string[];
  is_duplicate: boolean;
}

export interface SmartCoachResponse {
  screenshot_id?: string;
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

export interface VaultInsightsSummary {
  total: number;
  category_counts: Record<string, number>;
  gaming: {
    matches: number;
    total_kills: number;
    best_kills: number;
    chicken_dinners: number;
  };
  top_colors: Array<{ color: string; count: number }>;
  duplicate_groups: Array<{
    keep: { id: string; original_filename: string; file_size: number; uploaded_at: string };
    duplicates: Array<{ id: string; original_filename: string; file_size: number; uploaded_at: string; reason: string }>;
  }>;
  duplicate_count: number;
}

