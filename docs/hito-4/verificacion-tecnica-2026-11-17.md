# Reprueba técnica de Hito 4 por el WAF

**Fecha:** 17 de noviembre de 2026. **Ventana:** 13:57:00-13:57:05 UTC. **Entorno:** `waf-siem/` local, API reconstruida desde `main` y WAF temporalmente en `SecRuleEngine DetectionOnly`. Esta ejecución fue realizada durante la revisión técnica del repositorio; el [registro previo del Equipo rojo](README.md) conserva su propia reprueba de las 05:36 UTC.

Se verificó en el contenedor compilado que el login usa parámetros SQL y que el middleware invoca `jsonwebtoken.verify`. Todas las solicitudes se enviaron por `127.0.0.1:8080`; el WAF solo observaba, por lo que el rechazo procede de la API.

| PoC y caso de negocio | Línea base vulnerable con WAF `On` | Reprueba con WAF `DetectionOnly` | Evidencia SIEM |
|---|---:|---:|---|
| PoC-02 SQLi en A1, acceso e identidad | 403 por CRS | **401**, sin token | `waf-audit`, reglas `942100` y `949110`, 13:57:05.672 UTC |
| PoC-01 JWT alterado en A1/U1, identidad y cuentas | 200, con hashes | **401**, sin hashes | `app-security`, `jwt_invalid_signature`, 13:57:05.672 UTC |
| PoC-03 IDOR en T2, confidencialidad del ticket | 200 | **403** | `app-security`, `ticket_foreign_access`, 13:57:05.672 UTC |
| Login legítimo `viewer` | 200 | **200** | Comprobación de flujo válido |

La comparación H3/H4 usa imágenes de API distintas: primero la línea base, después la API reconstruida con las correcciones. El WAF quedó restaurado en `On` al terminar y `GET /api/health` respondió `200`. La prueba de regresión de la API pasó **5/5** y la compilación TypeScript terminó correctamente. Esto confirma las tres correcciones priorizadas; no prueba que las demás rutas del CRM estén libres de fallos. El [informe final](../informe-final.md) enumera el riesgo residual.
