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
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Google Sign-In Route (Supports Google Credential JWT or OAuth profile payload)
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, email, name, picture, sub } = req.body;

    let userEmail = email ? String(email).toLowerCase().trim() : '';
    let userName = name ? String(name).trim() : '';
    let userAvatar = picture || '';
    let googleId = sub || '';

    // If client provided a Google ID token credential, decode it
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) userEmail = payload.email.toLowerCase().trim();
          if (payload.name) userName = payload.name.trim();
          if (payload.picture) userAvatar = payload.picture;
          if (payload.sub) googleId = payload.sub;
        }
      } catch (decodeErr) {
        console.warn('Failed to parse Google JWT payload:', decodeErr);
      }
    }

    if (!userEmail) {
      res.status(400).json({ error: 'Valid Google account email is required' });
      return;
    }

    if (!userName) {
      userName = userEmail.split('@')[0];
    }

    // Check if user already exists
    const getUser = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?');
    let user = getUser.get(userEmail, googleId || 'none') as any;

    if (!user) {
      const id = `user_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const created_at = new Date().toISOString();
      const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, google_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertUser.run(id, userEmail, '', userName, userAvatar, googleId, created_at);
      user = { id, email: userEmail, name: userName, avatar_url: userAvatar, google_id: googleId };
    } else {
      if (userAvatar && user.avatar_url !== userAvatar) {
        const updateAvatar = db.prepare('UPDATE users SET avatar_url = ?, google_id = COALESCE(google_id, ?) WHERE id = ?');
        updateAvatar.run(userAvatar, googleId, user.id);
        user.avatar_url = userAvatar;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Signed in with Google successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Google authentication error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Get Current User Profile
router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;

