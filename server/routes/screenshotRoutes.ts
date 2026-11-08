import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { enqueueScreenshotJob } from '../services/processingQueue';

const router = Router();

const UPLOADS_BASE = path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads');
if (!fs.existsSync(UPLOADS_BASE)) {
  fs.mkdirSync(UPLOADS_BASE, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(UPLOADS_BASE, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP) are supported'));
    }
  },
});

// 1. Upload Screenshots (Single or Multiple)
router.post(
  '/upload',
  authMiddleware,
  upload.array('screenshots', 15),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No screenshot files uploaded' });
        return;
      }

      const userId = req.user!.id;
      const createdScreenshots = [];

      for (const file of files) {
        const screenshotId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const storageKey = path.join(userId, file.filename).replace(/\\/g, '/');
        const now = new Date().toISOString();

        const insertStmt = db.prepare(`
          INSERT INTO screenshots (
            id, user_id, storage_key, original_filename, mime_type, width, height, file_size,
            captured_at, uploaded_at, category, processing_status, processing_error,
            ocr_text, visual_description, text_embedding, tags, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
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
          'other', // temporary until analysis completes
          'queued',
          null,
          '',
          '',
          null,
          '[]',
          now,
          now
        );

        // Enqueue background processing job
        enqueueScreenshotJob({
          screenshotId,
          userId,
          storageKey,
          mimeType: file.mimetype,
          originalFilename: file.originalname,
        });

        createdScreenshots.push({
          id: screenshotId,
          filename: file.originalname,
          storage_key: storageKey,
          status: 'queued',
        });
      }

      res.status(201).json({
        message: `Successfully uploaded ${createdScreenshots.length} screenshots. Processing queued.`,
        screenshots: createdScreenshots,
      });
    } catch (err: any) {
      console.error('Upload handler error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload screenshot' });
    }
  }
);

// 2. List Screenshots for Authenticated User
router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    let sql = 'SELECT * FROM screenshots WHERE user_id = ?';
    const params: any[] = [userId];

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
    const rows = stmt.all(...params) as any[];

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
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const getScreenshot = db.prepare('SELECT * FROM screenshots WHERE id = ? AND user_id = ?');
    const screenshot = getScreenshot.get(id, userId) as any;

    if (!screenshot) {
      res.status(404).json({ error: 'Screenshot not found or access denied' });
      return;
    }

    const getMessages = db.prepare(`
      SELECT * FROM extracted_messages 
      WHERE screenshot_id = ? AND user_id = ? 
      ORDER BY sequence_number ASC
    `);
    const messages = getMessages.all(id, userId) as any[];

    const getGame = db.prepare('SELECT * FROM game_results WHERE screenshot_id = ? AND user_id = ?');
    const game = getGame.get(id, userId) as any;

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
router.get('/image/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const getScreenshot = db.prepare('SELECT storage_key, mime_type FROM screenshots WHERE id = ? AND user_id = ?');
    const row = getScreenshot.get(id, userId) as any;

    if (!row) {
      res.status(404).json({ error: 'Image not found or access denied' });
      return;
    }

    const fullPath = path.join(UPLOADS_BASE, row.storage_key);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Image file does not exist on disk' });
      return;
    }

    res.setHeader('Content-Type', row.mime_type || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
  } catch (err: any) {
    console.error('Image streaming error:', err);
    res.status(500).json({ error: 'Failed to stream image' });
  }
});

// 5. Update Editable Metadata (User Corrections)
router.patch('/:id/metadata', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { category, visual_description, tags } = req.body;

    const getScreenshot = db.prepare('SELECT id FROM screenshots WHERE id = ? AND user_id = ?');
    const existing = getScreenshot.get(id, userId);

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

    updateStmt.run(
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
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const getScreenshot = db.prepare('SELECT storage_key FROM screenshots WHERE id = ? AND user_id = ?');
    const row = getScreenshot.get(id, userId) as any;

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
    deleteScreenshot.run(id, userId);

    try {
      const deleteFts = db.prepare('DELETE FROM screenshots_fts WHERE screenshot_id = ? AND user_id = ?');
      deleteFts.run(id, userId);
    } catch {}

    res.json({ message: 'Screenshot and derived records deleted successfully' });
  } catch (err: any) {
    console.error('Delete screenshot error:', err);
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

export default router;
