import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { answerImageQuestion, analyzeScreenshot, generateSmartCoachInsights, detectAiRedactTargets } from '../services/ai/gemini';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { enqueueScreenshotJob, processScreenshotDirectly } from '../services/processingQueue';
import { generateTextEmbedding, computeCosineSimilarity } from '../services/ai/embeddings';
import { ensureWebCompatibleImage, isHeicFormat, detectImageMimeType } from '../utils/imageConverter';

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
    const isImageExt = /\.(png|jpe?g|webp|gif|heic|heif|svg)$/i.test(file.originalname || '');
    if (file.mimetype.startsWith('image/') || isImageExt) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP, HEIC, SVG) are supported'));
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

        let effectiveMime = file.mimetype || 'image/jpeg';
        let effectiveFilename = file.originalname;
        let effectiveSize = file.size;
        let base64Data: string | null = null;
        try {
          if (file.path && fs.existsSync(file.path)) {
            const rawBuffer = fs.readFileSync(file.path);
            const normalized = await ensureWebCompatibleImage(
              rawBuffer,
              file.mimetype,
              file.originalname
            );
            effectiveMime = normalized.mimeType;
            effectiveFilename = normalized.filename;
            effectiveSize = normalized.buffer.length;
            if (normalized.converted) {
              fs.writeFileSync(file.path, normalized.buffer);
              file.mimetype = normalized.mimeType;
              file.size = normalized.buffer.length;
            }
            base64Data = normalized.buffer.toString('base64');
          }
        } catch (e) {
          console.warn('Could not read/normalize image file for storage:', e);
        }

        // Fast initial heuristic categorization (<1ms) based on filename
        let initialCategory = 'other';
        const nameLower = effectiveFilename.toLowerCase();
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
          effectiveFilename,
          effectiveMime,
          null, // width (optional)
          null, // height (optional)
          effectiveSize,
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

        createdScreenshots.push({
          id: screenshotId,
          filename: effectiveFilename,
          storage_key: storageKey,
          category: initialCategory,
          status: 'processing',
        });
      }

      // Execute multimodal vision analysis immediately so results are ready without serverless freeze delay
      for (const item of createdScreenshots) {
        try {
          const matchFile = files.find(f => path.join(userId, f.filename).replace(/\\/g, '/') === item.storage_key);
          let base64 = null;
          if (matchFile?.path && fs.existsSync(matchFile.path)) {
            base64 = fs.readFileSync(matchFile.path).toString('base64');
          }
          await processScreenshotDirectly(
            item.id,
            userId,
            item.storage_key,
            matchFile?.mimetype || 'image/jpeg',
            item.filename,
            base64
          );
          item.status = 'ready';
        } catch (procErr) {
          console.warn(`Immediate processing notice for ${item.id}:`, procErr);
          // Fall back to queuing for persistent worker
          try {
            const matchFile = files.find(f => path.join(userId, f.filename).replace(/\\/g, '/') === item.storage_key);
            enqueueScreenshotJob({
              screenshotId: item.id,
              userId,
              storageKey: item.storage_key,
              mimeType: matchFile?.mimetype || 'image/jpeg',
              originalFilename: item.filename,
            });
          } catch {}
        }
      }

      res.status(201).json({
        message: `Successfully uploaded ${createdScreenshots.length} screenshots. Background analysis completed.`,
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

function safeJsonArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Vault Insights & Near-Duplicate Radar (registered before GET /:id)
router.get('/insights/summary', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email || userId;

    const rows = (await db.prepare(`
      SELECT id, original_filename, file_size, uploaded_at, category, ocr_text, visual_description, text_embedding, tags
      FROM screenshots
      WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
      ORDER BY uploaded_at DESC
    `).all(userId, userEmail)) as any[];

    const gameRows = (await db.prepare(`
      SELECT kills, rank, damage
      FROM game_results
      WHERE screenshot_id IN (
        SELECT id FROM screenshots WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
      )
    `).all(userId, userEmail)) as any[];

    const category_counts: Record<string, number> = {
      chat: 0,
      game: 0,
      product: 0,
      poster_document: 0,
      other: 0,
    };

    const TRACKED_COLORS = ['black', 'blue', 'white', 'red', 'green', 'yellow', 'pink', 'purple', 'grey', 'orange', 'brown'];
    const colorCounts = new Map<string, number>();

    const parsedItems = rows.map((r) => {
      const cat = r.category || 'other';
      category_counts[cat] = (category_counts[cat] || 0) + 1;
      const tags = safeJsonArray(r.tags).map((t: any) => String(t).toLowerCase());
      const desc = `${r.visual_description || ''} ${tags.join(' ')}`.toLowerCase();
      for (const c of TRACKED_COLORS) {
        if (new RegExp(`\\b${c}\\b`, 'i').test(desc)) {
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        }
      }
      return {
        ...r,
        parsedTags: tags,
        embedding: safeJsonArray(r.text_embedding) as number[],
      };
    });

    const top_colors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([color, count]) => ({ color, count }));

    let total_kills = 0;
    let best_kills = 0;
    let chicken_dinners = 0;
    for (const g of gameRows) {
      const k = Number(g.kills) || 0;
      total_kills += k;
      if (k > best_kills) best_kills = k;
      if (typeof g.rank === 'string' && /#?1\b|chicken|winner/i.test(g.rank)) {
        chicken_dinners++;
      }
    }

    // Detect near-duplicate candidates (keeps newest item in each group)
    const claimed = new Set<string>();
    const duplicate_groups: Array<{
      keep: { id: string; original_filename: string; file_size: number; uploaded_at: string };
      duplicates: Array<{ id: string; original_filename: string; file_size: number; uploaded_at: string; reason: string }>;
    }> = [];

    for (let i = 0; i < parsedItems.length; i++) {
      const a = parsedItems[i];
      if (claimed.has(a.id)) continue;

      const dupsForA: Array<{ id: string; original_filename: string; file_size: number; uploaded_at: string; reason: string }> = [];
      for (let j = i + 1; j < parsedItems.length; j++) {
        const b = parsedItems[j];
        if (claimed.has(b.id)) continue;

        const sameSize = a.file_size > 0 && a.file_size === b.file_size;
        const aOcr = (a.ocr_text || '').trim();
        const bOcr = (b.ocr_text || '').trim();
        const sameOcr = aOcr.length > 16 && aOcr === bOcr;
        const embSim = computeCosineSimilarity(a.embedding, b.embedding);

        if (sameSize && (sameOcr || a.original_filename === b.original_filename)) {
          dupsForA.push({
            id: b.id,
            original_filename: b.original_filename,
            file_size: b.file_size,
            uploaded_at: b.uploaded_at,
            reason: 'Identical file size & content',
          });
          claimed.add(b.id);
        } else if (embSim >= 0.95 && a.category === b.category && aOcr === bOcr && (a.visual_description || '') === (b.visual_description || '') && (a.visual_description || '').length > 12) {
          dupsForA.push({
            id: b.id,
            original_filename: b.original_filename,
            file_size: b.file_size,
            uploaded_at: b.uploaded_at,
            reason: `${Math.round(embSim * 100)}% visual match`,
          });
          claimed.add(b.id);
        }
      }

      if (dupsForA.length > 0) {
        claimed.add(a.id);
        duplicate_groups.push({
          keep: {
            id: a.id,
            original_filename: a.original_filename,
            file_size: a.file_size,
            uploaded_at: a.uploaded_at,
          },
          duplicates: dupsForA,
        });
      }
    }

    res.json({
      total: rows.length,
      category_counts,
      gaming: {
        matches: gameRows.length,
        total_kills,
        best_kills,
        chicken_dinners,
      },
      top_colors,
      duplicate_groups,
      duplicate_count: duplicate_groups.reduce((sum, g) => sum + g.duplicates.length, 0),
    });
  } catch (err: any) {
    console.error('Insights summary error:', err);
    res.status(500).json({ error: 'Failed to compute vault insights' });
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
    let screenshot = (await getScreenshot.get(id, userId, userEmail || userId)) as any;

    if (!screenshot) {
      res.status(404).json({ error: 'Screenshot not found or access denied' });
      return;
    }

    // Auto-analyze on-demand if status is still processing or visual description is missing
    if (screenshot.processing_status === 'processing' || !screenshot.visual_description) {
      try {
        await processScreenshotDirectly(
          screenshot.id,
          screenshot.user_id,
          screenshot.storage_key,
          screenshot.mime_type,
          screenshot.original_filename
        );
        screenshot = (await getScreenshot.get(id, userId, userEmail || userId)) as any;
      } catch (autoErr) {
        console.warn('Auto-processing on detail retrieval notice:', autoErr);
      }
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
    let imgBuffer: Buffer | null = null;
    if (fs.existsSync(fullPath)) {
      imgBuffer = fs.readFileSync(fullPath);
    } else if (row.image_data) {
      imgBuffer = Buffer.from(row.image_data, 'base64');
    }

    if (!imgBuffer) {
      res.status(404).json({ error: 'Image file does not exist on disk' });
      return;
    }

    // Self-heal legacy HEIC/HEIF images on-the-fly so non-Safari browsers always render them cleanly
    if (isHeicFormat(imgBuffer, row.mime_type)) {
      try {
        const converted = await ensureWebCompatibleImage(imgBuffer, row.mime_type);
        imgBuffer = converted.buffer;
        if (fs.existsSync(fullPath)) {
          try {
            fs.writeFileSync(fullPath, converted.buffer);
          } catch {}
        }
        try {
          await db
            .prepare('UPDATE screenshots SET mime_type = ?, file_size = ?, image_data = ?, updated_at = ? WHERE id = ?')
            .run(
              converted.mimeType,
              converted.buffer.length,
              converted.buffer.toString('base64'),
              new Date().toISOString(),
              id
            );
        } catch (persistErr) {
          console.warn('Could not persist converted JPEG back to DB:', persistErr);
        }
        res.setHeader('Content-Type', converted.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.send(converted.buffer);
        return;
      } catch (convErr) {
        console.error('On-the-fly HEIC conversion failed:', convErr);
      }
    }

    const contentType = detectImageMimeType(imgBuffer, row.mime_type);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(imgBuffer);
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

    await processScreenshotDirectly(
      id,
      userId,
      row.storage_key,
      row.mime_type,
      row.original_filename,
      row.image_data
    );

    const updated = (await getScreenshot.get(id, userId)) as any;
    const getMessages = db.prepare('SELECT * FROM extracted_messages WHERE screenshot_id = ? ORDER BY sequence_number ASC');
    const messages = (await getMessages.all(id)) as any[];

    const getGame = db.prepare('SELECT * FROM game_results WHERE screenshot_id = ?');
    const game = (await getGame.get(id)) as any;

    res.json({
      message: 'Screenshot re-analyzed successfully',
      screenshot: {
        ...updated,
        tags: updated.tags ? JSON.parse(updated.tags) : [],
      },
      messages: messages.map(m => ({
        ...m,
        bounding_box: m.bounding_box ? JSON.parse(m.bounding_box) : null,
      })),
      game_result: game || null,
    });
  } catch (err: any) {
    console.error('Re-analyze error:', err);
    res.status(500).json({ error: err.message || 'Failed to re-analyze screenshot' });
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

// Memory Lens: Visual Q&A directly on a specific photo or screenshot
router.post('/:id/ask', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email || '';
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';

    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const row = (await db.prepare(`
      SELECT * FROM screenshots
      WHERE id = ?
        AND (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `).get(req.params.id, userId, userEmail)) as any;

    if (!row) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    let parsedTags: string[] = [];
    if (Array.isArray(row.tags)) {
      parsedTags = row.tags;
    } else if (typeof row.tags === 'string') {
      try {
        const parsed = JSON.parse(row.tags);
        if (Array.isArray(parsed)) parsedTags = parsed;
      } catch {}
    }

    const filePath = path.join(UPLOADS_BASE, row.storage_key);
    const result = await answerImageQuestion(
      filePath,
      row.mime_type,
      row.original_filename,
      row.image_data,
      {
        visual_description: row.visual_description || '',
        ocr_text: row.ocr_text || '',
        tags: parsedTags,
      },
      question
    );

    res.json({
      screenshot_id: row.id,
      question,
      answer: result.answer,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error('Image Q&A error:', err);
    res.status(500).json({ error: 'Failed to answer question about this image', details: err.message });
  }
});

// Prompt-Guided AI Redaction: Locates exact coordinates matching the user's redaction instruction
router.post('/:id/ai-redact', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email || '';
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    const ocrWords = Array.isArray(req.body?.ocrWords) ? req.body.ocrWords : [];

    if (!instruction) {
      res.status(400).json({ error: 'Redaction instruction is required' });
      return;
    }

    const row = (await db.prepare(`
      SELECT * FROM screenshots
      WHERE id = ?
        AND (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `).get(req.params.id, userId, userEmail)) as any;

    if (!row) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    const filePath = path.join(UPLOADS_BASE, row.storage_key);
    const result = await detectAiRedactTargets(
      filePath,
      row.mime_type,
      row.original_filename,
      row.image_data,
      instruction,
      ocrWords
    );

    res.json({
      screenshot_id: row.id,
      instruction,
      targets: result.targets,
      summary: result.summary,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error('AI redact error:', err);
    res.status(500).json({ error: 'Failed to locate redaction targets', details: err.message });
  }
});

// Upgrade Vision Index: Batch re-analyze existing screenshots so older photos gain full visual_entities & tags
router.post('/batch/reanalyze-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email || '';

    const rows = (await db.prepare(`
      SELECT id, user_id, storage_key, mime_type, original_filename, image_data
      FROM screenshots
      WHERE user_id = ?
         OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != ''))
      ORDER BY created_at DESC
      LIMIT 25
    `).all(userId, userEmail)) as any[];

    let upgraded = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await processScreenshotDirectly(
          row.id,
          row.user_id,
          row.storage_key,
          row.mime_type,
          row.original_filename,
          row.image_data || undefined
        );
        upgraded++;
      } catch (e) {
        console.warn(`Batch reanalyze skipped ${row.id}:`, e);
        failed++;
      }
    }

    res.json({
      total: rows.length,
      upgraded,
      failed,
      message: `Upgraded visual recognition index for ${upgraded} of ${rows.length} image(s).`,
    });
  } catch (err: any) {
    console.error('Batch reanalyze error:', err);
    res.status(500).json({ error: 'Failed to upgrade vision index', details: err.message });
  }
});

