import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'recall_super_secret_jwt_key_2026_dev';

// Register User
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkUser.get(email.toLowerCase().trim());

    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const created_at = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run(id, email.toLowerCase().trim(), password_hash, name.trim(), created_at);

    const token = jwt.sign({ id, email: email.toLowerCase().trim(), name: name.trim() }, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id, email: email.toLowerCase().trim(), name: name.trim() },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login User
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(email.toLowerCase().trim()) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Demo One-Click Login for immediate testing
router.post('/demo', async (_req: Request, res: Response): Promise<void> => {
  try {
    const demoEmail = 'alex@recall-search.dev';
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    let user = getUser.get(demoEmail) as any;

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('recallDemo2026', salt);
      const id = 'user_demo_primary';
      const created_at = new Date().toISOString();

      const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertUser.run(id, demoEmail, password_hash, 'Alex Mercer', created_at);
      user = { id, email: demoEmail, name: 'Alex Mercer' };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in as Demo User',
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Failed to create demo session' });
  }
});

// Get Current User Profile
router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;

