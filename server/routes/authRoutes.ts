import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendOtpEmail } from '../services/emailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'recall_super_secret_jwt_key_2026_dev';

function generateSixDigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// 1. Signup / Registration with 6-Digit OTP Email Verification (Packwise Standard)
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const checkUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const existing = checkUser.get(normalizedEmail) as any;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const otp = generateSixDigitOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    let userId: string;
    if (existing) {
      // Re-use user account, update details, new password hash, and new 6-digit OTP
      userId = existing.id;
      const updateUser = db.prepare(`
        UPDATE users 
        SET name = ?, password_hash = ?, otp_code = ?, otp_expires = ?
        WHERE id = ?
      `);
      updateUser.run(name.trim(), password_hash, otp, otpExpires, userId);
    } else {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const created_at = new Date().toISOString();
      const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, is_verified, otp_code, otp_expires, created_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?)
      `);
      insertUser.run(userId, normalizedEmail, password_hash, name.trim(), otp, otpExpires, created_at);
    }

    // Send real verification email and await before responding (critical for serverless execution)
    let emailSent = false;
    try {
      emailSent = await sendOtpEmail(normalizedEmail, otp, 'signup');
    } catch (err) {
      console.error('[Auth Signup] Email delivery failed:', err);
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Verification code generated. Please check your inbox or use the instant code below.',
      email: normalizedEmail,
      email_sent: emailSent,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to process signup' });
  }
});

// Legacy /register alias redirecting to signup behavior for backwards compatibility
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  // If request contains isDirectRegistration flag, preserve direct registration
  if (req.body.direct) {
    try {
      const { email, password, name } = req.body;
      const normalizedEmail = email.toLowerCase().trim();
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const created_at = new Date().toISOString();

      const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, is_verified, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `);
      insertUser.run(id, normalizedEmail, password_hash, name.trim(), created_at);

      const token = jwt.sign({ id, email: normalizedEmail, name: name.trim() }, JWT_SECRET, {
        expiresIn: '30d',
      });

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { id, email: normalizedEmail, name: name.trim() },
      });
      return;
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create account' });
      return;
    }
  }

  // Forward to /signup handler
  const { email, password, name } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  const otp = generateSixDigitOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const created_at = new Date().toISOString();

  try {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, is_verified, otp_code, otp_expires, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `);
    insertUser.run(id, normalizedEmail, password_hash, name.trim(), otp, otpExpires, created_at);
    let emailSent = false;
    try {
      emailSent = await sendOtpEmail(normalizedEmail, otp, 'signup');
    } catch (err) {
      console.error('[Auth Register] Email delivery failed:', err);
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
      email: normalizedEmail,
      email_sent: emailSent,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'User already exists or registration failed' });
  }
});

// 2. Verify Signup OTP
router.post('/verify-signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and 6-digit OTP are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(normalizedEmail) as any;

    if (!user) {
      res.status(404).json({ error: 'Account does not exist. Please sign up first.' });
      return;
    }

    if (!user.otp_code || !user.otp_expires) {
      res.status(400).json({ error: 'No verification code requested or already verified.' });
      return;
    }

    const expiresTime = new Date(user.otp_expires).getTime();
    if (Date.now() > expiresTime) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    if (user.otp_code !== cleanOtp) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    // Mark verified and clear OTP
    const verifyUser = db.prepare(`
      UPDATE users 
      SET is_verified = 1, otp_code = NULL, otp_expires = NULL 
      WHERE id = ?
    `);
    verifyUser.run(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to RECALL.',
      token,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        },
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// 3. Resend OTP
router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(normalizedEmail) as any;

    if (!user) {
      res.status(404).json({ error: 'Account not found with this email' });
      return;
    }

    const otp = generateSixDigitOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const updateOtp = db.prepare('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?');
    updateOtp.run(otp, otpExpires, user.id);

    let emailSent = false;
    try {
      emailSent = await sendOtpEmail(normalizedEmail, otp, 'signup');
    } catch (err) {
      console.error('[Auth Resend] Email delivery failed:', err);
    }

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.',
      email_sent: emailSent,
    });
  } catch (err: any) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// 4. Forgot Password / Request Login OTP
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(normalizedEmail) as any;

    if (!user) {
      res.status(404).json({ error: 'No account registered with this email address.' });
      return;
    }

    const otp = generateSixDigitOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const updateOtp = db.prepare('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?');
    updateOtp.run(otp, otpExpires, user.id);

    let emailSent = false;
    try {
      emailSent = await sendOtpEmail(normalizedEmail, otp, 'reset');
    } catch (err) {
      console.error('[Auth Forgot] Email delivery failed:', err);
    }

    res.json({
      success: true,
      message: 'Password reset code has been sent to your email.',
      email_sent: emailSent,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// 5. Verify OTP for Passwordless Sign-in / Reset
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and 6-digit OTP code are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(normalizedEmail) as any;

    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (!user.otp_code || !user.otp_expires) {
      res.status(400).json({ error: 'No pending verification code found for this account' });
      return;
    }

    if (Date.now() > new Date(user.otp_expires).getTime()) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    if (user.otp_code !== cleanOtp) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    // Verified: clear OTP and set is_verified to 1
    const updateUser = db.prepare('UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?');
    updateUser.run(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Identity verified successfully',
      token,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      },
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// 6. Login User
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(normalizedEmail) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || '');
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // If account was created via signup but not verified yet, send a fresh OTP and prompt verification
    if (user.is_verified === 0) {
      const otp = generateSixDigitOtp();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const updateOtp = db.prepare('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?');
      updateOtp.run(otp, otpExpires, user.id);
      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp, 'signup');
      } catch (err) {
        console.error('[Auth Login] Email delivery failed:', err);
      }

      res.status(403).json({
        error: 'Email not verified yet. We just sent a fresh 6-digit code to your inbox.',
        requires_verification: true,
        email: normalizedEmail,
        email_sent: emailSent,
      });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      },
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// 7. Google Sign-In Route (Supports Packwise tokenId OAuth access token and GSI ID Token JWT)
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId, credential, email, name, picture, sub } = req.body;

    let userEmail = email ? String(email).toLowerCase().trim() : '';
    let userName = name ? String(name).trim() : '';
    let userAvatar = picture || '';
    let googleId = sub || '';

    // If client supplied Google OAuth Access Token (Packwise approach: { tokenId: access_token })
    const accessToken = tokenId || (req.headers.authorization?.startsWith('Bearer ya29.') ? req.headers.authorization.slice(7) : null);
    if (accessToken && typeof accessToken === 'string' && accessToken.length > 20) {
      try {
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (googleRes.ok) {
          const profile: any = await googleRes.json();
          if (profile.email) userEmail = profile.email.toLowerCase().trim();
          if (profile.name) userName = profile.name.trim();
          if (profile.picture) userAvatar = profile.picture;
          if (profile.sub) googleId = profile.sub;
        } else {
          console.warn('Google userinfo fetch responded with status:', googleRes.status);
        }
      } catch (oauthErr) {
        console.warn('Google OAuth token verification failed:', oauthErr);
      }
    }

    // If client provided a Google ID token credential (JWT)
    if (!userEmail && credential && typeof credential === 'string') {
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
    const getUser = db.prepare('SELECT * FROM users WHERE email = ? OR (google_id IS NOT NULL AND google_id = ?)');
    let user = getUser.get(userEmail, googleId || 'none') as any;

    if (!user) {
      const id = `user_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const created_at = new Date().toISOString();
      const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, google_id, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `);
      insertUser.run(id, userEmail, '', userName, userAvatar, googleId, created_at);
      user = { id, email: userEmail, name: userName, avatar_url: userAvatar, google_id: googleId, is_verified: 1 };
    } else {
      const updateStmt = db.prepare(`
        UPDATE users 
        SET avatar_url = COALESCE(?, avatar_url),
            google_id = COALESCE(?, google_id),
            is_verified = 1
        WHERE id = ?
      `);
      updateStmt.run(userAvatar || user.avatar_url, googleId || user.google_id, user.id);
      if (userAvatar) user.avatar_url = userAvatar;
      if (googleId) user.google_id = googleId;
      user.is_verified = 1;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Signed in with Google successfully',
      token,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        },
      },
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

// 8. Get Current User Profile
router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
