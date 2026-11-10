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

