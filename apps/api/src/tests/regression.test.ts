import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { db } from '../db';

const app = createApp();
const SECRET = process.env.JWT_SECRET ?? 'test-secret-123';

function viewerToken() {
  const viewer = db.prepare('SELECT * FROM users WHERE username=?').get('viewer') as any;
  return jwt.sign({ sub: viewer.id, username: viewer.username, role: viewer.role }, SECRET);
}

function adminTicketId(): number {
  return (db.prepare('SELECT id FROM tickets LIMIT 1').get() as any).id;
}

// ── PoC-02: SQLi en login ──────────────────────────────────────────────────
describe('PoC-02 SQLi en login (regresión)', () => {
  it('debe rechazar username con inyección SQL', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: "admin' OR 1=1 --", password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('permite el ingreso con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'viewer', password: 'viewer' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('viewer');
  });
});

// ── PoC-01: JWT con firma inválida ─────────────────────────────────────────
describe('PoC-01 JWT con firma inválida (regresión)', () => {
  it('debe rechazar token con firma adulterada', async () => {
    const legitToken = viewerToken();
    const [header] = legitToken.split('.');
    // Payload con role:admin
    const fakePayload = Buffer.from(JSON.stringify({ sub: 999, username: 'hacker', role: 'admin', iat: 1 }))
      .toString('base64url');
    const forged = `${header}.${fakePayload}.firma_invalida`;

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${forged}`);
    // Tras el fix: 401. Antes del fix: 200 (token aceptado sin verificar firma).
    expect(res.status).toBe(401);
  });
});

// ── PoC-03: IDOR en tickets ────────────────────────────────────────────────
describe('PoC-03 IDOR en tickets (regresión)', () => {
  it('viewer no debe poder leer ticket que no le pertenece', async () => {
    const token = viewerToken();
    const ticketId = adminTicketId();

    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`);
    // Tras el fix: 403. Antes del fix: 200 (cualquier usuario lee cualquier ticket).
    expect(res.status).toBe(403);
  });

  it('admin conserva acceso al ticket', async () => {
    const admin = db.prepare('SELECT * FROM users WHERE username=?').get('admin') as any;
    const token = jwt.sign({ sub: admin.id, username: admin.username, role: admin.role }, SECRET);
    const res = await request(app)
      .get(`/api/tickets/${adminTicketId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(adminTicketId());
  });
});
