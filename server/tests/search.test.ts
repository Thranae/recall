import { db, initDatabase } from '../db';
import { executeHybridSearch } from '../services/searchEngine';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
  console.log('🧪 Starting RECALL Acceptance & Search Engine Test Suite...\n');
  await initDatabase();

  const testUserId = 'test_user_unit_runner';

  // Ensure test user exists in users table
  const getUser = await db.prepare('SELECT id FROM users WHERE id = ?').get(testUserId);
  if (!getUser) {
    await db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)').run(
      testUserId,
      'test_runner@recall.dev',
      'hashed_pwd',
      'Test Runner',
      new Date().toISOString()
    );
  }

  // Clean test user data
  await db.prepare('DELETE FROM screenshots WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM extracted_messages WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM game_results WHERE user_id = ?').run(testUserId);
  try {
    await db.prepare('DELETE FROM screenshots_fts WHERE user_id = ?').run(testUserId);
  } catch {}

  console.log('1️⃣ Setting up PRD Section 12 Benchmark Test Set...');

  // Screen 1: Correct ordered conversation ("I love you" at msg #1, "I love you too" at msg #2)
  const sc1 = 'sc_unit_correct_order';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc1, testUserId, 'mock/correct.png', 'chat_correct.png', 'image/png', 2000, new Date().toISOString(), 'chat', 'ready', 'I love you\nI love you too', 'Chat screen with ordered exchange', '[]', '["chat"]', new Date().toISOString(), new Date().toISOString());

  await db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)').run('m1_1', sc1, testUserId, 1, 'I love you', 'right', 0.95);
  await db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)').run('m1_2', sc1, testUserId, 2, 'I love you too', 'left', 0.95);

  // Screen 2: Reverse order ("I love you too" at msg #1, "I love you" at msg #2)
  const sc2 = 'sc_unit_reverse_order';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc2, testUserId, 'mock/reverse.png', 'chat_reverse.png', 'image/png', 2000, new Date().toISOString(), 'chat', 'ready', 'I love you too\nI love you', 'Chat with reverse order', '[]', '["chat"]', new Date().toISOString(), new Date().toISOString());

  await db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)').run('m2_1', sc2, testUserId, 1, 'I love you too', 'left', 0.95);
  await db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)').run('m2_2', sc2, testUserId, 2, 'I love you', 'right', 0.95);

  // Screen 3: First message only ("I love you" alone)
  const sc3 = 'sc_unit_first_only';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc3, testUserId, 'mock/first_only.png', 'chat_first_only.png', 'image/png', 2000, new Date().toISOString(), 'chat', 'ready', 'I love you', 'Chat first message alone', '[]', '["chat"]', new Date().toISOString(), new Date().toISOString());

  await db.prepare('INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)').run('m3_1', sc3, testUserId, 1, 'I love you', 'right', 0.95);

  // Screen 4: BGMI match with 18 kills on Erangel
  const sc4 = 'sc_unit_bgmi_18kills';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc4, testUserId, 'mock/bgmi_18.png', 'bgmi_18.png', 'image/png', 2000, new Date().toISOString(), 'game', 'ready', 'Winner Winner Chicken Dinner Kills 18', 'BGMI match with 18 kills', '[]', '["game", "bgmi"]', new Date().toISOString(), new Date().toISOString());

  await db.prepare(`
    INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, extraction_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('gr_test_1', sc4, testUserId, 'BGMI', 'Classic', 'Erangel', 18, 42, '#1 Winner Winner Chicken Dinner', 2450, 0.98);

  // Screen 5: BGMI match with 8 kills on Miramar
  const sc5 = 'sc_unit_bgmi_8kills';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc5, testUserId, 'mock/bgmi_8.png', 'bgmi_8.png', 'image/png', 2000, new Date().toISOString(), 'game', 'ready', 'Kills 8 Rank #8', 'BGMI match with 8 kills', '[]', '["game", "bgmi"]', new Date().toISOString(), new Date().toISOString());

  await db.prepare(`
    INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, extraction_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('gr_test_2', sc5, testUserId, 'BGMI', 'Classic', 'Miramar', 8, 15, '#8', 920, 0.95);

  // Screen 6: Black shirt product screenshot
  const sc6 = 'sc_unit_black_shirt';
  await db.prepare(`
    INSERT INTO screenshots (id, user_id, storage_key, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sc6, testUserId, 'mock/shirt.png', 'black_shirt.png', 'image/png', 2000, new Date().toISOString(), 'product', 'ready', 'Zara Black Cotton Shirt Price ₹1,490', 'Black cotton t-shirt with crew neck', '[]', '["black shirt", "zara", "clothing"]', new Date().toISOString(), new Date().toISOString());

  try {
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc1, testUserId, 'I love you I love you too', 'Chat screen with ordered exchange', 'chat', 'chat');
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc2, testUserId, 'I love you too I love you', 'Chat with reverse order', 'chat', 'chat');
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc3, testUserId, 'I love you', 'Chat first message alone', 'chat', 'chat');
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc4, testUserId, 'Winner Winner Chicken Dinner Kills 18', 'BGMI match with 18 kills', 'game bgmi', 'game');
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc5, testUserId, 'Kills 8 Rank #8', 'BGMI match with 8 kills', 'game bgmi', 'game');
    await db.prepare('INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category) VALUES (?, ?, ?, ?, ?, ?)').run(sc6, testUserId, 'Zara Black Cotton Shirt Price ₹1490', 'Black cotton t-shirt with crew neck', 'black shirt zara', 'product');
  } catch {}

  console.log('✅ Test dataset ready in database.\n');

  // ========================================================================
  // TEST 1: CONVERSATION RELATIONSHIP SEARCH
  // ========================================================================
  console.log('2️⃣ Running Test 1: Conversation Relationship Search...');
  const chatQuery = 'Find where I said "I love you" and she replied "I love you too"';
  const chatResponse = await executeHybridSearch(testUserId, chatQuery);

  console.log(`Query: "${chatQuery}"`);
  console.log(`Results found: ${chatResponse.total_results}`);

  if (chatResponse.total_results === 0) {
    throw new Error('FAIL: Expected conversation relational search to return at least 1 result');
  }

  const topChatResult = chatResponse.results[0];
  console.log(`Top result ID: ${topChatResult.screenshot.id}`);
  console.log(`Match Type: ${topChatResult.match_type}`);
  console.log(`Match Explanation: ${topChatResult.match_explanation}`);

  if (topChatResult.screenshot.id !== sc1) {
    throw new Error(`FAIL: Expected sc_unit_correct_order (${sc1}) to be top result, got: ${topChatResult.screenshot.id}`);
  }
  if (topChatResult.match_type !== 'conversation_sequence') {
    throw new Error(`FAIL: Expected match_type to be "conversation_sequence", got: ${topChatResult.match_type}`);
  }
  console.log('✅ TEST 1 PASSED: Correct ordered conversation ranked #1 with relational sequence verification!\n');

  // ========================================================================
  // TEST 2: STRUCTURED GAME STATS (BGMI KILLS > 15)
  // ========================================================================
  console.log('3️⃣ Running Test 2: Structured Game-Stat Numeric Filter...');
  const gameQuery = 'Find my BGMI match with more than 15 kills';
  const gameResponse = await executeHybridSearch(testUserId, gameQuery);

  console.log(`Query: "${gameQuery}"`);
  console.log(`Results found: ${gameResponse.total_results}`);

  if (gameResponse.total_results === 0) {
    throw new Error('FAIL: Expected game query to return the 18-kills match');
  }

  const topGameResult = gameResponse.results[0];
  console.log(`Top Game match ID: ${topGameResult.screenshot.id}`);
  console.log(`Kills extracted: ${topGameResult.matched_game?.kills}`);
  console.log(`Match Explanation: ${topGameResult.match_explanation}`);

  if (topGameResult.screenshot.id !== sc4) {
    throw new Error(`FAIL: Expected sc_unit_bgmi_18kills (${sc4}), got: ${topGameResult.screenshot.id}`);
  }
  if (topGameResult.matched_game?.kills !== 18) {
    throw new Error(`FAIL: Expected 18 kills, got: ${topGameResult.matched_game?.kills}`);
  }

  // Ensure 8-kills match was NOT included as a match for "> 15 kills"
  const has8KillsInResults = gameResponse.results.some(r => r.screenshot.id === sc5);
  if (has8KillsInResults) {
    throw new Error('FAIL: 8 kills match should NOT pass the "> 15 kills" filter!');
  }
  console.log('✅ TEST 2 PASSED: Structured numeric filter (kills > 15) correctly isolated 18-kills match and rejected 8-kills!\n');

  // ========================================================================
  // TEST 3: VISUAL OBJECT / PRODUCT RETRIEVAL
  // ========================================================================
  console.log('4️⃣ Running Test 3: Visual & General Search...');
  const visualQuery = 'black shirt';
  const visualResponse = await executeHybridSearch(testUserId, visualQuery);

  console.log(`Query: "${visualQuery}"`);
  console.log(`Results found: ${visualResponse.total_results}`);

  if (visualResponse.total_results === 0) {
    throw new Error('FAIL: Expected black shirt screenshot to match');
  }

  const topVisualResult = visualResponse.results[0];
  console.log(`Top result: ${topVisualResult.screenshot.original_filename}`);
  console.log(`Match Explanation: ${topVisualResult.match_explanation}`);

  if (topVisualResult.screenshot.id !== sc6) {
    throw new Error(`FAIL: Expected black shirt screenshot (${sc6}), got: ${topVisualResult.screenshot.id}`);
  }
  console.log('✅ TEST 3 PASSED: Visual search matched the black shirt screenshot accurately!\n');

  // Clean up test data
  await db.prepare('DELETE FROM screenshots WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM extracted_messages WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM game_results WHERE user_id = ?').run(testUserId);

  console.log('🎉 ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! 🚀\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
