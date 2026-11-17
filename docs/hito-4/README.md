# Hito 4 · Correcciones y re-pruebas del Equipo Rojo

**Fecha:** 2026-11-17  
**Rama:** `feat/hito-4`  
**Commit de correcciones:** `2aa3877`

---

## Resumen de correcciones

Los tres PoC confirmados en H2 y detectados en H3 fueron corregidos en la API. Las pruebas de regresión se escribieron primero (rojo) y luego pasaron a verde tras cada fix.

| PoC | Archivo corregido | CWE | Fix aplicado |
|---|---|---|---|
| PoC-01 JWT | `apps/api/src/middleware/auth.ts` | CWE-347 | `jwt.verify()` reemplaza `jwt.decode()` — firma inválida retorna 401 |
| PoC-02 SQLi | `apps/api/src/auth.ts` | CWE-89 | Query parametrizada reemplaza concatenación de strings |
| PoC-03 IDOR | `apps/api/src/routes/tickets.ts` | CWE-639 | Retorna 403 cuando el usuario no es dueño ni asignado del ticket |

---

## Pruebas de regresión

**Framework:** vitest + supertest  
**Archivo:** `apps/api/src/tests/regression.test.ts`

| Test | Antes del fix | Después del fix |
|---|---|---|
| SQLi en login rechazado | 200 (bypass) → FAIL | 401 → PASS |
| JWT con firma inválida rechazado | 200 (aceptado) → FAIL | 401 → PASS |
| IDOR bloqueado con 403 | 200 (acceso libre) → FAIL | 403 → PASS |

```
Tests  3 passed (3)
```

---

## Re-prueba de PoC con WAF en DetectionOnly

**Timestamp UTC:** `2026-11-17T05:36:27Z`  
**WAF:** `SecRuleEngine DetectionOnly` — el WAF no bloquea, solo registra.  
Los ataques fallan por las correcciones en el código de la API.

| PoC | Request | Respuesta anterior (H2) | Respuesta actual (H4) |
|---|---|---|---|
| PoC-02 SQLi | `POST /api/auth/login` `username: admin' OR 1=1 --` | `200 OK` (bypass) | `401 Credenciales inválidas` |
| PoC-01 JWT | `GET /api/users` Bearer con firma adulterada | `200 OK` + lista de usuarios | `401 Token inválido` |
| PoC-03 IDOR | `GET /api/tickets/1` como viewer | `200 OK` + datos del ticket | `403 Acceso denegado` |

---

## Auditoría del diff

### Herramienta utilizada
Claude Code (Anthropic) — modelo claude-fable-5-2.

### Cambios en `apps/api/src/middleware/auth.ts`

**Prompt usado:** corrección del middleware de autenticación JWT que usaba `jwt.decode` sin verificar firma.

**Cambio:**
```diff
- jwt.verify(token, ...);   // solo para observar, resultado ignorado
- const payload = jwt.decode(token);  // firma ignorada completamente
+ let payload: any;
+ try {
+   payload = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
+ } catch (error) {
+   if (error instanceof Error && error.message === 'invalid signature') {
+     recordSecurityEvent(req, 'jwt_invalid_signature');
+   }
+   return res.status(401).json({ error: 'Token inválido' });
+ }
```

**Revisión humana:** verificado que `jwt.verify` lanza excepción para cualquier token mal formado o con firma incorrecta. El evento de seguridad se sigue registrando antes de rechazar.

---

### Cambios en `apps/api/src/auth.ts`

**Prompt usado:** corrección de SQLi en login por query parametrizada.

**Cambio:**
```diff
- const sql = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${hashed}'`;
- row = db.prepare(sql).get();
+ row = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, hashed);
```

**Revisión humana:** eliminado también el mensaje de error verboso que exponía el SQL y detalle del motor (`CWE-209`).

---

### Cambios en `apps/api/src/routes/tickets.ts`

**Prompt usado:** corrección de IDOR en `GET /api/tickets/:id` retornando 403 en lugar de solo registrar el evento.

**Cambio:**
```diff
  if (req.user && req.user.role !== 'admin' && req.user.sub !== row.assignee_id && req.user.sub !== row.created_by_id) {
    recordSecurityEvent(req, 'ticket_foreign_access', { ticketId: row.id, claimedRole: req.user.role });
+   return res.status(403).json({ error: 'Acceso denegado' });
  }
```

**Revisión humana:** la lógica de autorización preexistente ya identificaba el acceso indebido. El fix agrega el `return 403` que faltaba. Admin sigue teniendo acceso completo.

---

## Infraestructura de tests añadida

| Archivo | Propósito |
|---|---|
| `apps/api/vitest.config.ts` | Configura vitest con DB en memoria y JWT_SECRET de prueba |
| `apps/api/src/app.ts` | Extrae `createApp()` de `index.ts` para permitir importación en tests sin iniciar servidor |
| `apps/api/src/tests/setup.ts` | Inicializa schema y seed en DB `:memory:` antes de cada suite |
| `apps/api/src/tests/regression.test.ts` | 3 pruebas de regresión RED→GREEN |