// Find Visually & Semantically Similar Memories
router.get('/:id/similar', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email || userId;
    const { id } = req.params;

    const rows = (await db.prepare(`
      SELECT id, original_filename, mime_type, file_size, uploaded_at, category, processing_status, ocr_text, visual_description, text_embedding, tags, created_at, updated_at, storage_key
      FROM screenshots
      WHERE (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `).all(userId, userEmail)) as any[];

    const target = rows.find((r) => r.id === id);
    if (!target) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    const targetTags = new Set(safeJsonArray(target.tags).map((t: any) => String(t).toLowerCase()));
    const targetEmb = safeJsonArray(target.text_embedding) as number[];
    const targetWords = new Set(
      (target.visual_description || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
    );

    const candidates = rows
      .filter((r) => r.id !== id)
      .map((r) => {
        const candTags = safeJsonArray(r.tags).map((t: any) => String(t).toLowerCase());
        const candEmb = safeJsonArray(r.text_embedding) as number[];
        const embSim = computeCosineSimilarity(targetEmb, candEmb);
        const shared_tags = candTags.filter((t: string) => targetTags.has(t));
        const tagUnion = new Set([...targetTags, ...candTags]).size;
        const tagJaccard = tagUnion > 0 ? shared_tags.length / tagUnion : 0;

        let wordOverlap = 0;
        const candDesc = (r.visual_description || '').toLowerCase();
        targetWords.forEach((w) => {
          if (candDesc.includes(w)) wordOverlap++;
        });
        const descSim = targetWords.size > 0 ? wordOverlap / targetWords.size : 0;
        const catBonus = r.category === target.category ? 0.08 : 0;

        const similarity = Math.min(0.99, embSim * 0.45 + tagJaccard * 0.35 + descSim * 0.20 + catBonus);
        const is_duplicate =
          (target.file_size > 0 && r.file_size === target.file_size && (target.ocr_text || '') === (r.ocr_text || '')) ||
          similarity >= 0.92;

        return {
          screenshot: {
            ...r,
            tags: candTags,
          },
          similarity: Math.round(similarity * 100) / 100,
          shared_tags: shared_tags.slice(0, 4),
          is_duplicate,
        };
      })
      .filter((c) => c.similarity >= 0.32 || c.shared_tags.length >= 2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    res.json({ similar: candidates });
  } catch (err: any) {
    console.error('Similar screenshots error:', err);
    res.status(500).json({ error: 'Failed to find similar images' });
  }
});

