import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { executeHybridSearch } from '../services/searchEngine';

const router = Router();

// POST /api/search - Natural Language & Filtered Hybrid Retrieval
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { query, category, minKills, maxKills } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query string is required' });
      return;
    }

    const searchResponse = await executeHybridSearch(userId, query, {
      category: category || 'all',
      minKills,
      maxKills,
    });

    res.json(searchResponse);
  } catch (err: any) {
    console.error('Search endpoint error:', err);
    res.status(500).json({ error: 'Search execution failed' });
  }
});

export default router;
