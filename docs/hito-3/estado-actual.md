# Estado comprobado de Hito 3

Revisión: 17 de noviembre de 2026. Este registro actualiza la [revisión del 10 de noviembre](cierre-equipo-azul.md) y distingue la línea base anterior a las correcciones de Hito 4.

Una [verificación técnica adicional](verificacion-tecnica-2026-11-17.md) repitió las tres PoC por el WAF local y correlacionó sus respuestas con eventos de Elasticsearch. Se ejecutó en una sola sesión técnica y no sustituye la demo simultánea de ambos equipos.

| Criterio | Evidencia | Estado |
|---|---|---|
| Data view y eventos | `filebeat-*`, `waf-audit` y `app-security` en [`kibana-export.ndjson`](../../waf-siem/kibana-export.ndjson). | Documentado. |
| Tres detecciones de PoC de Burp | `DET-01` SQLi del acceso `A1`, `DET-02` JWT de `A1/U1` y `DET-03` IDOR de `T2`, con [registro y capturas](demo-purple-team.md). | Documentado. |
| Dashboard | Tiempo, regla, ruta e IP, con búsquedas guardadas. | Exportado. |
| WAF `On` y CRS | SQLi de login disparó `942100` y respondió `403`; salud, login normal y listado dieron `200`. | Documentado el 17 de noviembre. |
| Falsos positivos | La exclusión `10001` afecta solo Host de loopback y regla `920350`; no se observó bloqueo de los flujos legítimos probados. | No se requirió otra exclusión. |
| Demo en vivo entre ambos equipos | Davis repitió las PoC y simuló la observación azul. | Falta sesión conjunta Red–Blue y la captura del mismo intento en Kibana y HTTP. |

La [guía de la demo](https://locano-uvg.github.io/proyecto_integrador/blue-team/#demo) pide mostrar un PoC detectado y bloqueado con HTTP 403. SQLi cumple ese recorrido técnico. JWT e IDOR fueron detectados, pero el CRS no valida firmas ni propiedad de tickets; la API los rechazó después de las correcciones de Hito 4. Las respuestas históricas `200` no son evidencia de bloqueo.

## Ejecución conjunta pendiente

1. Levantar `waf-siem/` con `MODSEC_RULE_ENGINE=On`; comprobar `:8080/api/health`, Filebeat y Discover.
2. Equipo rojo: repetir la PoC SQLi de Hito 2 por `:8080` y registrar hora UTC, payload y respuesta `403`. Equipo azul: mostrar en `DET-01` la misma hora, ruta, `ruleId` y dato detectado.
3. Repetir un login legítimo y comprobar `200`. Si aparece un falso positivo, registrar la regla y añadir solo la exclusión indispensable antes de repetir ambos flujos.
4. Guardar capturas reales de petición/respuesta, Discover, dashboard y objetos exportados. Para la presentación final, mostrar además el rechazo `401` de la misma PoC con WAF en `DetectionOnly` tras Hito 4.

La [guía general](https://locano-uvg.github.io/proyecto_integrador/#enunciado) establece tres PoC y la aplicación del grupo cuando difiere del PDF. El umbral aprobado figura en [Hito 2](../hito-2/revision-gate.md).
