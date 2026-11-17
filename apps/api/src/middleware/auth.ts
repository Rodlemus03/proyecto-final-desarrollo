import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { recordSecurityEvent } from '../security-log';

export interface AuthedRequest extends Request {
  user?: { sub: number; username: string; role: string };
}

// H4: la firma se valida antes de confiar en la identidad y el rol del token.
export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || (req as any).cookies?.session;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid signature') {
      recordSecurityEvent(req, 'jwt_invalid_signature');
    }
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.user = { sub: payload.sub, username: payload.username, role: payload.role };
  next();
}
