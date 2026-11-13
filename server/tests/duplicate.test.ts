import {
  cleanSubstantiveOcr,
  computeTokenJaccard,
  computeBigramDice,
  isBurstFilename,
  detectDuplicateGroups,
} from '../services/duplicateDetector';

async function runTests() {
  console.log('🧪 Starting RECALL Duplicate Detection Engine Test Suite...');

  // 1. Status Bar & Timestamp Normalization
  const ocr1 = '10:47 M 870 KB/s 5G+ 100% THRANAESWANTH... tombatgaming Come bro at 11:30 PM Seen 25m ago';
  const ocr2 = '11:00 THRANAESWANTH... tombatgaming Come bro at 11:30 PM Seen 38m ago';

  const tokens1 = cleanSubstantiveOcr(ocr1);
  const tokens2 = cleanSubstantiveOcr(ocr2);

  const jaccard = computeTokenJaccard(tokens1, tokens2);
  const dice = computeBigramDice(tokens1.join(' '), tokens2.join(' '));

  console.log(`Tokens 1: [${tokens1.join(', ')}]`);
  console.log(`Tokens 2: [${tokens2.join(', ')}]`);
  console.log(`Jaccard: ${jaccard.toFixed(3)}, Dice: ${dice.toFixed(3)}`);

  if (jaccard < 0.85 || dice < 0.85) {
    throw new Error(`TEST 1 FAILED: Expected OCR similarity >= 0.85, got ${jaccard}`);
  }
  console.log('✅ TEST 1 PASSED: Volatile status bar noise stripped, substantive text similarity > 85%!');

  // 2. Burst Filenames Detection
  if (!isBurstFilename('1000052994.jpg', '1000052996.jpg')) {
    throw new Error('TEST 2 FAILED: Expected 1000052994 and 1000052996 to be recognized as burst filenames');
  }
  if (!isBurstFilename('dc944b8b_all_428.jpg', 'dc944b8b_all_429.jpg')) {
    throw new Error('TEST 2 FAILED: Expected _all_428 and _all_429 to be recognized as burst filenames');
  }
  if (isBurstFilename('photo_100.jpg', 'photo_999.jpg')) {
    throw new Error('TEST 2 FAILED: Distant numbers should not be burst');
  }
  console.log('✅ TEST 2 PASSED: Burst shot filename sequential detection accurate!');

  // 3. Multi-Signal Duplicate Groups Detection
  const dummyScreenshots = [
    {
      id: 'sc_newest',
      original_filename: '1000053003.jpg',
      file_size: 425440,
      uploaded_at: '2026-11-13T11:00:00Z',
      category: 'chat',
      ocr_text: ocr2,
      visual_description: 'Instagram direct message chat with THRANAESWANTH...',
      tags: ['chat', 'instagram', 'messages'],
    },
    {
      id: 'sc_older_duplicate',
      original_filename: '1000053000.jpg',
      file_size: 431619,
      uploaded_at: '2026-11-13T10:47:00Z',
      category: 'chat',
      ocr_text: ocr1,
      visual_description: 'Instagram direct message conversation with THRANAESWANTH...',
      tags: ['chat', 'instagram', 'messages'],
    },
    {
      id: 'sc_unrelated',
      original_filename: 'pizza_dinner.jpg',
      file_size: 981200,
      uploaded_at: '2026-11-13T09:00:00Z',
      category: 'other',
      ocr_text: 'Dominos Cheesy Crust Pizza Order #492',
      visual_description: 'A hot fresh pizza on a table with melted cheese',
      tags: ['food', 'pizza', 'dinner'],
    },
  ];

  const groups = await detectDuplicateGroups(dummyScreenshots, { enableAiVerification: false });
  console.log(`Detected groups: ${groups.length}`);

  if (groups.length !== 1) {
    throw new Error(`TEST 3 FAILED: Expected 1 duplicate group, found ${groups.length}`);
  }

  const group = groups[0];
  if (group.keep.id !== 'sc_newest') {
    throw new Error(`TEST 3 FAILED: Expected to keep sc_newest, kept ${group.keep.id}`);
  }
  if (group.duplicates.length !== 1 || group.duplicates[0].id !== 'sc_older_duplicate') {
    throw new Error(`TEST 3 FAILED: Expected sc_older_duplicate in duplicates`);
  }

  console.log(`Reason: ${group.duplicates[0].reason}`);
  console.log('✅ TEST 3 PASSED: Duplicate group correctly identified duplicate chat screenshot and ignored unrelated pizza photo!');

  console.log('\n🎉 ALL DUPLICATE DETECTION TESTS PASSED SUCCESSFULLY! 🚀');
  process.exit(0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
