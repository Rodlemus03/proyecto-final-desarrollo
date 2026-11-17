import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { weakHash } from './hash';

export const authRouter = Router();

// Secreto débil y hardcodeado como fallback (A02/A04, CWE-798/CWE-521).
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

function toUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

// POST /api/auth/login
// Sin rate limiting ni bloqueo de cuenta (A07 / CWE-307): permite fuerza bruta.
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  const hashed = weakHash(String(password ?? ''));
  let row: any;
  try {
    row = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, hashed);
  } catch (err: any) {
    return res.status(500).json({ error: 'Error en la consulta' });
  }

  if (!row) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const user = toUser(row);
  const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET);

  // Cookie de sesión insegura: sin HttpOnly, sin Secure, sin SameSite (A02 / CWE-1004).
  res.cookie('session', token, { httpOnly: false, secure: false });

  res.json({ token, user });
});

export { JWT_SECRET };
