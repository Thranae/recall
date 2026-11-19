import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  Trophy,
  ShoppingBag,
  FileText,
  Layers,
  Code2,
  Utensils,
  PawPrint,
  Palette,
  Mountain,
  User,
  Receipt,
  Ticket,
} from 'lucide-react';
import type { Screenshot } from '../types';

export type PreciseCategory =
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
  | 'other';

export interface CategoryMeta {
  label: string;
  badgeText: string;
  icon: LucideIcon;
  accentColor: string;
}

export function getPreciseCategoryMeta(category: string): CategoryMeta {
  switch (category) {
    case 'chat':
      return { label: 'Chat', badgeText: 'Chat', icon: MessageSquare, accentColor: '#3478F6' };
    case 'code_dev':
      return { label: 'Code & Dev', badgeText: 'Code', icon: Code2, accentColor: '#6366F1' };
    case 'game':
      return { label: 'Game Stats', badgeText: 'Game', icon: Trophy, accentColor: '#F59E0B' };
    case 'food_dining':
      return { label: 'Food & Dining', badgeText: 'Food', icon: Utensils, accentColor: '#EC4899' };
    case 'animals_pets':
      return { label: 'Animals & Pets', badgeText: 'Pets', icon: PawPrint, accentColor: '#10B981' };
    case 'wallpaper_art':
      return { label: 'Art & Wallpaper', badgeText: 'Art', icon: Palette, accentColor: '#8B5CF6' };
    case 'nature_scenery':
      return { label: 'Nature & Scenery', badgeText: 'Nature', icon: Mountain, accentColor: '#059669' };
    case 'portrait_people':
      return { label: 'People & Portrait', badgeText: 'People', icon: User, accentColor: '#0EA5E9' };
    case 'receipt_finance':
      return { label: 'Finance & Bills', badgeText: 'Finance', icon: Receipt, accentColor: '#14B8A6' };
    case 'ticket_travel':
      return { label: 'Travel & Tickets', badgeText: 'Travel', icon: Ticket, accentColor: '#F97316' };
    case 'product_shopping':
    case 'product':
      return { label: 'Product & Shop', badgeText: 'Product', icon: ShoppingBag, accentColor: '#E11D48' };
    case 'poster_document':
      return { label: 'Document & Notes', badgeText: 'Document', icon: FileText, accentColor: '#475569' };
    default:
      return { label: 'Visual', badgeText: 'Visual', icon: Layers, accentColor: '#3478F6' };
  }
}

