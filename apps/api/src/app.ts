import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './auth';
import { ticketsRouter } from './routes/tickets';
import { usersRouter } from './routes/users';
import { dashboardRouter } from './routes/dashboard';

export function createApp() {
  const app = express();

  app.use(cors({ origin: (_origin, cb) => cb(null, true), credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'secure-crm-api' }));
  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Error interno del servidor', message: err?.message, stack: err?.stack });
  });

  return app;
}
