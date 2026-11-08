import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateTextEmbedding } from '../services/ai/embeddings';

const router = Router();
const UPLOADS_BASE = path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads');

// Generate an SVG image file on disk representing the screenshot
function generateMockImageFile(filePath: string, title: string, subtitle: string, bgColor: string, accentColor: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="#090D1A"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <rect width="720" height="960" fill="url(#bg)"/>
  
  <!-- Status bar -->
  <rect x="0" y="0" width="720" height="44" fill="rgba(0,0,0,0.3)"/>
  <text x="32" y="28" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="600" fill="#FFFFFF">9:41</text>
  <text x="640" y="28" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">5G 100%</text>

  <!-- Mock Header -->
  <rect x="24" y="60" width="672" height="60" rx="12" fill="rgba(255,255,255,0.06)"/>
  <circle cx="56" cy="90" r="18" fill="${accentColor}" opacity="0.8"/>
  <text x="90" y="96" font-family="-apple-system, system-ui, sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">${title}</text>

  <!-- Body Content Card -->
  <rect x="24" y="140" width="672" height="780" rx="16" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="50" y="220" font-family="-apple-system, system-ui, sans-serif" font-size="22" font-weight="600" fill="#FEF08A">${subtitle}</text>
  
  <!-- Decorative Grid / Interface lines -->
  <line x1="50" y1="260" x2="670" y2="260" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <rect x="50" y="290" width="400" height="40" rx="8" fill="rgba(255,255,255,0.04)"/>
  <rect x="50" y="350" width="550" height="120" rx="8" fill="rgba(255,255,255,0.04)"/>
  <rect x="50" y="490" width="500" height="60" rx="8" fill="rgba(255,255,255,0.04)"/>
</svg>`;

  fs.writeFileSync(filePath, svg, 'utf8');
}

// POST /api/test-data/seed - Load PRD Acceptance Criteria Benchmark Dataset
router.post('/seed', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userDir = path.join(UPLOADS_BASE, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    // 1. Clean previous seeded screenshots for this user
    const getOld = db.prepare('SELECT id, storage_key FROM screenshots WHERE user_id = ? AND original_filename LIKE "TEST_%"').all(userId) as any[];
    for (const old of getOld) {
      try {
        fs.unlinkSync(path.join(UPLOADS_BASE, old.storage_key));
      } catch {}
      db.prepare('DELETE FROM screenshots WHERE id = ?').run(old.id);
    }

    const seededItems = [];

    // ========================================================================
    // DATASET 1: CONVERSATION BENCHMARK (PRD SECTION 12)
    // ========================================================================

    // Case 1: Both target messages in CORRECT ORDER ("I love you" -> "I love you too")
    {
      const id = `sc_test_chat_correct_${Date.now()}`;
      const filename = 'TEST_chat_correct_order.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'Chat • Elena', 'Conversation with Elena • Ordered Match', '#1E1B4B', '#818CF8');

      const ocr = `Elena\nActive now\nI was thinking about you today\nI love you\nI love you too\nSee you tomorrow at 7!`;
      const desc = 'WhatsApp chat screenshot showing an intimate evening conversation with Elena. Messages sent back and forth.';
      const tags = ['chat', 'conversation', 'elena', 'love', 'whatsapp'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3200, new Date().toISOString(), 'chat', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      // Messages in order
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_c1_1`, id, userId, 1, 'I was thinking about you today', 'right', 'You', 0.95);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_c1_2`, id, userId, 2, 'I love you', 'right', 'You', 0.98);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_c1_3`, id, userId, 3, 'I love you too', 'left', 'Elena', 0.98);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_c1_4`, id, userId, 4, 'See you tomorrow at 7!', 'left', 'Elena', 0.94);

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'chat');
      seededItems.push(filename);
    }

    // Case 2: Only the first message ("I love you" alone)
    {
      const id = `sc_test_chat_only_first_${Date.now()}`;
      const filename = 'TEST_chat_only_first.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'Chat • Sarah', 'Sarah • Unanswered Sent Message', '#312E81', '#A78BFA');

      const ocr = `Sarah\nHey Sarah\nI love you\nDelivered`;
      const desc = 'Outgoing chat message to Sarah saying I love you without any reply.';
      const tags = ['chat', 'sarah', 'outgoing'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3100, new Date().toISOString(), 'chat', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_f1_1`, id, userId, 1, 'Hey Sarah', 'right', 'You', 0.95);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_f1_2`, id, userId, 2, 'I love you', 'right', 'You', 0.96);

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'chat');
      seededItems.push(filename);
    }

    // Case 3: Both messages in REVERSE order ("I love you too" -> "I love you")
    {
      const id = `sc_test_chat_reverse_${Date.now()}`;
      const filename = 'TEST_chat_reverse_order.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'Chat • Maya', 'Maya • Reverse Sequence Test', '#1E293B', '#38BDF8');

      const ocr = `Maya\nI love you too\nWait really?\nYes, I love you`;
      const desc = 'Chat conversation where Maya says I love you too first, followed later by I love you.';
      const tags = ['chat', 'maya', 'reverse'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3150, new Date().toISOString(), 'chat', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_r1_1`, id, userId, 1, 'I love you too', 'left', 'Maya', 0.95);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_r1_2`, id, userId, 2, 'Wait really?', 'right', 'You', 0.94);
      db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_r1_3`, id, userId, 3, 'Yes, I love you', 'right', 'You', 0.97);

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'chat');
      seededItems.push(filename);
    }

    // ========================================================================
    // DATASET 2: GAME STATS BENCHMARK (BGMI / PUBG)
    // ========================================================================

    // Game 1: 18 Kills, #1 Winner Winner Chicken Dinner on Erangel
    {
      const id = `sc_test_bgmi_18kills_${Date.now()}`;
      const filename = 'TEST_bgmi_18kills_wwcd.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'BGMI • Match Result', '#1 Winner Winner Chicken Dinner • 18 Kills', '#78350F', '#F59E0B');

      const ocr = `BATTLEGROUNDS MOBILE INDIA\nWINNER WINNER CHICKEN DINNER\nRank #1/100\nKills: 18\nDamage: 2450\nRating: +42 (Ace Dominator)\nMap: Erangel - Classic`;
      const desc = 'BGMI victory screen showing Rank #1 Winner Winner Chicken Dinner with 18 kills and 2450 damage on Erangel.';
      const tags = ['bgmi', 'pubg', 'erangel', 'wwcd', 'chicken dinner', 'gaming', '18 kills'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3300, new Date().toISOString(), 'game', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare(`
        INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, match_date, extraction_confidence, raw_extracted_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`gr_1`, id, userId, 'BGMI', 'Classic', 'Erangel', 18, 42, '#1 Winner Winner Chicken Dinner', 2450, '2026-11-05', 0.98, ocr);

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'game');
      seededItems.push(filename);
    }

    // Game 2: 12 Kills on Miramar, Rank #3
    {
      const id = `sc_test_bgmi_12kills_${Date.now()}`;
      const filename = 'TEST_bgmi_12kills_miramar.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'BGMI • Match Result', 'Rank #3/100 • 12 Kills on Miramar', '#831843', '#EC4899');

      const ocr = `BATTLEGROUNDS MOBILE INDIA\nMATCH OVER\nRank #3/100\nKills: 12\nDamage: 1680\nRating: +22\nMap: Miramar - Classic`;
      const desc = 'BGMI match end screen displaying Rank #3 with 12 kills and 1680 damage across desert Miramar.';
      const tags = ['bgmi', 'miramar', 'gaming', '12 kills'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3200, new Date().toISOString(), 'game', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare(`
        INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, match_date, extraction_confidence, raw_extracted_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`gr_2`, id, userId, 'BGMI', 'Classic', 'Miramar', 12, 22, '#3', 1680, '2026-11-03', 0.95, ocr);

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'game');
      seededItems.push(filename);
    }

    // ========================================================================
    // DATASET 3: VISUAL PRODUCTS & POSTERS (PRD SECTION 12)
    // ========================================================================

    // Visual 1: Black Cotton Shirt
    {
      const id = `sc_test_black_shirt_${Date.now()}`;
      const filename = 'TEST_product_black_shirt.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'Zara • Shopping', 'Men Black Cotton Crew-Neck T-Shirt • ₹1,490', '#18181B', '#E4E4E7');

      const ocr = `ZARA MAN\nHeavyweight Cotton T-Shirt\nColor: Deep Jet Black\nSize: M\nPrice: ₹1,490\nIn Stock • Add to Cart`;
      const desc = 'E-commerce product screenshot of a premium black cotton crew-neck t-shirt saved from Zara with size and price.';
      const tags = ['black shirt', 'shirt', 'clothing', 'fashion', 'zara', 'outfit'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3150, new Date().toISOString(), 'product', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'product');
      seededItems.push(filename);
    }

    // Visual 2: College Fest Poster with Address
    {
      const id = `sc_test_fest_poster_${Date.now()}`;
      const filename = 'TEST_poster_college_fest.svg';
      const storageKey = path.join(userId, filename).replace(/\\/g, '/');
      const filePath = path.join(UPLOADS_BASE, storageKey);

      generateMockImageFile(filePath, 'Event Poster • TechFest', 'National Robotics & Coding Fest • Dec 12-14', '#064E3B', '#34D399');

      const ocr = `TECHVISION 2026 • ANNUAL TECH FEST\nVenue: Main Auditorium, PSG Tech, Avinashi Road, Peelamedu, Coimbatore - 641004\nDates: December 12-14, 2026\nEvents: Hackathon, Robotics Arena, Photography Contest\nRegister at techvision2026.edu`;
      const desc = 'Official college fest event poster with Avinashi Road address in Peelamedu, Coimbatore, registration info, and photography competition schedule.';
      const tags = ['poster', 'college fest', 'event', 'address', 'coimbatore', 'hackathon'];
      const emb = await generateTextEmbedding(`${desc} ${ocr}`);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, storageKey, filename, 'image/svg+xml', 3350, new Date().toISOString(), 'poster_document', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

      db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'poster_document');
      seededItems.push(filename);
    }

    res.json({
      message: `Successfully seeded ${seededItems.length} benchmark test screenshots covering conversation sequences, game stats, and visual search.`,
      seeded_screenshots: seededItems,
    });
  } catch (err: any) {
    console.error('Seed test data error:', err);
    res.status(500).json({ error: 'Failed to seed test data' });
  }
});

export default router;
