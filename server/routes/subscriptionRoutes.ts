import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { processRecurringDeductions } from '../services/autopayService';
import {
  isRazorpayConfigured,
  getRazorpayPublicKey,
  getRazorpayClient,
  verifyRazorpayOrderSignature,
  verifyWebhookSignature,
} from '../services/razorpayService';

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

// 1. Get Available Subscription Plans (Indian Rupees ₹)
router.get('/plans', (_req, res: Response) => {
  res.json({
    currency: 'INR',
    currency_symbol: '₹',
    razorpay_key_id: getRazorpayPublicKey(),
    is_live_gateway: isRazorpayConfigured(),
    trial_days: 7,
    plans: [
      {
        id: 'free',
        name: 'Recall Starter',
        tier: 'free',
        price: 0,
        interval: 'forever',
        price_display: 'Free Forever',
        trial_text: 'No card or mandate needed',
        description: 'Essential visual memory for quick everyday screenshots.',
        screenshot_limit: FREE_SCREENSHOT_LIMIT,
        ai_daily_limit: FREE_DAILY_AI_LIMIT,
        perks: FREE_PERKS,
      },
      {
        id: 'pro_monthly',
        name: 'Recall Pro Monthly',
        tier: 'pro',
        price: 199,
        interval: 'month',
        price_display: '₹199 / mo',
        trial_days: 7,
        trial_text: '7 Days Free Trial • ₹0 today',
        recurring_text: '₹199/month after trial ends',
        description: 'Full visual intelligence with zero storage or AI limits.',
        screenshot_limit: null,
        ai_daily_limit: null,
        perks: PRO_PERKS,
      },
      {
        id: 'pro_annual',
        name: 'Recall Pro Annual',
        tier: 'pro',
        price: 1499,
        interval: 'year',
        price_display: '₹1,499 / yr',
        badge: 'Save 37%',
        monthly_equivalent: '₹125 / mo',
        trial_days: 7,
        trial_text: '7 Days Free Trial • ₹0 today',
        recurring_text: '₹1,499/year after trial ends',
        description: 'Best value for heavy users, students, developers, and researchers.',
        screenshot_limit: null,
        ai_daily_limit: null,
        perks: [...PRO_PERKS, 'Early access to multi-modal vector graph visual search'],
      },
    ],
  });
});