export function classifyScreenshotPrecisely(s: Screenshot): PreciseCategory {
  // If the screenshot already has a precise category set, return it
  const knownPrecise = new Set([
    'code_dev',
    'food_dining',
    'nature_scenery',
    'wallpaper_art',
    'portrait_people',
    'animals_pets',
    'receipt_finance',
    'ticket_travel',
    'product_shopping',
  ]);
  if (knownPrecise.has(s.category)) {
    return s.category as PreciseCategory;
  }

  const ocr = (s.ocr_text || '').toLowerCase();
  const visual = (s.visual_description || '').toLowerCase();

  let tagsArr: string[] = [];
  if (Array.isArray(s.tags)) {
    tagsArr = s.tags.map((t) => String(t).toLowerCase());
  } else if (typeof s.tags === 'string') {
    try {
      const parsed = JSON.parse(s.tags);
      if (Array.isArray(parsed)) tagsArr = parsed.map((t) => String(t).toLowerCase());
    } catch {
      tagsArr = (s.tags as string).toLowerCase().split(/[\s,]+/);
    }
  }

  // 1. Coding, Tech & System Errors (Google OAuth error, Java code, terminal, syntax, dev tools)
  const isCodeOrDev =
    /(?:class\s+\w+|public\s+static|import\s+java|for\s*\(\s*int\s+\w+|return\s+\w+;|int\s+\w+\s*=|ciphertext|decryption|scanner\s+scn)/i.test(ocr) ||
    /(?:authorisation\s+error|access\s+blocked|oauth\s*2\.0|google's\s+oauth|developer\s+console|error\s+details|not\s+comply\s+with\s+google|client_id|redirect_uri)/i.test(ocr) ||
    /(?:console\.log|function\s*\(|def\s+\w+\(|<div|select\s+.*from|git\s+commit|exception\b|syntaxerror|stack\s*trace|terminal|bash|powershell|npm\s+|yarn\s+)/i.test(ocr) ||
    /\b(?:code|programming|source code|developer error|oauth error|stack trace|terminal output|system error|compiler)\b/i.test(visual) ||
    tagsArr.some((t) => ['code', 'programming', 'developer', 'oauth', 'error', 'java', 'python', 'javascript', 'terminal'].includes(t));

  if (isCodeOrDev) return 'code_dev';

  // 2. Chat & Messaging Conversations (WhatsApp, Telegram, iMessage, Instagram DMs, Discord, SMS)
  const isChat =
    s.category === 'chat' ||
    /\b(?:chat|imessage|whatsapp|telegram|discord|dm|conversation thread|messaging app|chat bubble)\b/i.test(visual) ||
    tagsArr.some((t) => ['chat', 'conversation', 'messaging', 'whatsapp', 'imessage', 'telegram', 'dm', 'discord'].includes(t)) ||
    /(?:type a message|online\s*•|last seen|delivered|double tick|✓✓|replying to|audio call|video call)/i.test(ocr);

  if (isChat) return 'chat';

  // 3. Gaming & High Scores (BGMI, PUBG, victory screen, kill counts)
  const isGame =
    s.category === 'game' ||
    /\b(?:game|scoreboard|gameplay|bgmi|pubg|victory royale|clutch|eliminations)\b/i.test(visual) ||
    tagsArr.some((t) => ['game', 'gaming', 'bgmi', 'pubg', 'victory', 'kills', 'scoreboard'].includes(t)) ||
    /(?:winner winner chicken dinner|chicken dinner|victory royale|kills?\s*:\s*\d+|\b\d+\s*kills\b|booyah)/i.test(ocr);

  if (isGame) return 'game';

  // 4. Food, Dining & Cafes (Croissant, Coffee, Cafe interior, Third Wave Coffee, restaurant meals)
  const isFood =
    tagsArr.some((t) =>
      ['croissant', 'pastry', 'coffee', 'iced coffee', 'cafe', 'restaurant', 'bakery', 'dessert', 'breakfast', 'meal', 'dish', 'food', 'beverage', 'snack', 'dining', 'culinary', 'pizza', 'burger', 'biryani'].includes(t)
    ) ||
    /\b(?:croissant|pastry|coffee|cafe|bakery|restaurant|dining|freshly baked|breakfast|lunch|dinner|meal|beverage|iced coffee|cappuccino|latte)\b/i.test(visual) ||
    /(?:third wave coffee|starbucks|coffee shop|iced coffee|croissant|cappuccino|latte|zomato|swiggy|restaurant|dining|breakfast|lunch|dinner)/i.test(ocr);

  if (isFood) return 'food_dining';

  // 5. Animals & Pets (Betta fish, aquarium, pets, wildlife)
  const isAnimal =
    tagsArr.some((t) =>
      ['fish', 'betta', 'betta fish', 'aquarium', 'tank', 'pet', 'pets', 'animal', 'animals', 'dog', 'puppy', 'cat', 'kitten', 'bird', 'wildlife'].includes(t)
    ) ||
    /\b(?:fish|betta|aquarium|fish tank|pet|pets|animal|animals|dog|puppy|cat|kitten|bird|wildlife)\b/i.test(visual);

  if (isAnimal) return 'animals_pets';

  // 6. Wallpapers, Art & Graphic Themes (Spider-Man, TOMBAT logo, digital art, superhero)
  const isWallpaperArt =
    tagsArr.some((t) =>
      ['spider-man', 'spiderman', 'wallpaper', 'digital art', 'artwork', 'superhero', 'tombat', 'logo', 'graphics', 'illustration', 'comics', 'marvel'].includes(t)
    ) ||
    /\b(?:wallpaper|digital artwork|digital art|superhero|spider-man|title card|comic|artwork|poster graphics)\b/i.test(visual);

  if (isWallpaperArt) return 'wallpaper_art';

  // 7. Nature, Skies & Landscapes (Night sky, moon, clouds, sunset)
  const isNature =
    tagsArr.some((t) =>
      ['sky', 'clouds', 'moon', 'night sky', 'moonlight', 'astrophotography', 'nature', 'landscape', 'sunset', 'sunrise', 'stars', 'ocean', 'mountain'].includes(t)
    ) ||
    /\b(?:night sky|sky filled with|moonlight|clouds at night|outdoor night scene|mountain|ocean|landscape|sunset|sunrise)\b/i.test(visual);

  if (isNature) return 'nature_scenery';

  // 8. People & Portraits (Simon Baker / Patrick Jane, silhouette, selfies)
  const isPortraitPeople =
    tagsArr.some((t) =>
      ['portrait', 'young man', 'young woman', 'boy', 'girl', 'man', 'woman', 'male', 'female', 'guy', 'lady', 'person', 'people', 'selfie', 'actor', 'simon baker', 'patrick jane'].includes(t)
    ) ||
    /\b(?:portrait of|close-up portrait|young man|young woman|smiling boy|smiling girl|selfie|silhouette of a person)\b/i.test(visual);

  if (isPortraitPeople) return 'portrait_people';

  // 9. Receipts & Expenses (Invoices, bills, totals)
  const isReceipt =
    tagsArr.some((t) => ['receipt', 'bill', 'invoice', 'expense', 'payment'].includes(t)) ||
    /(?:total amount|invoice #|receipt #|gstin|subtotal|amount paid|tax invoice|paid via|order total|billing address)/i.test(ocr);

  if (isReceipt) return 'receipt_finance';

  // 10. Tickets & Travel Passes (Boarding pass, flight, train)
  const isTicket =
    tagsArr.some((t) => ['ticket', 'boarding', 'flight', 'travel', 'pass'].includes(t)) ||
    /(?:boarding pass|flight no|gate \w+|seat \w+|pnr\b|e-ticket|train ticket|boarding time)/i.test(ocr);

  if (isTicket) return 'ticket_travel';

  // 11. Shopping & Products (E-commerce, carts, prices)
  const isProduct =
    s.category === 'product' ||
    tagsArr.some((t) => ['product', 'shopping', 'shoes', 'gadget', 'clothing'].includes(t)) ||
    /(?:add to cart|buy now|in stock|mrp\s*₹?|price\s*[:₹$]|flipkart|amazon|myntra)/i.test(ocr);

  if (isProduct) return 'product_shopping';

  // 12. Documents & Notes (PDFs, study notes, book pages, certificates)
  const isDocument =
    s.category === 'poster_document' ||
    tagsArr.some((t) => ['document', 'notes', 'study', 'pdf', 'certificate'].includes(t)) ||
    /(?:certificate|resume|agreement|curriculum|syllabus|chapter|lecture|assignment|contract)/i.test(ocr);

  if (isDocument) return 'poster_document';

  return (s.category as PreciseCategory) || 'other';
}
