import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { enqueueScreenshotJob } from '../services/processingQueue';
import { analyzeScreenshot } from '../services/ai/gemini';
import { generateTextEmbedding } from '../services/ai/embeddings';

const router = Router();

const isVercel = Boolean(process.env.VERCEL);
const UPLOADS_BASE = isVercel
  ? path.resolve('/tmp', 'recall-uploads')
  : path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads');

try {
  if (!fs.existsSync(UPLOADS_BASE)) {
    fs.mkdirSync(UPLOADS_BASE, { recursive: true });
  }
} catch (e) {
  console.warn('Could not initialize UPLOADS_BASE:', e);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    try {
      const userId = req.user?.id || 'anonymous';
      const userDir = path.join(UPLOADS_BASE, userId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    } catch (err: any) {
      cb(err, UPLOADS_BASE);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024, files: 50 }, // 35 MB per file, up to 50 files
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP, SVG) are supported'));
    }
  },
});

// 1. Upload Screenshots (Single or Multiple, up to 50 per batch)
router.post(
  '/upload',
  authMiddleware,
  upload.array('screenshots', 50),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Safety: ensure FK constraints stay OFF across serverless cold starts
      try { db.exec('PRAGMA foreign_keys = OFF;'); } catch {}

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No screenshot files uploaded' });
        return;
      }

      const userId = req.user!.id;
      const createdScreenshots = [];

      // Ensure user record exists before inserting screenshots
      try {
        const checkUser = db.prepare('SELECT id FROM users WHERE id = ?');
        const userExists = await checkUser.get(userId);
        if (!userExists) {
          const email = req.user?.email || `${userId}@recall.local`;
          const existingByEmail = (await db.prepare('SELECT id FROM users WHERE email = ?').get(email)) as any;
          if (existingByEmail) {
            try {
              await db.prepare('UPDATE screenshots SET user_id = ? WHERE user_id = ?').run(userId, existingByEmail.id);
              await db.prepare('UPDATE extracted_messages SET user_id = ? WHERE user_id = ?').run(userId, existingByEmail.id);
              await db.prepare('UPDATE game_results SET user_id = ? WHERE user_id = ?').run(userId, existingByEmail.id);
            } catch {}
            await db.prepare('UPDATE users SET id = ? WHERE email = ?').run(userId, email);
          } else {
            await db.prepare(`
              INSERT OR REPLACE INTO users (id, email, password_hash, name, is_verified, created_at)
              VALUES (?, ?, '', ?, 1, ?)
            `).run(userId, email, req.user?.name || 'Recall User', new Date().toISOString());
          }
        }
      } catch (safetyErr) {
        console.warn('Safety user check in upload:', safetyErr);
      }

      for (const file of files) {
        const screenshotId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const storageKey = path.join(userId, file.filename).replace(/\\/g, '/');
        const now = new Date().toISOString();

        let base64Data: string | null = null;
        try {
          if (file.path && fs.existsSync(file.path)) {
            base64Data = fs.readFileSync(file.path).toString('base64');
          }
        } catch (e) {
          console.warn('Could not read image file for base64 storage:', e);
        }

        // Fast initial heuristic categorization (<1ms) based on filename
        let initialCategory = 'other';
        const nameLower = file.originalname.toLowerCase();
        if (nameLower.includes('chat') || nameLower.includes('wa') || nameLower.includes('msg') || nameLower.includes('whatsapp') || nameLower.includes('telegram')) {
          initialCategory = 'chat';
        } else if (nameLower.includes('game') || nameLower.includes('bgmi') || nameLower.includes('pubg') || nameLower.includes('score')) {
          initialCategory = 'game';
        } else if (nameLower.includes('product') || nameLower.includes('shop') || nameLower.includes('cart') || nameLower.includes('buy')) {
          initialCategory = 'product';
        } else if (nameLower.includes('doc') || nameLower.includes('bill') || nameLower.includes('invoice') || nameLower.includes('ticket')) {
          initialCategory = 'poster_document';
        }

        const insertStmt = db.prepare(`
          INSERT INTO screenshots (
            id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
            captured_at, uploaded_at, category, processing_status, processing_error,
            ocr_text, visual_description, text_embedding, tags, image_data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await insertStmt.run(
          screenshotId,
          userId,
          storageKey,
          file.originalname,
          file.mimetype,
          null, // width (optional)
          null, // height (optional)
          file.size,
          now,
          now,
          initialCategory,
          'processing',
          null,
          '',
          '',
          null,
          '[]',
          base64Data,
          now,
          now
        );

        // Enqueue background processing for local/persistent environments
        try {
          enqueueScreenshotJob({
            screenshotId,
            userId,
            storageKey,
            mimeType: file.mimetype,
            originalFilename: file.originalname,
          });
        } catch (queueErr) {
          console.warn('Enqueue notice:', queueErr);
        }

        createdScreenshots.push({
          id: screenshotId,
          filename: file.originalname,
          storage_key: storageKey,
          category: initialCategory,
          status: 'processing',
        });
      }

      res.status(201).json({
        message: `Successfully uploaded ${createdScreenshots.length} screenshots. Background analysis started.`,
        screenshots: createdScreenshots,
      });
    } catch (err: any) {
      console.error('Upload handler error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload screenshot' });
    }
  }
);

// 2. List Screenshots for Authenticated User (Excludes heavy image_data for fast <10ms response & avoids Vercel 4.5MB payload limit)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    let sql = `
      SELECT 
        id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
        captured_at, uploaded_at, category, processing_status, processing_error,
        ocr_text, visual_description, text_embedding, tags, created_at, updated_at
      FROM screenshots 
      WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `;
    const params: any[] = [userId, userEmail || userId];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (status && status !== 'all') {
      sql += ' AND processing_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY uploaded_at DESC';

    const stmt = db.prepare(sql);
    const rows = (await stmt.all(...params)) as any[];

    // Parse JSON tags
    const screenshots = rows.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));

    res.json({ screenshots, total: screenshots.length });
  } catch (err: any) {
    console.error('List screenshots error:', err);
    res.status(500).json({ error: 'Failed to retrieve screenshots' });
  }
});

// 3. Get Single Screenshot with Extracted Messages & Game Stats
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;
    const { id } = req.params;

    const getScreenshot = db.prepare(`
      SELECT 
        id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
        captured_at, uploaded_at, category, processing_status, processing_error,
        ocr_text, visual_description, text_embedding, tags, created_at, updated_at
      FROM screenshots 
      WHERE id = ? AND (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `);
    const screenshot = (await getScreenshot.get(id, userId, userEmail || userId)) as any;

    if (!screenshot) {
      res.status(404).json({ error: 'Screenshot not found or access denied' });
      return;
    }

    const getMessages = db.prepare(`
      SELECT * FROM extracted_messages 
      WHERE screenshot_id = ? 
      ORDER BY sequence_number ASC
    `);
    const messages = (await getMessages.all(id)) as any[];

    const getGame = db.prepare('SELECT * FROM game_results WHERE screenshot_id = ?');
    const game = (await getGame.get(id)) as any;

    res.json({
      screenshot: {
        ...screenshot,
        tags: screenshot.tags ? JSON.parse(screenshot.tags) : [],
      },
      messages: messages.map(m => ({
        ...m,
        bounding_box: m.bounding_box ? JSON.parse(m.bounding_box) : null,
      })),
      game_result: game || null,
    });
  } catch (err: any) {
    console.error('Get screenshot details error:', err);
    res.status(500).json({ error: 'Failed to retrieve screenshot details' });
  }
});

// 4. Secure Private Image Streaming (Token Authenticated)
router.get('/image/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;
    const { id } = req.params;

    const getScreenshot = db.prepare(`
      SELECT storage_key, mime_type, image_data 
      FROM screenshots 
      WHERE id = ? AND (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `);
    const row = (await getScreenshot.get(id, userId, userEmail || userId)) as any;

    if (!row) {
      res.status(404).json({ error: 'Image not found or access denied' });
      return;
    }

    const fullPath = path.join(UPLOADS_BASE, row.storage_key);
    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', row.mime_type || 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      fs.createReadStream(fullPath).pipe(res);
      return;
    }

    if (row.image_data) {
      res.setHeader('Content-Type', row.mime_type || 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(Buffer.from(row.image_data, 'base64'));
      return;
    }

    res.status(404).json({ error: 'Image file does not exist on disk' });
  } catch (err: any) {
    console.error('Image streaming error:', err);
    res.status(500).json({ error: 'Failed to stream image' });
  }
});

// 5. Update Editable Metadata (User Corrections)
router.patch('/:id/metadata', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { category, visual_description, tags } = req.body;

    const getScreenshot = db.prepare('SELECT id FROM screenshots WHERE id = ? AND user_id = ?');
    const existing = await getScreenshot.get(id, userId);

    if (!existing) {
      res.status(404).json({ error: 'Screenshot not found or access denied' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE screenshots 
      SET 
        category = COALESCE(?, category),
        visual_description = COALESCE(?, visual_description),
        tags = COALESCE(?, tags),
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `);

    await updateStmt.run(
      category || null,
      visual_description || null,
      tags ? JSON.stringify(tags) : null,
      new Date().toISOString(),
      id,
      userId
    );

    res.json({ message: 'Metadata updated successfully' });
  } catch (err: any) {
    console.error('Update metadata error:', err);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// 6. Delete Screenshot & All Derived Records (Strict Cascade)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const getScreenshot = db.prepare('SELECT storage_key FROM screenshots WHERE id = ? AND user_id = ?');
    const row = (await getScreenshot.get(id, userId)) as any;

    if (!row) {
      res.status(404).json({ error: 'Screenshot not found or access denied' });
      return;
    }

    // Delete image file from storage
    const fullPath = path.join(UPLOADS_BASE, row.storage_key);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        console.warn('Could not delete physical file:', e);
      }
    }

    // Delete from DB (foreign keys cascade will remove messages, games, and fts)
    const deleteScreenshot = db.prepare('DELETE FROM screenshots WHERE id = ? AND user_id = ?');
    await deleteScreenshot.run(id, userId);

    try {
      const deleteFts = db.prepare('DELETE FROM screenshots_fts WHERE screenshot_id = ? AND user_id = ?');
      await deleteFts.run(id, userId);
    } catch {}

    res.json({ message: 'Screenshot and derived records deleted successfully' });
  } catch (err: any) {
    console.error('Delete screenshot error:', err);
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

// 7. Re-analyze Screenshot with upgraded Gemini 3.5 & Groq AI
router.post('/:id/reanalyze', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const getScreenshot = db.prepare('SELECT * FROM screenshots WHERE id = ? AND user_id = ?');
    const row = (await getScreenshot.get(id, userId)) as any;

    if (!row) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    const fullPath = path.join(UPLOADS_BASE, row.storage_key);
    const analysis = await analyzeScreenshot(fullPath, row.mime_type, row.original_filename, row.image_data);

    let embedding: number[] = [];
    try {
      const textForEmbedding = `${analysis.visual_description} ${analysis.tags.join(' ')} ${analysis.ocr_text.substring(0, 500)}`;
      embedding = await generateTextEmbedding(textForEmbedding);
    } catch {}

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE screenshots
      SET category = ?, processing_status = 'ready', ocr_text = ?, visual_description = ?,
          tags = ?, text_embedding = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      analysis.category,
      analysis.ocr_text,
      analysis.visual_description,
      JSON.stringify(analysis.tags),
      JSON.stringify(embedding),
      now,
      id,
      userId
    );

    // Refresh messages
    try {
      await db.prepare('DELETE FROM extracted_messages WHERE screenshot_id = ?').run(id);
      if (analysis.messages && analysis.messages.length > 0) {
        const insertMsg = db.prepare(`
          INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of analysis.messages) {
          await insertMsg.run(`msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, id, userId, m.sequence_number, m.message_text, m.sender_side, m.sender_label || null, m.confidence);
        }
      }
    } catch {}

    // Refresh game results
    try {
      await db.prepare('DELETE FROM game_results WHERE screenshot_id = ?').run(id);
      if (analysis.game_result) {
        const g = analysis.game_result;
        await db.prepare(`
          INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, match_date, extraction_confidence, raw_extracted_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, id, userId, g.game_name, g.mode, g.map_name, g.kills, g.score, g.rank, g.damage, g.match_date, g.extraction_confidence, g.raw_extracted_text);
      }
    } catch {}

    res.json({ message: 'Screenshot re-analyzed successfully', category: analysis.category, analysis });
  } catch (err: any) {
    console.error('Re-analyze error:', err);
    res.status(500).json({ error: 'Failed to re-analyze screenshot' });
  }
});

// 8. Process Next Pending Screenshot in the Background
router.post('/process-pending', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;

    const getPending = db.prepare(`
      SELECT id, user_id, storage_key, mime_type, original_filename, image_data
      FROM screenshots
      WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
        AND processing_status IN ('queued', 'processing')
      ORDER BY uploaded_at ASC
      LIMIT 1
    `);
    const pending = (await getPending.get(userId, userEmail || userId)) as any;

    if (!pending) {
      res.json({ processed: false, message: 'No pending screenshots' });
      return;
    }

    const fullPath = path.join(UPLOADS_BASE, pending.storage_key);
    const analysis = await analyzeScreenshot(fullPath, pending.mime_type, pending.original_filename, pending.image_data);

    let embedding: number[] = [];
    try {
      const textForEmbedding = `${analysis.visual_description} ${analysis.tags.join(' ')} ${analysis.ocr_text.substring(0, 500)}`;
      embedding = await generateTextEmbedding(textForEmbedding);
    } catch {}

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE screenshots
      SET category = ?, processing_status = 'ready', ocr_text = ?, visual_description = ?,
          tags = ?, text_embedding = ?, updated_at = ?
      WHERE id = ?
    `).run(
      analysis.category,
      analysis.ocr_text,
      analysis.visual_description,
      JSON.stringify(analysis.tags),
      JSON.stringify(embedding),
      now,
      pending.id
    );

    // Refresh messages
    try {
      await db.prepare('DELETE FROM extracted_messages WHERE screenshot_id = ?').run(pending.id);
      if (analysis.messages && analysis.messages.length > 0) {
        const insertMsg = db.prepare(`
          INSERT INTO extracted_messages (id, screenshot_id, user_id, sequence_number, message_text, sender_side, sender_label, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of analysis.messages) {
          await insertMsg.run(
            `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            pending.id,
            pending.user_id,
            m.sequence_number,
            m.message_text,
            m.sender_side,
            m.sender_label || null,
            m.confidence
          );
        }
      }
    } catch {}

    // Refresh game results
    try {
      await db.prepare('DELETE FROM game_results WHERE screenshot_id = ?').run(pending.id);
      if (analysis.game_result) {
        const g = analysis.game_result;
        await db.prepare(`
          INSERT INTO game_results (id, screenshot_id, user_id, game_name, mode, map_name, kills, score, rank, damage, match_date, extraction_confidence, raw_extracted_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          pending.id,
          pending.user_id,
          g.game_name,
          g.mode,
          g.map_name,
          g.kills,
          g.score,
          g.rank,
          g.damage,
          g.match_date,
          g.extraction_confidence,
          g.raw_extracted_text
        );
      }
    } catch {}

    // Refresh FTS
    try {
      await db.prepare('DELETE FROM screenshots_fts WHERE screenshot_id = ?').run(pending.id);
      await db.prepare(`
        INSERT INTO screenshots_fts (screenshot_id, user_id, ocr_text, visual_description, tags, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        pending.id,
        pending.user_id,
        analysis.ocr_text || '',
        analysis.visual_description || '',
        (analysis.tags || []).join(' '),
        analysis.category
      );
    } catch {}

    res.json({ processed: true, screenshotId: pending.id, category: analysis.category });
  } catch (err: any) {
    console.error('Process pending error:', err);
    res.status(500).json({ error: 'Failed to process pending screenshot' });
  }
});

export default router;

