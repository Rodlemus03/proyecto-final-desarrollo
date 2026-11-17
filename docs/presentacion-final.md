# Presentación final - recorrido de 15 minutos

Este guion usa la [matriz del informe](informe-final.md) y el [DFD de Hito 1](hito-1/dfd-casos.svg). La demo se hace solo en la instancia local por `:8080`, con datos de prueba. Cada integrante debe poder explicar cualquier tramo si el docente lo pregunta.

| Tiempo | Responsable | Qué mostrar y explicar |
|---|---|---|
| 0:00-2:00 | André, Equipo azul | Cuatro casos de negocio: identidad A1-A2, tickets T1-T5, administración U1-U3 e investigación O1. Seguir en el DFD el camino navegador -> WAF -> API -> SQLite y el retorno de logs a Kibana. |
| 2:00-4:00 | Julio, Equipo rojo | STRIDE/PASTA y tres riesgos priorizados. SQLi afecta el acceso, JWT altera identidad y privilegios, IDOR expone tickets de clientes. Abrir las filas respectivas del informe y la clasificación OWASP/CWE/CVSS de H2. |
| 4:00-6:00 | Davis, Equipo rojo | Mostrar el request de SQLi de Burp o Postman contra `localhost:8080` con WAF `On`; anotar hora UTC y mostrar `403`. Explicar que en H2, con `DetectionOnly` y antes del fix, el mismo defecto devolvía token admin. |
| 6:00-8:00 | Gabriel, Equipo azul | Filtrar Kibana a esa hora y mostrar `DET-01`, ruta `/api/auth/login`, regla `942100` y dato detectado. Abrir dashboard con tiempo, reglas, rutas e IP. Mostrar login legítimo `200` y explicar la exclusión `10001`. |
| 8:00-10:00 | André, Equipo azul | Mostrar el código corregido de `auth.ts`: consulta con parámetros. Con WAF en `DetectionOnly`, repetir SQLi y mostrar `401` sin token. Si se cambia el modo del WAF durante la exposición, esperar a que el contenedor quede sano antes de la siguiente petición. |
| 10:00-12:00 | Davis, Equipo rojo | Resumir JWT e IDOR: Burp `200` histórico, eventos `DET-02/03`, ausencia de bloqueo lógico en CRS y reprueba H4 `401/403` en la API. No llamar bloqueo WAF a esos rechazos. |
| 12:00-14:00 | Gabriel, Equipo azul | Mostrar Actions: Semgrep, SCA, SBOM CycloneDX, ZAP baseline y regresiones de API; explicar que `SECURITY_GATE=reporte` permite CI verde con hallazgos. Abrir la hoja del umbral y el riesgo residual. |
| 14:00-15:00 | Julio, Equipo rojo | Cerrar con lo aprendido y pendientes reales: búsqueda SQL, autorización de escritura, hashes y roles. Explicar por qué el laboratorio local y sus datos de prueba limitan el alcance; indicar la matriz del informe PDF entregada en Canvas cuando se haya subido. |

## Preparación antes de la demo

1. Levantar el Compose de `waf-siem/` y verificar WAF `:8080`, web `:3000`, Kibana `:5601` y Filebeat. Confirmar que el puerto `4000` no responde desde el host.
2. Con `MODSEC_RULE_ENGINE=On`, abrir la búsqueda `DET-01` y fijar un rango de tiempo de la sesión. Enviar primero una petición legítima y comprobar `200`.
3. Equipo rojo envía SQLi por `:8080`; equipo azul localiza el mismo intento en Kibana y muestra el `403`. Registrar hora y capturas reales en [H3](hito-3/estado-actual.md).
4. Para demostrar la corrección, poner el WAF en `DetectionOnly`, esperar el reinicio y reenviar exactamente el mismo payload: la API debe responder `401`. No reutilizar un resultado del WAF `On` como prueba de H4.
5. Restaurar `On` al terminar y comprobar salud. Mantener tokens, contraseñas y datos de prueba fuera de capturas públicas.

## Respuestas breves para preguntas

- **¿Qué aporta el SBOM?** Inventaría componentes y versiones; ayuda a localizar una dependencia vulnerable. No prueba que el código sea seguro.
- **¿Qué diferencia hay entre SAST, SCA y DAST?** SAST examina código y configuración; SCA dependencias; DAST observa la aplicación en ejecución. Burp confirma manualmente fallos de lógica que el baseline puede no ver.
- **¿Por qué SQLi es riesgo de negocio?** El atacante entra sin la contraseña del administrador y puede acceder a cuentas y tickets. El proceso de atención pierde control de identidad.
- **¿Por qué el WAF no detuvo JWT/IDOR?** No puede comprobar una firma criptográfica ni quién es dueño de un ticket en SQLite. Esas comprobaciones son de la API.
- **¿Qué significa CI verde?** Los jobs terminaron. Con el gate en `reporte`, los hallazgos de seguridad se informan y no necesariamente bloquean el merge.
- **¿Está lista para producción?** No. H4 corrigió las tres PoC priorizadas; el informe registra vulnerabilidades y requisitos pendientes. Se usa solo como laboratorio local.
