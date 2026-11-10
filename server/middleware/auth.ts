import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'recall_super_secret_jwt_key_2026_dev';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  // Allow token via Authorization header OR query param for image streams
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;

    // Self-healing user persistence across serverless container cold starts
    if (decoded?.id) {
      try {
        const checkUser = db.prepare('SELECT id, email FROM users WHERE id = ?');
        const userExists = checkUser.get(decoded.id) as any;
        if (!userExists) {
          if (decoded.email) {
            const checkEmail = db.prepare('SELECT id FROM users WHERE email = ?');
            const existingByEmail = checkEmail.get(decoded.email) as any;
            if (existingByEmail) {
              // Reconcile user ID across instances so user's existing screenshots remain accessible
              try {
                db.prepare('UPDATE screenshots SET user_id = ? WHERE user_id = ?').run(decoded.id, existingByEmail.id);
                db.prepare('UPDATE extracted_messages SET user_id = ? WHERE user_id = ?').run(decoded.id, existingByEmail.id);
                db.prepare('UPDATE game_results SET user_id = ? WHERE user_id = ?').run(decoded.id, existingByEmail.id);
              } catch {}
              db.prepare('UPDATE users SET id = ?, name = COALESCE(?, name) WHERE email = ?')
                .run(decoded.id, decoded.name || null, decoded.email);
            } else {
              const insertUser = db.prepare(`
                INSERT OR REPLACE INTO users (id, email, password_hash, name, is_verified, created_at)
                VALUES (?, ?, '', ?, 1, ?)
              `);
              insertUser.run(
                decoded.id,
                decoded.email,
                decoded.name || 'Recall User',
                new Date().toISOString()
              );
            }
          } else {
            const insertUser = db.prepare(`
              INSERT OR REPLACE INTO users (id, email, password_hash, name, is_verified, created_at)
              VALUES (?, ?, '', ?, 1, ?)
            `);
            insertUser.run(
              decoded.id,
              `${decoded.id}@recall.local`,
              decoded.name || 'Recall User',
              new Date().toISOString()
            );
          }
        }
      } catch (dbErr) {
        console.warn('Could not ensure user record in DB:', dbErr);
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Token is invalid or expired' });
  }
}

