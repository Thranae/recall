import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const FREE_SCREENSHOT_LIMIT = 50;
const FREE_DAILY_AI_LIMIT = 5;

const PRO_PERKS = [
  'Unlimited screenshot vault storage',
  'Unlimited Apple-style Visual Look-Up interactive pins',
  'Unlimited multi-turn Gemini AI screenshot chat',
  'Multi-screenshot conversation thread stitcher',
  'One-tap AI clutter sweeper & duplicate cleanup',
  'Turbo edge cloud OCR & neural semantic indexing',
  'Private biometric & PIN-locked secret albums',
  'Full high-res text, Markdown & PDF export',
];

const FREE_PERKS = [
  'Up to 50 screenshots vault storage',
  'Full-text on-device OCR search',
  '5 AI Visual Look-Up queries & chat per day',
  'Auto-category detection (Chats, Code, Notes, Products)',
  'Standard smart albums',
];

// 1. Get Available Subscription Plans
router.get('/plans', (_req, res: Response) => {
  res.json({
    currency: 'USD',
    plans: [
      {
        id: 'free',
        name: 'Recall Starter',
        tier: 'free',
        price: 0,
        interval: 'forever',
        price_display: 'Free Forever',
        description: 'Essential visual memory for quick everyday screenshots.',
        screenshot_limit: FREE_SCREENSHOT_LIMIT,
        ai_daily_limit: FREE_DAILY_AI_LIMIT,
        perks: FREE_PERKS,
      },
      {
        id: 'pro_monthly',
        name: 'Recall Pro Monthly',
        tier: 'pro',
        price: 4.99,
        interval: 'month',
        price_display: '$4.99 / mo',
        description: 'Complete visual intelligence with zero storage or AI limits.',
        screenshot_limit: null,
        ai_daily_limit: null,
        perks: PRO_PERKS,
      },
      {
        id: 'pro_annual',
        name: 'Recall Pro Annual',
        tier: 'pro',
        price: 39.99,
        interval: 'year',
        price_display: '$39.99 / yr',
        badge: 'Save 33%',
        monthly_equivalent: '$3.33 / mo',
        description: 'Best value for heavy users, students, developers, and researchers.',
        screenshot_limit: null,
        ai_daily_limit: null,
        perks: [...PRO_PERKS, 'Early access to multi-modal vector graph visual search'],
      },
    ],
  });
});

