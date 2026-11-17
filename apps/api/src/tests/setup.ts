import { db, initSchema } from '../db';
import { weakHash } from '../hash';

initSchema();

// Seed usuarios de prueba
db.prepare('DELETE FROM tickets').run();
db.prepare('DELETE FROM users').run();

const insert = db.prepare(
  `INSERT INTO users (username, email, full_name, role, password_hash)
   VALUES (@username, @email, @full_name, @role, @password_hash)`
);

insert.run({ username: 'admin',  email: 'admin@test.local',  full_name: 'Admin',  role: 'admin',  password_hash: weakHash('Admin123!') });
insert.run({ username: 'viewer', email: 'viewer@test.local', full_name: 'Viewer', role: 'viewer', password_hash: weakHash('viewer') });
insert.run({ username: 'agent',  email: 'agent@test.local',  full_name: 'Agent',  role: 'agent',  password_hash: weakHash('Password1') });

// Ticket que pertenece al admin (id=1)
const adminId = (db.prepare('SELECT id FROM users WHERE username=?').get('admin') as any).id;
db.prepare(
  `INSERT INTO tickets (title, description, status, priority, customer_name, customer_email, created_by_id)
   VALUES ('Ticket admin', 'desc', 'open', 'low', 'Cliente', 'cli@test.local', ?)`
).run(adminId);
