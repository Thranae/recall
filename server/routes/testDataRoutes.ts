import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateTextEmbedding } from '../services/ai/embeddings';

const router = Router();
const UPLOADS_BASE = path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads');

// Generate high-resolution realistic mobile screenshots
export function generateMockImageFile(
  filePath: string,
  type: 'chat' | 'game' | 'product' | 'poster',
  title: string,
  subtitle: string,
  accentColor: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let innerContent = '';

  if (type === 'chat') {
    innerContent = `
      <!-- WhatsApp Style Chat Interface -->
      <rect x="0" y="44" width="720" height="76" fill="#075E54"/>
      <circle cx="60" cy="82" r="24" fill="#128C7E"/>
      <text x="50" y="89" font-family="-apple-system, sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">E</text>
      <text x="100" y="78" font-family="-apple-system, sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">${title}</text>
      <text x="100" y="98" font-family="-apple-system, sans-serif" font-size="13" fill="#D1FAE5">online • WhatsApp</text>

      <!-- Message Bubbles -->
      <rect x="40" y="160" width="480" height="64" rx="16" fill="#1F2937"/>
      <text x="60" y="198" font-family="-apple-system, sans-serif" font-size="16" fill="#F3F4F6">I was thinking about you today</text>
      <text x="460" y="212" font-family="-apple-system, sans-serif" font-size="11" fill="#9CA3AF">20:14</text>

      <rect x="200" y="244" width="480" height="64" rx="16" fill="#056162"/>
      <text x="220" y="282" font-family="-apple-system, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">I love you</text>
      <text x="620" y="296" font-family="-apple-system, sans-serif" font-size="11" fill="#6EE7B7">20:15 ✓✓</text>

      <rect x="40" y="328" width="480" height="64" rx="16" fill="#1F2937"/>
      <text x="60" y="366" font-family="-apple-system, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">I love you too</text>
      <text x="460" y="380" font-family="-apple-system, sans-serif" font-size="11" fill="#9CA3AF">20:16</text>

      <rect x="40" y="412" width="480" height="64" rx="16" fill="#1F2937"/>
      <text x="60" y="450" font-family="-apple-system, sans-serif" font-size="16" fill="#F3F4F6">See you tomorrow at 7!</text>
      <text x="460" y="464" font-family="-apple-system, sans-serif" font-size="11" fill="#9CA3AF">20:17</text>

      <!-- Chat Input Mock -->
      <rect x="24" y="880" width="580" height="54" rx="27" fill="#1F2937" stroke="rgba(255,255,255,0.1)"/>
      <text x="50" y="913" font-family="-apple-system, sans-serif" font-size="15" fill="#6B7280">Message...</text>
      <circle cx="654" cy="907" r="27" fill="#056162"/>
      <polygon points="650,897 662,907 650,917" fill="#FFFFFF"/>
    `;
  } else if (type === 'game') {
    const isWinner = title.includes('18');
    innerContent = `
      <!-- BGMI / PUBG Mobile Match Results HUD -->
      <defs>
        <radialGradient id="sunburst" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="720" height="960" fill="url(#sunburst)"/>

      <!-- Victory Banner -->
      <rect x="36" y="120" width="648" height="110" rx="20" fill="rgba(245, 158, 11, 0.15)" stroke="#F59E0B" stroke-width="2"/>
      <text x="360" y="170" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="28" font-weight="900" fill="#FBBF24" letter-spacing="2">${isWinner ? '#1 WINNER WINNER CHICKEN DINNER' : '#14 BETTER LUCK NEXT TIME'}</text>
      <text x="360" y="205" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="15" font-weight="700" fill="#FDE68A">BATTLEGROUNDS MOBILE INDIA • ERANGEL</text>

      <!-- Stats Grid Cards -->
      <rect x="40" y="260" width="300" height="150" rx="20" fill="rgba(30, 41, 59, 0.85)" stroke="rgba(255,255,255,0.15)"/>
      <text x="70" y="300" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#94A3B8">KILLS</text>
      <text x="70" y="375" font-family="ui-monospace, monospace" font-size="64" font-weight="900" fill="#F59E0B">${isWinner ? '18' : '8'}</text>

      <rect x="380" y="260" width="300" height="150" rx="20" fill="rgba(30, 41, 59, 0.85)" stroke="rgba(255,255,255,0.15)"/>
      <text x="410" y="300" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#94A3B8">DAMAGE DEALT</text>
      <text x="410" y="375" font-family="ui-monospace, monospace" font-size="52" font-weight="900" fill="#FFFFFF">${isWinner ? '2450' : '980'}</text>

      <rect x="40" y="440" width="640" height="110" rx="20" fill="rgba(30, 41, 59, 0.7)" stroke="rgba(255,255,255,0.1)"/>
      <text x="70" y="480" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" fill="#94A3B8">SURVIVAL TIME</text>
      <text x="70" y="525" font-family="ui-monospace, monospace" font-size="32" font-weight="800" fill="#E2E8F0">${isWinner ? '31m 42s' : '14m 20s'}</text>

      <text x="360" y="480" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" fill="#94A3B8">ACCURACY</text>
      <text x="360" y="525" font-family="ui-monospace, monospace" font-size="32" font-weight="800" fill="#10B981">${isWinner ? '34.8%' : '18.2%'}</text>

      <!-- Squad Leaderboard Preview -->
      <rect x="40" y="580" width="640" height="240" rx="20" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.1)"/>
      <text x="70" y="625" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">TEAM RANK: ${isWinner ? '#1' : '#14'} / 25</text>
      <line x1="70" y1="645" x2="650" y2="645" stroke="rgba(255,255,255,0.1)"/>
      <text x="70" y="685" font-family="-apple-system, sans-serif" font-size="15" fill="#FBBF24">★ AlexMercer (MVP) — ${isWinner ? '18' : '8'} Kills</text>
      <text x="70" y="725" font-family="-apple-system, sans-serif" font-size="15" fill="#94A3B8">2. Viper99 — 4 Kills</text>
      <text x="70" y="765" font-family="-apple-system, sans-serif" font-size="15" fill="#94A3B8">3. GhostRider — 2 Kills</text>
    `;
  } else if (type === 'product') {
    innerContent = `
      <!-- E-commerce Fashion Product Card -->
      <rect x="40" y="80" width="640" height="520" rx="24" fill="#18181B" stroke="rgba(255,255,255,0.12)"/>
      
      <!-- Visual Shirt Illustration -->
      <path d="M 280 200 L 360 250 L 440 200 L 510 260 L 470 320 L 430 300 L 430 480 L 290 480 L 290 300 L 250 320 L 210 260 Z" fill="#0A0A0A" stroke="#3F3F46" stroke-width="3"/>
      <text x="360" y="340" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="16" font-weight="900" fill="#A1A1AA" letter-spacing="4">OVERSIZED</text>

      <text x="50" y="650" font-family="-apple-system, sans-serif" font-size="26" font-weight="800" fill="#FFFFFF">Heavyweight Black Cotton Shirt</text>
      <text x="50" y="685" font-family="-apple-system, sans-serif" font-size="16" fill="#A1A1AA">Oversized fit • 280 GSM • Matte Obsidian Black</text>
      <text x="50" y="745" font-family="-apple-system, sans-serif" font-size="36" font-weight="900" fill="#60A5FA">$38.00</text>
      <text x="180" y="745" font-family="-apple-system, sans-serif" font-size="20" fill="#71717A" text-decoration="line-through">$55.00</text>
      <rect x="260" y="720" width="85" height="32" rx="16" fill="#DC2626"/>
      <text x="302" y="742" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF">30% OFF</text>

      <!-- Action Button -->
      <rect x="50" y="790" width="620" height="60" rx="30" fill="#2563EB"/>
      <text x="360" y="828" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">Add to Bag • Size M Available</text>
    `;
  } else {
    innerContent = `
      <!-- Fest Poster / Document -->
      <defs>
        <linearGradient id="posterGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="50%" stop-color="#7C3AED"/>
          <stop offset="100%" stop-color="#EC4899"/>
        </linearGradient>
      </defs>
      <rect x="40" y="80" width="640" height="780" rx="24" fill="url(#posterGrad)"/>
      <rect x="44" y="84" width="632" height="772" rx="20" fill="#0F172A" opacity="0.88"/>

      <text x="360" y="180" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="18" font-weight="800" fill="#38BDF8" letter-spacing="3">COIMBATORE INSTITUTE OF TECHNOLOGY</text>
      <text x="360" y="260" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" letter-spacing="1">CYBERFEST 2026</text>
      <text x="360" y="310" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="20" font-weight="700" fill="#F472B6">National Level Annual Cultural & Tech Fest</text>

      <rect x="80" y="360" width="560" height="240" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)"/>
      <text x="120" y="410" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#67E8F9">VENUE & ADDRESS:</text>
      <text x="120" y="445" font-family="-apple-system, sans-serif" font-size="18" font-weight="600" fill="#FFFFFF">Main Auditorium, CIT Campus</text>
      <text x="120" y="475" font-family="-apple-system, sans-serif" font-size="16" fill="#CBD5E1">Avinashi Road, Civil Aerodrome Post</text>
      <text x="120" y="505" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#FBBF24">Coimbatore, Tamil Nadu 641014</text>
      <text x="120" y="555" font-family="-apple-system, sans-serif" font-size="15" fill="#A5B4FC">Dates: November 18-20, 2026 • Free Entry</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
    <rect width="720" height="960" fill="#090B10"/>
    <!-- Status bar -->
    <rect x="0" y="0" width="720" height="44" fill="rgba(0,0,0,0.5)"/>
    <text x="36" y="29" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">9:41</text>
    <text x="630" y="29" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">5G 100%</text>

    ${innerContent}
  </svg>`;

  fs.writeFileSync(filePath, svg, 'utf8');
}

// Function to seed benchmark data for any user
export async function seedUserData(userId: string): Promise<string[]> {
  const userDir = path.join(UPLOADS_BASE, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  // Clean old seeded screenshots for this user
  const getOld = db.prepare("SELECT id, storage_key FROM screenshots WHERE user_id = ? AND original_filename LIKE 'TEST_%'").all(userId) as any[];
  for (const old of getOld) {
    try {
      fs.unlinkSync(path.join(UPLOADS_BASE, old.storage_key));
    } catch {}
    db.prepare('DELETE FROM screenshots WHERE id = ?').run(old.id);
  }

  const seededItems: string[] = [];

  // 1. WhatsApp Ordered Chat
  {
    const id = `sc_test_chat_correct_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filename = 'TEST_chat_elena_ordered.svg';
    const storageKey = path.join(userId, filename).replace(/\\/g, '/');
    const filePath = path.join(UPLOADS_BASE, storageKey);

    generateMockImageFile(filePath, 'chat', 'Elena • WhatsApp', 'Ordered Chat Match', '#818CF8');

    const ocr = `Elena\nonline • WhatsApp\nI was thinking about you today\nI love you\nI love you too\nSee you tomorrow at 7!`;
    const desc = 'WhatsApp chat screenshot showing an intimate evening conversation with Elena where I said I love you and she replied I love you too.';
    const tags = ['chat', 'conversation', 'elena', 'love', 'whatsapp'];
    const emb = await generateTextEmbedding(`${desc} ${ocr}`);

    db.prepare(`
      INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, storageKey, filename, 'image/svg+xml', 3600, new Date().toISOString(), 'chat', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

    db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_${id}_1`, id, userId, 1, 'I was thinking about you today', 'right', 'You', 0.95);
    db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_${id}_2`, id, userId, 2, 'I love you', 'right', 'You', 0.98);
    db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_${id}_3`, id, userId, 3, 'I love you too', 'left', 'Elena', 0.98);
    db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`msg_${id}_4`, id, userId, 4, 'See you tomorrow at 7!', 'left', 'Elena', 0.94);

    db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'chat');
    seededItems.push(filename);
  }

  // 2. BGMI 18 Kills Match (Target Positive)
  {
    const id = `sc_test_bgmi_18kills_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filename = 'TEST_bgmi_18kills_chicken_dinner.svg';
    const storageKey = path.join(userId, filename).replace(/\\/g, '/');
    const filePath = path.join(UPLOADS_BASE, storageKey);

    generateMockImageFile(filePath, 'game', 'BGMI Match • 18 Kills', 'Winner Winner Chicken Dinner', '#F59E0B');

    const ocr = `BATTLEGROUNDS MOBILE INDIA\nWINNER WINNER CHICKEN DINNER\nRank #1/25 Squad\nMap: Erangel\nKills: 18\nDamage: 2450\nSurvival Time: 31m 42s\nMVP: AlexMercer`;
    const desc = 'BGMI PUBG Mobile match results screen displaying Rank #1 Winner Winner Chicken Dinner with 18 kills and 2450 damage on Erangel map.';
    const tags = ['gaming', 'bgmi', 'pubg', 'chicken dinner', 'erangel', '18 kills'];
    const emb = await generateTextEmbedding(`${desc} ${ocr}`);

    db.prepare(`
      INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, storageKey, filename, 'image/svg+xml', 4200, new Date().toISOString(), 'game', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

    db.prepare(`
      INSERT INTO game_results (id, screenshot_id, user_id, game_name, kills, score, rank, damage, map_name, mode, match_date, extraction_confidence, raw_extracted_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`gm_${id}`, id, userId, 'BGMI', 18, 2450, '1', 2450, 'Erangel', 'Classic Squad', new Date().toISOString(), 0.99, ocr);

    db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'game');
    seededItems.push(filename);
  }

  // 3. Fashion Black Shirt (Visual Search)
  {
    const id = `sc_test_black_shirt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filename = 'TEST_black_shirt_product.svg';
    const storageKey = path.join(userId, filename).replace(/\\/g, '/');
    const filePath = path.join(UPLOADS_BASE, storageKey);

    generateMockImageFile(filePath, 'product', 'Heavyweight Black Shirt', '$38.00 • Heavyweight 280 GSM', '#60A5FA');

    const ocr = `Heavyweight Black Cotton Shirt\nOversized fit • 280 GSM • Matte Obsidian Black\n$38.00\nAdd to Bag • Size M Available`;
    const desc = 'E-commerce mobile app product page showcasing an oversized matte black cotton graphic shirt with price tag $38.00.';
    const tags = ['product', 'shopping', 'black shirt', 'apparel', 'fashion'];
    const emb = await generateTextEmbedding(`${desc} ${ocr}`);

    db.prepare(`
      INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, storageKey, filename, 'image/svg+xml', 3800, new Date().toISOString(), 'product', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

    db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'product');
    seededItems.push(filename);
  }

  // 4. College Fest Poster with Coimbatore Address
  {
    const id = `sc_test_fest_poster_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filename = 'TEST_fest_poster_coimbatore.svg';
    const storageKey = path.join(userId, filename).replace(/\\/g, '/');
    const filePath = path.join(UPLOADS_BASE, storageKey);

    generateMockImageFile(filePath, 'poster', 'CYBERFEST 2026', 'Coimbatore Institute of Technology', '#EC4899');

    const ocr = `COIMBATORE INSTITUTE OF TECHNOLOGY\nCYBERFEST 2026\nNational Level Annual Cultural & Tech Fest\nVENUE & ADDRESS:\nMain Auditorium, CIT Campus\nAvinashi Road, Civil Aerodrome Post\nCoimbatore, Tamil Nadu 641014\nDates: November 18-20, 2026`;
    const desc = 'Vibrant event poster for Cyberfest 2026 at Coimbatore Institute of Technology with venue address on Avinashi Road, Coimbatore.';
    const tags = ['poster', 'document', 'coimbatore', 'fest address', 'college fest', 'event'];
    const emb = await generateTextEmbedding(`${desc} ${ocr}`);

    db.prepare(`
      INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, storageKey, filename, 'image/svg+xml', 4100, new Date().toISOString(), 'poster_document', 'ready', ocr, desc, JSON.stringify(emb), JSON.stringify(tags), new Date().toISOString(), new Date().toISOString());

    db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, ocr, desc, tags.join(' '), 'poster_document');
    seededItems.push(filename);
  }

  return seededItems;
}

// POST /api/test-data/seed
router.post('/seed', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const seededItems = await seedUserData(userId);

    res.json({
      success: true,
      message: 'PRD Section 12 Benchmark Dataset seeded successfully',
      seeded_screenshots: seededItems.length,
      items: seededItems,
    });
  } catch (err: any) {
    console.error('Failed to seed benchmark test data:', err);
    res.status(500).json({ error: 'Failed to seed benchmark test data', details: err.message });
  }
});

export default router;