// 2. Get Current User Subscription Status
router.get('/current', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const userRow = (await db.prepare(`
      SELECT id, email, name, subscription_tier, subscription_status, subscription_plan, subscription_expires_at, ai_queries_today, ai_queries_reset_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    const tier = userRow?.subscription_tier === 'pro' ? 'pro' : 'free';
    const plan = userRow?.subscription_plan || tier;
    const status = userRow?.subscription_status || 'active';
    const expiresAt = userRow?.subscription_expires_at || null;

    // Daily AI query reset logic
    const todayStr = new Date().toISOString().slice(0, 10);
    let aiQueriesToday = Number(userRow?.ai_queries_today || 0);
    if (userRow?.ai_queries_reset_at !== todayStr) {
      aiQueriesToday = 0;
      await db.prepare('UPDATE users SET ai_queries_today = 0, ai_queries_reset_at = ? WHERE id = ?').run(todayStr, userId);
    }

    // Count user's current screenshots
    const countRow = (await db.prepare('SELECT COUNT(*) as total FROM screenshots WHERE user_id = ?').get(userId)) as any;
    const screenshotCount = Number(countRow?.total || 0);

    const isPro = tier === 'pro';

    res.json({
      success: true,
      subscription: {
        tier,
        plan,
        status,
        expires_at: expiresAt,
        screenshot_count: screenshotCount,
        screenshot_limit: isPro ? null : FREE_SCREENSHOT_LIMIT,
        can_upload: isPro || screenshotCount < FREE_SCREENSHOT_LIMIT,
        ai_queries_today: aiQueriesToday,
        ai_queries_limit: isPro ? null : FREE_DAILY_AI_LIMIT,
        is_pro: isPro,
        perks: isPro ? PRO_PERKS : FREE_PERKS,
      },
    });
  } catch (err: any) {
    console.error('Fetch subscription status error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// 3. Upgrade to Recall Pro (Supports simulated payment / instant unlock)
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { plan = 'pro_annual', payment_method = 'card_instant' } = req.body;

    const validPlans = ['pro_monthly', 'pro_annual'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ error: 'Invalid subscription plan. Choose pro_monthly or pro_annual.' });
      return;
    }

    const durationDays = plan === 'pro_annual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const amount = plan === 'pro_annual' ? 39.99 : 4.99;
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Update user record
    await db.prepare(`
      UPDATE users 
      SET subscription_tier = 'pro',
          subscription_status = 'active',
          subscription_plan = ?,
          subscription_expires_at = ?
      WHERE id = ?
    `).run(plan, expiresAt, userId);

    // Log to subscriptions table
    try {
      await db.prepare(`
        INSERT INTO subscriptions (id, user_id, tier, plan, amount, currency, status, payment_method, created_at)
        VALUES (?, ?, 'pro', ?, ?, 'USD', 'completed', ?, ?)
      `).run(subId, userId, plan, amount, payment_method, now);
    } catch (subErr) {
      console.warn('Logging subscription entry note:', subErr);
    }

    // Retrieve fresh user record
    const updatedUser = (await db.prepare(`
      SELECT id, email, name, avatar_url, google_id, is_verified, subscription_tier, subscription_status, subscription_plan, subscription_expires_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    const countRow = (await db.prepare('SELECT COUNT(*) as total FROM screenshots WHERE user_id = ?').get(userId)) as any;
    const screenshotCount = Number(countRow?.total || 0);

    res.json({
      success: true,
      message: '🎉 Congratulations! You have unlocked Recall Pro.',
      user: updatedUser,
      subscription: {
        tier: 'pro',
        plan,
        status: 'active',
        expires_at: expiresAt,
        screenshot_count: screenshotCount,
        screenshot_limit: null,
        can_upload: true,
        ai_queries_today: 0,
        ai_queries_limit: null,
        is_pro: true,
        perks: PRO_PERKS,
      },
    });
  } catch (err: any) {
    console.error('Upgrade subscription error:', err);
    res.status(500).json({ error: 'Failed to process upgrade' });
  }
});

// 4. Cancel / Manage Subscription
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Mark subscription status as canceled but keep pro until expiration
    await db.prepare(`
      UPDATE users 
      SET subscription_status = 'canceled'
      WHERE id = ?
    `).run(userId);

    const updatedUser = (await db.prepare(`
      SELECT id, email, name, avatar_url, google_id, is_verified, subscription_tier, subscription_status, subscription_plan, subscription_expires_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    res.json({
      success: true,
      message: 'Subscription has been canceled. Your Pro benefits remain active until the end of your billing cycle.',
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// 5. Restore In-App Purchases (for iOS / Android Capacitor compatibility)
router.post('/restore', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const existingSub = (await db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND status = 'completed' 
      ORDER BY created_at DESC LIMIT 1
    `).get(userId)) as any;

    if (existingSub) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.prepare(`
        UPDATE users 
        SET subscription_tier = 'pro',
            subscription_status = 'active',
            subscription_plan = ?,
            subscription_expires_at = ?
        WHERE id = ?
      `).run(existingSub.plan || 'pro_monthly', expiresAt, userId);

      res.json({
        success: true,
        message: 'Prior Recall Pro purchase restored successfully.',
        tier: 'pro',
      });
      return;
    }

    res.json({
      success: false,
      message: 'No active prior subscriptions found for this account.',
    });
  } catch (err: any) {
    console.error('Restore subscription error:', err);
    res.status(500).json({ error: 'Failed to restore purchases' });
  }
});

export default router;