// Smart Coach & Receipt/Safety Inspector
router.post('/:id/coach', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email || userId;
    const { id } = req.params;

    const row = (await db.prepare(`
      SELECT id, original_filename, category, ocr_text, visual_description, tags
      FROM screenshots
      WHERE id = ? AND (user_id = ? OR (user_id IN (SELECT id FROM users WHERE email = ? AND email IS NOT NULL AND email != '')))
    `).get(id, userId, userEmail)) as any;

    if (!row) {
      res.status(404).json({ error: 'Screenshot not found' });
      return;
    }

    const messages = (await db.prepare(`
      SELECT sender_side, sender_label, message_text
      FROM extracted_messages
      WHERE screenshot_id = ?
      ORDER BY sequence_number ASC
    `).all(id)) as any[];

    const gameResult = (await db.prepare('SELECT game_name, kills, rank, damage, map_name FROM game_results WHERE screenshot_id = ?').get(id)) as any;

    const insights = await generateSmartCoachInsights({
      category: row.category || 'other',
      original_filename: row.original_filename || 'image',
      visual_description: row.visual_description || '',
      ocr_text: row.ocr_text || '',
      tags: safeJsonArray(row.tags).map((t: any) => String(t)),
      messages,
      game_result: gameResult || null,
    });

    res.json({
      screenshot_id: row.id,
      ...insights,
    });
  } catch (err: any) {
    console.error('Smart coach error:', err);
    res.status(500).json({ error: 'Failed to generate smart insights', details: err.message });
  }
});

export default router;

