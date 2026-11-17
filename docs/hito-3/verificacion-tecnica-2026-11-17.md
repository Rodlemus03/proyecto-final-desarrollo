# Verificación técnica adicional de Hito 3

**Fecha:** 17 de noviembre de 2026. **Ventana:** 13:53:46-13:53:55 UTC. **Entorno:** `waf-siem/` local, WAF `SecRuleEngine On`, API anterior a las correcciones H4. Esta ejecución fue realizada durante la revisión técnica del repositorio; no se atribuye a Davis, Julio ni a una demo conjunta del grupo.

La comprobación del código compilado del contenedor anterior a H4 mostró consulta de login sin parametrizar y ausencia de `jwt.verify`. Todas las solicitudes se enviaron por `127.0.0.1:8080`. La API no respondió en `127.0.0.1:4000`; Kibana respondió en `:5601`.

| Solicitud | Resultado HTTP | Señal consultada en `filebeat-*` | Caso de negocio |
|---|---:|---|---|
| `GET /api/health` | 200 | Tráfico por WAF | Control de entrada |
| Login válido `viewer` | 200 | Tráfico normal | A1, acceso |
| SQLi `admin' OR 1=1 --` en login | **403** | `waf-audit`, `942100` y `949110`, 13:53:51.629 UTC | A1, impedir suplantación |
| JWT de `viewer` con rol alterado a `admin` y firma original | **200**; la respuesta incluyó `passwordHash` | `app-security`, `jwt_invalid_signature`, 13:53:51.629 UTC | A1/U1, identidad y cuentas |
| Lectura de `/api/tickets/1` por `viewer` | **200** | `app-security`, `ticket_foreign_access`, 13:53:51.629 UTC | T2, datos de cliente |

La respuesta `403` de SQLi confirma detección y bloqueo por CRS. Las otras dos señales son **detección de la API sin bloqueo en esa versión**; el WAF no comprueba firmas JWT ni autoría del ticket. Las correcciones se comprueban en la [reprueba de Hito 4](../hito-4/verificacion-tecnica-2026-11-17.md).

Esta verificación reproduce técnicamente el recorrido documentado en la [demo Purple Team anterior](demo-purple-team.md). La presentación evaluada requiere aún que el Equipo rojo ejecute la PoC y el Equipo azul enseñe la detección del **mismo intento** en vivo, con sus capturas. No se presenta esta ejecución individual como participación simultánea de ambos equipos.
