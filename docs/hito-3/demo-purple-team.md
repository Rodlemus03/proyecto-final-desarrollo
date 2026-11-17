# Demo Purple Team · Hito 3

**Fecha:** 2026-11-17  
**Ejecutado por:** Davis Roldán (Equipo Rojo) — rol Blue simulado en entorno local  
**Entorno:** `localhost:8080` (WAF ModSecurity `SecRuleEngine On`, CRS 4.30.0)

---

## Resumen

| PoC | Vulnerabilidad | Endpoint | HTTP | Detección Kibana | Bloqueo WAF |
|---|---|---|---|---|---|
| PoC-02 | SQLi en login | `POST /api/auth/login` | **403** | DET-01 `942100` | **Sí** |
| PoC-01 | JWT sin verificación de firma | `GET /api/users` | 200 | DET-02 `jwt_invalid_signature` | No (limitación CRS) |
| PoC-03 | IDOR en tickets | `GET /api/tickets/1` | 200 | DET-03 `ticket_foreign_access` | No (limitación CRS) |

---

## PoC-02 · SQLi en login

**Timestamp UTC:** `2026-11-17T04:54:15Z`

**Request:**
```
POST http://127.0.0.1:8080/api/auth/login
Content-Type: application/json

{"username":"admin' OR 1=1 --","password":"anything"}
```

**Respuesta:** `403 Forbidden` — WAF bloqueó el request.

**Detección Kibana (DET-01):**
- Búsqueda: `fields.fuente : "waf-audit" and modsec.transaction.messages.details.ruleId : "942100"`
- Reglas activadas: `942100` (SQL Injection via libinjection) y `949110` (Anomaly Score Exceeded, score: 5)
- `is_interrupted: true`
- Payload detectado: `Matched Data: s&1c found within ARGS:json.username: admin' OR 1=1 --`

![DET-01 SQLi en login](capturas/kibana-det-01.png)

---

## PoC-01 · JWT sin verificación de firma

**Timestamp UTC:** `2026-11-17T05:12:00Z`

**Token legítimo obtenido como `viewer` (role: viewer), payload adulterado a `role: admin`, firma original conservada.**

**Request:**
```
GET http://127.0.0.1:8080/api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload_admin>.<firma_viewer>
```

**Respuesta:** `200 OK` — API devuelve todos los usuarios incluyendo `passwordHash`.

**Límite del WAF:** El CRS no valida firmas criptográficas de JWT. El bloqueo de `/api/users` generaría falsos positivos en tráfico legítimo. La remediación pertenece a H4.

**Detección Kibana (DET-02):**
- Búsqueda: `fields.fuente : "app-security" and security.event : "jwt_invalid_signature"`
- Evento registrado por la API en `/var/log/security/events.jsonl` vía `security-log.ts`

![DET-02 JWT con firma inválida](capturas/kibana-det-02.png)

---

## PoC-03 · IDOR en tickets

**Timestamp UTC:** `2026-11-17T05:13:38Z`

**Request:**
```
GET http://127.0.0.1:8080/api/tickets/1
Authorization: Bearer <token_viewer_legítimo>
```

Ticket ID 1 pertenece a `Ada Administradora` (admin). El usuario `viewer` no tiene asignación ni autoría sobre él.

**Respuesta:** `200 OK` — API devuelve datos completos del ticket de otro usuario.

**Límite del WAF:** El CRS no consulta la base de datos para validar pertenencia de objetos. La remediación pertenece a H4.

**Detección Kibana (DET-03):**
- Búsqueda: `fields.fuente : "app-security" and security.event : "ticket_foreign_access"`
- Evento registrado por la API con `ticketId`, `claimedRole` y ruta

![DET-03 Acceso a ticket ajeno](capturas/kibana-det-03.png)

---

## Acción legítima verificada (sin falso positivo)

Login normal y listado de tickets respondieron `200` sin ser bloqueados por el WAF, confirmando que las exclusiones existentes no interfieren con el flujo normal.

```bash
curl -s http://127.0.0.1:8080/api/health        # 200
POST /api/auth/login  {"username":"viewer","password":"viewer"}  # 200
GET  /api/tickets     Authorization: Bearer <token_viewer>       # 200
```

---

## Pendientes para H4

| Fallo | Archivo | Corrección |
|---|---|---|
| JWT sin verificar firma | `apps/api/src/middleware/auth.ts:23` | Usar `jwt.verify()` y rechazar tokens con firma inválida |
| IDOR en tickets | `apps/api/src/routes/tickets.ts:51` | Validar que `ticket.assigneeId` o `createdById` coincida con `req.user.sub` |
| SQLi en login | `apps/api/src/auth.ts:30` | Usar consulta parametrizada en lugar de interpolación de string |
