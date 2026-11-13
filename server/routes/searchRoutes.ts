import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { executeHybridSearch } from '../services/searchEngine';
import { synthesizeVaultAnswer } from '../services/ai/gemini';
import { authMiddleware as ensureAuth, AuthRequest as VaultAuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/search - Natural Language & Filtered Hybrid Retrieval
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;
    const { query, category, minKills, maxKills } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query string is required' });
      return;
    }

    const searchResponse = await executeHybridSearch(userId, query, {
      category: category || 'all',
      minKills,
      maxKills,
    }, userEmail);

    res.json(searchResponse);
  } catch (err: any) {
    console.error('Search endpoint error:', err);
    res.status(500).json({ error: 'Search execution failed' });
  }
});

// GET /api/search?q=... or ?query=...
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user?.email;
    const query = (req.query.q as string) || (req.query.query as string);
    const category = req.query.category as string;
    const minKills = req.query.minKills ? Number(req.query.minKills) : undefined;
    const maxKills = req.query.maxKills ? Number(req.query.maxKills) : undefined;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query string is required' });
      return;
    }

    const searchResponse = await executeHybridSearch(userId, query, {
      category: category || 'all',
      minKills,
      maxKills,
    }, userEmail);

    res.json(searchResponse);
  } catch (err: any) {
    console.error('Search endpoint error:', err);
    res.status(500).json({ error: 'Search execution failed' });
  }
});

router.post('/ask', ensureAuth, async (req: VaultAuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const category = typeof req.body?.category === 'string' ? req.body.category : 'all';

    if (!query) {
      res.status(400).json({ error: 'Search question is required' });
      return;
    }

    const searchResponse = await executeHybridSearch(userId, query, { category });
    const topItems = searchResponse.results.slice(0, 6).map((item: any) => {
      const sc = item.screenshot;
      let parsedTags: string[] = [];
      if (Array.isArray(sc.tags)) {
        parsedTags = sc.tags;
      } else if (typeof sc.tags === 'string') {
        try {
          const t = JSON.parse(sc.tags);
          if (Array.isArray(t)) parsedTags = t;
        } catch {}
      }
      return {
        id: sc.id,
        filename: sc.original_filename || 'image',
        category: sc.category || 'other',
        visual_description: sc.visual_description || '',
        ocr_text: sc.ocr_text || '',
        tags: parsedTags,
        matched_game: item.matched_game || null,
        matched_messages: item.matched_messages || [],
      };
    });

    const synthesis = await synthesizeVaultAnswer(query, topItems);
    res.json({
      ...searchResponse,
      ai_answer: synthesis,
    });
  } catch (err: any) {
    console.error('Vault Ask AI error:', err);
    res.status(500).json({ error: 'Failed to synthesize AI answer', details: err.message });
  }
});

export default router;

