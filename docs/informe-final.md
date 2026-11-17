# Informe final | Proyecto Integrador

**Desarrollo de Software Seguro · Secure CRM** · Repositorio: mar22266/proyecto-final-desarrollo

Este informe reúne el análisis, las pruebas, las detecciones y las correcciones realizadas en los hitos 0 a 4. Relaciona cada hallazgo con el caso de negocio afectado y con la evidencia disponible.

## 1. Alcance y criterio

El trabajo se realizó sobre la aplicación del grupo en un laboratorio local, con datos de prueba y a través del WAF en localhost:8080. La [guía operativa del curso](https://locano-uvg.github.io/proyecto_integrador/#enunciado) indica seguir la aplicación del grupo y un mínimo de **tres PoC confirmadas en Burp** cuando el PDF plantea un alcance distinto.

El informe distingue la versión vulnerable analizada en H1-H3 de la versión corregida en H4. Una detección no demuestra por sí sola que el WAF bloqueó el ataque; una respuesta 403 del WAF tampoco demuestra que la aplicación haya sido corregida. El pipeline se mantiene en modo reporte, por lo que un resultado verde no significa que no haya hallazgos.

## Casos de negocio y flujo de datos

El [DFD detallado](hito-1/dfd-casos.svg) conecta cuatro casos de negocio con las pantallas, rutas y datos descritos en [Hito 1](hito-1/README.md):

1. **Acceso e identidad (A1-A2):** el login consulta los usuarios de SQLite y, tras validar las credenciales, entrega un JWT para abrir el panel. El negocio necesita que cada operación corresponda a una persona autorizada.
2. **Atención de tickets (T1-T5):** desde la aplicación, la persona autenticada consulta y gestiona tickets y datos de clientes en SQLite. El negocio necesita mantener la confidencialidad e integridad de cada caso.
3. **Administración de usuarios (U1-U3):** una cuenta consulta usuarios o solicita altas y cambios de rol; la API actualiza los registros en SQLite. El negocio necesita separar funciones y proteger datos de autenticación.
4. **Investigación (O1):** los registros del WAF y eventos de la API llegan a Elasticsearch mediante Filebeat y se consultan en Kibana. El negocio necesita reconstruir abusos sin divulgar secretos.

El límite de confianza principal está entre el cliente, el WAF y la API. La API valida la identidad, el rol y los permisos sobre cada ticket; el WAF no consulta SQLite. En el entorno del proyecto, el puerto 4000 de la API no se publica directamente al equipo anfitrión, según la [configuración de H0](hito-0/README.md).

## Cronología de pruebas y controles

| Fecha y hora | Evidencia | Resultado |
|---|---|---|
| 3-4 nov | [H0](hito-0/README.md), [H1](hito-1/README.md) | Entorno, roles, DFD, PASTA 1-5, STRIDE, siete casos de abuso y diez hallazgos DAST históricos. |
| 9-10 nov | [Burp](hito-2/poc-burp.md), [ZAP](hito-2/zap-escaneo-2026-11-10.md), [Postman](hito-2/README.md) | Tres PoC por 8080 en DetectionOnly: JWT, SQLi de login e IDOR de lectura. Clasificación OWASP 2025, CWE y CVSS v3.1. |
| 10 nov | [Pipeline](hito-2/evidencia-pipeline-2026-11-10.md) | Semgrep, auditoría de dependencias, SBOM CycloneDX y ZAP baseline publicaron artefactos; gate en modo reporte. |
| 17 nov | [Repetición H3](hito-3/demo-purple-team.md) | WAF On: SQLi 403/CRS 942100; JWT e IDOR detectados por eventos de API, con respuesta vulnerable 200 en esa línea base. La sesión fue ejecutada por Davis simulando el rol azul. |
| 17 nov | [Reprueba H4](hito-4/README.md) | Según registro del Equipo rojo, con WAF en DetectionOnly: SQLi 401, JWT adulterado 401, IDOR de lectura 403. |
| 17 nov | [Regresiones H4](../apps/api/src/tests/regression.test.ts) | Cinco pruebas de API pasaron localmente: tres rechazos y dos flujos válidos. La API compiló. El CI del merge H4 terminó correctamente; las regresiones se añadieron después como job propio. |

## Matriz de trazabilidad por vulnerabilidad

**Términos:** PoC es una petición y respuesta reproducible; DET identifica una búsqueda guardada de Kibana; RS es un requisito de seguridad definido en H1. La tabla señala cuando un hallazgo no tiene una PoC individual.

| Hallazgo y efecto en el negocio | PoC y clasificación H2 | Detección y bloqueo H3 | Corrección y nueva prueba H4 |
|---|---|---|---|
| **H-01, A1: SQLi del login.** Acceso como administrador sin contraseña; compromete cuentas y tickets. RS-05, CA-04. | **PoC-02** Burp/Postman: admin'-- devolvió token admin. OWASP A05, CWE-89, CVSS 9.1. ZAP activo señaló SQLi en login con confianza baja. | Semgrep y ZAP baseline son controles generales; el baseline público no demuestra esta ruta autenticada. DET-01 vio CRS 942100; WAF On devolvió 403. | Query parametrizada en auth.ts. Reprueba 401 en DetectionOnly; regresión exige 401 y ausencia de token. |
| **H-04, A1/U1 y transversal: JWT sin firma verificada.** Suplantación de identidad y privilegios; expone usuarios y puede afectar tickets. RS-01, CA-01. | **PoC-01** Burp/Postman: JWT alterado devolvió 200 y lista de usuarios. OWASP A07, CWE-347, CVSS 9.1. | No lo demuestra ZAP baseline. DET-02 registró jwt_invalid_signature en app-security; el CRS no valida criptografía y no bloqueó la línea base. | jwt.verify() en middleware; reprueba 401 en DetectionOnly; regresión exige 401. |
| **H-03, T2: IDOR de lectura.** Un usuario ve ticket y datos de cliente ajenos. RS-03, CA-02. | **PoC-03** Burp/Postman: viewer recibió ticket ajeno con 200. OWASP A01, CWE-639, CVSS 8.1. | No lo demuestra ZAP baseline. DET-03 registró ticket_foreign_access; el WAF no conoce propiedad de objetos. | GET /api/tickets/:id devuelve 403 a quien no es dueño ni asignado; reprueba 403 en DetectionOnly; regresión confirma además acceso válido de admin. |
| **H-02, T1: XSS reflejado.** Riesgo para sesión y datos del operador que consulta tickets. RS-05, CA-05. | Hallazgo DAST H1 con evidencia; **sin PoC individual de Burp H2**. | DET-04 y 403 corresponden a una prueba local adicional de XSS, no a PoC-01/02/03. | Sin corrección específica documentada en H4. |
| **H-05, U1: hashes expuestos.** Divulgación de datos de autenticación. RS-04. | Se observó passwordHash dentro de la respuesta de PoC-01; no es una cuarta PoC independiente. | DET-02 identifica el JWT alterado, no impide que una sesión legítima lea hashes. | Sigue presente en routes/users.ts; riesgo residual. |
| **H-06/H-07, A1-A2 y transversal: cookie/cabeceras y CORS.** Mayor exposición de sesiones y navegador. | Hallazgos DAST H1; sin PoC individual de Burp H2. | ZAP baseline observó cabeceras faltantes; el WAF no sustituye la política de origen ni atributos de cookie. | Sin corrección específica; riesgo residual del laboratorio. |
| **H-08, U2-U3: rol aceptado del cliente.** Escalada de privilegios y alteración de cuentas. RS-02, CA-03. | Hallazgo H1; sin PoC individual H2. | No existe detección específica demostrada para este abuso lógico. | POST /api/users y PUT /api/users/:id/role siguen sin autorización por rol; riesgo residual. |
| **H-09, A1/O1: login sin límite.** Intentos repetidos contra cuentas y disponibilidad. RS-06, CA-06. | Hallazgo H1; sin PoC individual H2. | El SIEM recibe eventos de tráfico, pero no se documentó una regla de ráfagas ni un 429. | Sin corrección específica; riesgo residual. |
| **H-10, A1-A2: errores detallados.** Filtración de detalles internos. | Hallazgo H1; sin PoC individual H2. | Los escaneos pueden señalar exposición, sin sustituto de revisión de respuesta. | H4 retiró el detalle SQL del login, pero el manejador global aún incluye message y stack; corrección parcial. |

La búsqueda de tickets q concatena SQL y las rutas PUT/DELETE no comprueban los permisos sobre el ticket. Son riesgos visibles en el código para T1/T4/T5; no se presentan como PoC de Burp ejecutadas. La [matriz de H2](hito-2/README.md) mantiene esa distinción.

## Pipeline, WAF y falsos positivos

El [workflow](../.github/workflows/devsecops.yml) se ejecuta en cada push y pull request. Publica resultados de Semgrep, SCA, SBOM CycloneDX y ZAP baseline; además, ejecuta las pruebas de regresión de la API. El [umbral del pipeline](hito-2/revision-gate.md) define las condiciones para activar el modo bloqueo. Por ahora, SECURITY_GATE sigue en reporte para registrar los hallazgos de este laboratorio. La [revisión de dependencias](hito-2/sca-2026-11-17.md) reporta **19 vulnerabilidades high y 6 critical** en dependencias de producción, pendientes de actualización o de una excepción documentada.

Para H3, el WAF se configuró en On con CRS activo. La SQLi de prueba recibió 403; los flujos legítimos probados respondieron 200. La exclusión 10001 solo omite la evaluación del encabezado Host: 127.0.0.1 para la regla 920350; no desactiva el CRS. No se documentó otro falso positivo que requiriera una exclusión. La validación de JWT y los permisos de tickets corresponden a la API; ambas correcciones se incorporaron en H4.

## Riesgo residual | PASTA, etapa 7

H4 corrigió las tres vulnerabilidades priorizadas y explotadas. **Secure CRM sigue siendo una aplicación de laboratorio, no apta para producción.** Quedan riesgos en la búsqueda SQL de T1, la edición y eliminación de tickets ajenos en T4/T5, la exposición de hashes en U1, los cambios de rol sin autorización en U2/U3, la falta de límite de intentos de login y los errores detallados. También se mantienen el uso de weakHash para contraseñas y un secreto JWT de reserva. El entorno se limita a la instancia local, con datos de prueba, API no publicada directamente y WAF activo. La [evaluación de H1](hito-1/README.md) relaciona estos riesgos con los casos y requisitos de negocio.

## Revisión del código y uso de asistencia

Para las correcciones de H4 se utilizó Claude Code. El [registro del hito](hito-4/README.md) resume las solicitudes y muestra los cambios revisados; el historial completo de respuestas ya no está disponible. Durante la preparación de este informe también se utilizó Codex para reforzar la prueba de SQLi, añadir las regresiones al pipeline y revisar la trazabilidad. El equipo debe revisar y poder explicar los cambios. Las cinco pruebas de regresión y la compilación de la API se ejecutaron localmente. Las pruebas de cada equipo se atribuyen a quien las realizó.

## Conclusiones

- El DFD conecta las operaciones de la aplicación con los datos, los límites de confianza y el impacto en el negocio. Esa relación permite definir requisitos que se pueden probar.
- Burp, ZAP, Kibana y las pruebas de regresión cumplen funciones distintas. Un pipeline verde en modo reporte no demuestra que el control de acceso sea correcto.
- La SQLi permite mostrar el recorrido completo: ataque, detección DET-01, bloqueo 403, corrección en la API y rechazo de la misma PoC con el WAF en observación.
- JWT e IDOR se corrigen en la API, que puede validar firmas y permisos sobre tickets. Bloquear rutas enteras en el WAF también afectaría solicitudes legítimas.
