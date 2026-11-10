import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { analyzeScreenshot } from './ai/gemini';
import { generateTextEmbedding } from './ai/embeddings';

interface Job {
  screenshotId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
  originalFilename: string;
  retryCount: number;
}

const jobQueue: Job[] = [];
const MAX_CONCURRENT_JOBS = 5;
let activeWorkers = 0;

export function enqueueScreenshotJob(job: Omit<Job, 'retryCount'>): void {
  jobQueue.push({ ...job, retryCount: 0 });
  pumpQueue();
}

function pumpQueue(): void {
  while (activeWorkers < MAX_CONCURRENT_JOBS && jobQueue.length > 0) {
    const job = jobQueue.shift()!;
    activeWorkers++;
    executeJob(job).finally(() => {
      activeWorkers--;
      pumpQueue();
    });
  }
}

async function executeJob(job: Job): Promise<void> {
  try {
    // 1. Mark status as processing in DB
    const updateStatus = db.prepare(`
      UPDATE screenshots 
      SET processing_status = 'processing', updated_at = ? 
      WHERE id = ? AND user_id = ?
    `);
    updateStatus.run(new Date().toISOString(), job.screenshotId, job.userId);

    const isVercel = Boolean(process.env.VERCEL);
    const uploadsDir = isVercel
      ? path.resolve('/tmp', 'recall-uploads')
      : path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads');
    const fullPath = path.join(uploadsDir, job.storageKey);

    let base64Data: string | null = null;
    // If file does not exist on disk in ephemeral container, restore from SQLite image_data backup
    try {
      const getImg = db.prepare('SELECT image_data FROM screenshots WHERE id = ?');
      const imgRow = getImg.get(job.screenshotId) as any;
      if (imgRow?.image_data) {
        base64Data = imgRow.image_data;
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, Buffer.from(imgRow.image_data, 'base64'));
        }
      }
    } catch (err) {
      console.warn('Could not restore image file from DB backup:', err);
    }

    // 2. Perform OCR and multimodal analysis
    const analysis = await analyzeScreenshot(fullPath, job.mimeType, job.originalFilename, base64Data);

    // 3. Generate embedding for visual & semantic search
    const textForEmbedding = `${analysis.visual_description} ${analysis.tags.join(' ')} ${analysis.ocr_text.substring(0, 500)}`;
    const embedding = await generateTextEmbedding(textForEmbedding);

    // 4. Atomic database commit
    const now = new Date().toISOString();

    // Clean up any previous extracted records to ensure idempotency on retries
    const deleteOldMsgs = db.prepare('DELETE FROM extracted_messages WHERE screenshot_id = ?');
    deleteOldMsgs.run(job.screenshotId);

    const deleteOldGame = db.prepare('DELETE FROM game_results WHERE screenshot_id = ?');
    deleteOldGame.run(job.screenshotId);

    const deleteOldFts = db.prepare('DELETE FROM screenshots_fts WHERE screenshot_id = ?');
    try {
      deleteOldFts.run(job.screenshotId);
    } catch {}

    // Update screenshot record
    const updateScreenshot = db.prepare(`
      UPDATE screenshots 
      SET 
        category = ?,
        processing_status = 'ready',
        processing_error = NULL,
        ocr_text = ?,
        visual_description = ?,
        text_embedding = ?,
        tags = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `);

    updateScreenshot.run(
      analysis.category,
      analysis.ocr_text,
      analysis.visual_description,
      JSON.stringify(embedding),
      JSON.stringify(analysis.tags),
      now,
      job.screenshotId,
      job.userId
    );

    // Insert messages if chat
    if (analysis.messages && analysis.messages.length > 0) {
      const insertMsg = db.prepare(`
        INSERT INTO extracted_messages (
          id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence, bounding_box
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const msg of analysis.messages) {
        insertMsg.run(
          `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          job.screenshotId,
          job.userId,
          msg.sequence_number,
          msg.message_text,
          msg.sender_side,
          msg.sender_label || null,
          msg.confidence,
          msg.bounding_box ? JSON.stringify(msg.bounding_box) : null
        );
      }
    }

    // Insert game stats if game result
    if (analysis.game_result) {
      const insertGame = db.prepare(`
        INSERT INTO game_results (
          id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, match_date, extraction_confidence, raw_extracted_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertGame.run(
        `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        job.screenshotId,
        job.userId,
        analysis.game_result.game_name,
        analysis.game_result.mode || null,
        analysis.game_result.map_name || null,
        analysis.game_result.kills ?? null,
        analysis.game_result.score ?? null,
        analysis.game_result.rank || null,
        analysis.game_result.damage ?? null,
        analysis.game_result.match_date || null,
        analysis.game_result.extraction_confidence,
        analysis.game_result.raw_extracted_text || ''
      );
    }

    // Insert into FTS5 index
    try {
      const insertFts = db.prepare(`
        INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertFts.run(
        job.screenshotId,
        job.userId,
        analysis.ocr_text,
        analysis.visual_description,
        analysis.tags.join(' '),
        analysis.category
      );
    } catch (ftsErr) {
      console.warn('FTS5 index insert warning:', ftsErr);
    }

    console.log(`✅ Processed screenshot ${job.screenshotId} [${analysis.category}]`);
  } catch (err: any) {
    console.error(`❌ Error processing screenshot ${job.screenshotId}:`, err);

    if (job.retryCount < 2) {
      console.log(`Retrying job ${job.screenshotId} (attempt ${job.retryCount + 1})...`);
      jobQueue.push({ ...job, retryCount: job.retryCount + 1 });
    } else {
      const markFailed = db.prepare(`
        UPDATE screenshots 
        SET processing_status = 'failed', processing_error = ?, updated_at = ? 
        WHERE id = ? AND user_id = ?
      `);
      markFailed.run(err.message || 'Processing failed', new Date().toISOString(), job.screenshotId, job.userId);
    }
  }
}