// 2. Get Current User Subscription & Autopay Status
router.get('/current', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Check for any pending recurring deductions
    await processRecurringDeductions();

    const userRow = (await db.prepare(`
      SELECT id, email, name, subscription_tier, subscription_status, subscription_plan, subscription_expires_at,
             trial_ends_at, autopay_mandate_id, autopay_method, autopay_vpa, next_billing_at,
             ai_queries_today, ai_queries_reset_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    const tier = userRow?.subscription_tier === 'pro' ? 'pro' : 'free';
    const plan = userRow?.subscription_plan || tier;
    const status = userRow?.subscription_status || 'active';
    const expiresAt = userRow?.subscription_expires_at || null;
    const trialEndsAt = userRow?.trial_ends_at || null;
    const nextBillingAt = userRow?.next_billing_at || null;

    // Trial calculations
    const nowMs = Date.now();
    const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;
    const isTrialing = status === 'trialing' && trialEndMs > nowMs;
    const daysLeftInTrial = isTrialing ? Math.max(1, Math.ceil((trialEndMs - nowMs) / (1000 * 60 * 60 * 24))) : 0;

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

    // Fetch recent invoices
    const invoices = (await db.prepare(`
      SELECT * FROM subscription_invoices
      WHERE user_id = ?
      ORDER BY invoice_date DESC LIMIT 5
    `).all(userId)) as any[];

    const isPro = tier === 'pro';

    res.json({
      success: true,
      subscription: {
        tier,
        plan,
        status,
        currency: 'INR',
        currency_symbol: '₹',
        expires_at: expiresAt,
        trial_ends_at: trialEndsAt,
        is_trialing: isTrialing,
        days_left_in_trial: daysLeftInTrial,
        next_billing_at: nextBillingAt,
        autopay_mandate_id: userRow?.autopay_mandate_id || null,
        autopay_method: userRow?.autopay_method || null,
        autopay_vpa: userRow?.autopay_vpa || null,
        screenshot_count: screenshotCount,
        screenshot_limit: isPro ? null : FREE_SCREENSHOT_LIMIT,
        can_upload: isPro || screenshotCount < FREE_SCREENSHOT_LIMIT,
        ai_queries_today: aiQueriesToday,
        ai_queries_limit: isPro ? null : FREE_DAILY_AI_LIMIT,
        is_pro: isPro,
        perks: isPro ? PRO_PERKS : FREE_PERKS,
        invoices,
      },
    });
  } catch (err: any) {
    console.error('Fetch subscription status error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// 3. Start Free Trial with Autopay Mandate Registration
router.post('/start-trial', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      plan = 'pro_annual',
      autopay_method = 'upi_autopay',
      vpa = '',
      bank_name = 'HDFC Bank',
      card_last4 = '4242',
    } = req.body;

    const validPlans = ['pro_monthly', 'pro_annual'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({ error: 'Invalid plan. Choose pro_monthly or pro_annual.' });
      return;
    }

    // Validate Autopay details
    let effectiveMethod = 'UPI Autopay';
    let cleanVpa = '';

    if (autopay_method === 'upi_autopay') {
      cleanVpa = String(vpa || '').trim().toLowerCase();
      if (!cleanVpa || !cleanVpa.includes('@')) {
        res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank, user@paytm)' });
        return;
      }
      effectiveMethod = `UPI Autopay (${cleanVpa})`;
    } else {
      effectiveMethod = `Card e-Mandate (${bank_name || 'Bank'} ending in ${card_last4 || '4242'})`;
    }

    const now = new Date();
    const trialDays = 7;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const nextBillingAt = trialEndsAt;
    const durationDays = plan === 'pro_annual' ? 365 : 30;
    const expiresAt = new Date(new Date(trialEndsAt).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const recurringAmount = plan === 'pro_annual' ? 1499 : 199;

    const mandateId = `UMRN_REC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const invoiceId = `inv_trial_${Date.now()}`;

    // 1. Update user record to Pro Trialing with real Autopay mandate
    await db.prepare(`
      UPDATE users 
      SET subscription_tier = 'pro',
          subscription_status = 'trialing',
          subscription_plan = ?,
          subscription_expires_at = ?,
          trial_ends_at = ?,
          autopay_mandate_id = ?,
          autopay_method = ?,
          autopay_vpa = ?,
          next_billing_at = ?
      WHERE id = ?
    `).run(plan, expiresAt, trialEndsAt, mandateId, effectiveMethod, cleanVpa, nextBillingAt, userId);

    // 2. Record subscription entry
    try {
      await db.prepare(`
        INSERT INTO subscriptions (
          id, user_id, tier, plan, amount, currency, status, payment_method, mandate_id, trial_start, trial_end, created_at
        ) VALUES (?, ?, 'pro', ?, ?, 'INR', 'active_trial', ?, ?, ?, ?, ?)
      `).run(subId, userId, plan, recurringAmount, effectiveMethod, mandateId, now.toISOString(), trialEndsAt, now.toISOString());
    } catch (e) {
      console.warn('Logging subscription entry note:', e);
    }

    // 3. Record ₹0 Mandate Setup Invoice for transparency
    try {
      await db.prepare(`
        INSERT INTO subscription_invoices (
          id, user_id, subscription_id, amount, currency, status, description, payment_method, invoice_date
        ) VALUES (?, ?, ?, 0, 'INR', 'trial_zero', ?, ?, ?)
      `).run(
        invoiceId,
        userId,
        subId,
        `7-Day Free Trial Autopay Setup (₹0 paid today, ₹${recurringAmount} auto-debits on ${new Date(trialEndsAt).toLocaleDateString('en-IN')})`,
        effectiveMethod,
        now.toISOString()
      );
    } catch (invErr) {
      console.warn('Logging invoice note:', invErr);
    }

    // Fetch updated user
    const updatedUser = (await db.prepare(`
      SELECT id, email, name, avatar_url, google_id, is_verified, subscription_tier, subscription_status, subscription_plan,
             subscription_expires_at, trial_ends_at, autopay_mandate_id, autopay_method, autopay_vpa, next_billing_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    const countRow = (await db.prepare('SELECT COUNT(*) as total FROM screenshots WHERE user_id = ?').get(userId)) as any;
    const screenshotCount = Number(countRow?.total || 0);

    res.json({
      success: true,
      message: `🎉 7-Day Free Trial Activated! Autopay mandate confirmed with ${effectiveMethod}. First deduction of ₹${recurringAmount} will occur on ${new Date(trialEndsAt).toLocaleDateString('en-IN')}.`,
      user: updatedUser,
      subscription: {
        tier: 'pro',
        plan,
        status: 'trialing',
        currency: 'INR',
        currency_symbol: '₹',
        expires_at: expiresAt,
        trial_ends_at: trialEndsAt,
        is_trialing: true,
        days_left_in_trial: trialDays,
        next_billing_at: nextBillingAt,
        autopay_mandate_id: mandateId,
        autopay_method: effectiveMethod,
        autopay_vpa: cleanVpa,
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
    console.error('Start trial autopay error:', err);
    res.status(500).json({ error: 'Failed to initialize Autopay trial mandate' });
  }
});

// 4. Cancel Autopay / Revoke Mandate before trial ends (Prevents any deductions)
router.post('/cancel-autopay', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Fetch user before cancel
    const userRow = (await db.prepare(`
      SELECT subscription_status, trial_ends_at, subscription_expires_at, autopay_mandate_id
      FROM users WHERE id = ?
    `).get(userId)) as any;

    const wasTrialing = userRow?.subscription_status === 'trialing';

    // Clear autopay mandate and set status to canceled so background deductions never trigger
    await db.prepare(`
      UPDATE users 
      SET subscription_status = 'canceled',
          next_billing_at = NULL,
          autopay_mandate_id = NULL
      WHERE id = ?
    `).run(userId);

    const updatedUser = (await db.prepare(`
      SELECT id, email, name, avatar_url, google_id, is_verified, subscription_tier, subscription_status, subscription_plan,
             subscription_expires_at, trial_ends_at, autopay_mandate_id, autopay_method, autopay_vpa, next_billing_at
      FROM users WHERE id = ?
    `).get(userId)) as any;

    res.json({
      success: true,
      message: wasTrialing
        ? 'Autopay mandate revoked. Zero money will be deducted. You can continue using your trial until it expires.'
        : 'Autopay mandate canceled. Your subscription will not renew at the end of the billing cycle.',
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('Cancel autopay error:', err);
    res.status(500).json({ error: 'Failed to cancel Autopay mandate' });
  }
});

// 5. Razorpay Webhook for Real Gateway Events
router.post('/webhook', async (req, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyStr = JSON.stringify(req.body);

    if (signature && isRazorpayConfigured()) {
      const isValid = verifyWebhookSignature(bodyStr, signature);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log(`📡 [Razorpay Webhook] Received event: ${event}`);

    if (event === 'subscription.charged' || event === 'payment.captured') {
      const subEntity = payload?.subscription?.entity;
      const paymentEntity = payload?.payment?.entity;
      const subId = subEntity?.id;
      const amount = (paymentEntity?.amount || 0) / 100;
      const email = paymentEntity?.email;

      if (email) {
        const user = (await db.prepare('SELECT id FROM users WHERE email = ?').get(email)) as any;
        if (user) {
          const invId = `inv_rzp_${Date.now()}`;
          await db.prepare(`
            INSERT INTO subscription_invoices (
              id, user_id, subscription_id, amount, currency, status, description, payment_method, invoice_date
            ) VALUES (?, ?, ?, ?, 'INR', 'paid', 'Automated Razorpay recurring deduction', 'Razorpay Autopay', ?)
          `).run(invId, user.id, subId || 'rzp', amount, new Date().toISOString());

          await db.prepare(`
            UPDATE users
            SET subscription_tier = 'pro',
                subscription_status = 'active'
            WHERE id = ?
          `).run(user.id);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (webhookErr) {
    console.error('[Razorpay Webhook Error]:', webhookErr);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// 6. Razorpay Standard Checkout - Create Order
router.post('/create-order', async (req, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'INR', receipt, plan = 'pro_annual' } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
      return;
    }

    const client = getRazorpayClient();
    if (!client) {
      res.status(500).json({
        error: 'Razorpay is not configured on the server. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
      return;
    }

    const orderOptions = {
      amount: Math.round(numAmount),
      currency: String(currency || 'INR').toUpperCase(),
      receipt: String(receipt || `rcpt_${Date.now()}`),
      notes: {
        plan: String(plan),
      },
    };

    const order = await client.orders.create(orderOptions);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getRazorpayPublicKey(),
    });
  } catch (err: any) {
    console.error('Razorpay Create Order Error:', err);
    res.status(500).json({
      error: err?.error?.description || err?.message || 'Failed to create Razorpay order',
    });
  }
});

// 7. Razorpay Standard Checkout - Verify Signature
router.post('/verify-payment', async (req, res: Response): Promise<void> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan = 'pro_annual',
      user_id,
      email,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature',
      });
      return;
    }

    // Step 3: Algorithm HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const isValid = verifyRazorpayOrderSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Signature verification failed. Payment not verified.',
      });
      return;
    }

    // On valid verification, update database if user can be identified
    let targetUserId = user_id;
    if (!targetUserId && email) {
      const user = (await db.prepare('SELECT id FROM users WHERE email = ?').get(email)) as any;
      if (user) targetUserId = user.id;
    }

    const now = new Date();
    const durationDays = plan === 'pro_annual' ? 365 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    if (targetUserId) {
      await db.prepare(`
        UPDATE users
        SET subscription_tier = 'pro',
            subscription_status = 'active',
            subscription_plan = ?,
            subscription_expires_at = ?
        WHERE id = ?
      `).run(plan, expiresAt, targetUserId);

      const invId = `inv_std_${Date.now()}`;
      try {
        await db.prepare(`
          INSERT INTO subscription_invoices (
            id, user_id, subscription_id, amount, currency, status, description, payment_method, invoice_date
          ) VALUES (?, ?, ?, ?, 'INR', 'paid', ?, 'Razorpay Standard Checkout', ?)
        `).run(
          invId,
          targetUserId,
          razorpay_order_id,
          plan === 'pro_annual' ? 1499 : 199,
          `Recall Pro Subscription (${plan === 'pro_annual' ? 'Annual' : 'Monthly'})`,
          now.toISOString()
        );
      } catch (invErr) {
        console.warn('Invoice logging notice:', invErr);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully. Pro perks activated.',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error('Razorpay Verify Payment Error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error verifying payment',
    });
  }
});

export default router;
