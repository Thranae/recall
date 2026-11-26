export type SubscriptionTier = 'free' | 'basic' | 'pro';
export type SubscriptionPlan = 'free' | 'basic_monthly' | 'basic_annual' | 'pro_monthly' | 'pro_annual';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  google_id?: string;
  is_verified?: number | boolean;
  subscription_tier?: SubscriptionTier;
  subscription_status?: 'active' | 'trialing' | 'canceled' | 'past_due';
  subscription_plan?: SubscriptionPlan;
  subscription_expires_at?: string;
  trial_ends_at?: string;
  autopay_mandate_id?: string;
  autopay_method?: string;
  autopay_vpa?: string;
  next_billing_at?: string;
  ai_queries_today?: number;
}

export interface SubscriptionInvoice {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  payment_method: string;
  invoice_date: string;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  currency: string;
  currency_symbol: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  is_trialing: boolean;
  days_left_in_trial: number;
  next_billing_at: string | null;
  autopay_mandate_id: string | null;
  autopay_method: string | null;
  autopay_vpa: string | null;
  screenshot_count: number;
  screenshot_limit: number | null;
  can_upload: boolean;
  ai_queries_today: number;
  ai_queries_limit: number | null;
  is_basic?: boolean;
  is_pro: boolean;
  perks: string[];
  invoices?: SubscriptionInvoice[];
}

export interface SubscriptionPlanDetail {
  id: SubscriptionPlan;
  name: string;
  tier: SubscriptionTier;
  price: number;
  interval: 'month' | 'year' | 'forever';
  price_display: string;
  badge?: string;
  monthly_equivalent?: string;
  trial_days?: number;
  trial_text?: string;
  recurring_text?: string;
  description: string;
  screenshot_limit: number | null;
  ai_daily_limit: number | null;
  perks: string[];
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

export type ScreenshotCategory =
  | 'chat'
  | 'code_dev'
  | 'food_dining'
  | 'nature_scenery'
  | 'wallpaper_art'
  | 'portrait_people'
  | 'animals_pets'
  | 'receipt_finance'
  | 'ticket_travel'
  | 'product_shopping'
  | 'poster_document'
  | 'game'
  | 'product'
  | 'other'
  | 'unprocessed'
  | string;

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
  category: ScreenshotCategory;
  processing_status: 'queued' | 'processing' | 'ready' | 'needs_review' | 'failed';
  processing_error?: string;
  ocr_text?: string;
  visual_description?: string;
  tags?: string[];
  game_result?: GameResult | null;
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
  match_type: 'exact_filename' | 'conversation_sequence' | 'game_stats' | 'exact_phrase' | 'semantic_visual' | 'text_keyword';
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

export interface ScreenshotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  provider?: string;
  isError?: boolean;
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

export interface ThreadGroup {
  threadId: string;
  title: string;
  screenshotIds: string[];
  screenshots: Screenshot[];
  messageCount: number;
  startedAt: string;
  lastAt: string;
}

export interface DigestDiscountItem {
  id: string;
  screenshotId: string;
  code: string;
  brand: string;
  discountText: string;
  expiryHint?: string;
  urgency: 'urgent' | 'active' | 'expired';
  originalFilename: string;
}

export interface DigestEventItem {
  id: string;
  screenshotId: string;
  title: string;
  dateStr: string;
  location?: string;
  bookingRef?: string;
  isUpcoming: boolean;
  originalFilename: string;
}

export interface DigestBillItem {
  id: string;
  screenshotId: string;
  biller: string;
  amount: string;
  dueDate?: string;
  isPending: boolean;
  originalFilename: string;
}

export interface VaultDigestResponse {
  discounts: DigestDiscountItem[];
  events: DigestEventItem[];
  bills: DigestBillItem[];
  total_insights: number;
}

export interface ClutterCandidate {
  id: string;
  screenshotId: string;
  screenshot: Screenshot;
  category: 'otp' | 'past_event' | 'temp_receipt' | 'low_utility';
  title: string;
  reason: string;
  snippet: string;
  ageDays: number;
  confidence: number;
}

export interface LiveInspectorNode {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  kind: 'otp' | 'phone' | 'email' | 'url' | 'calendar' | 'upi' | 'discount' | 'money' | 'game' | 'code' | 'formula' | 'entity';
  label: string;
  detail: string;
  actionText: string;
  value: string;
  href?: string;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  category?: 'thread' | 'chat' | 'game' | 'receipt' | 'ticket' | 'product' | 'visual' | 'tag' | 'custom';
  coverScreenshotId?: string;
  screenshotIds: string[];
  createdAt: string;
  updatedAt?: string;
  isSmart?: boolean;
  accentColor?: string;
  emoji?: string;
  badge?: string;
  isLocked?: boolean;
  pinHash?: string;
}

