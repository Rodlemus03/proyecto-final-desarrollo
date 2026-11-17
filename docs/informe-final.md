# Proyecto Final Integrador - informe de trazabilidad

**Aplicación:** Secure CRM, instancia local del grupo. **Fecha de corte:** 17 de noviembre de 2026. **Repositorio:** `mar22266/proyecto-final-desarrollo`.

## 1. Alcance y criterio

El proyecto recorre el ciclo de diseño, prueba, detección, respuesta y corrección sobre la aplicación del Proyecto DAST. Todo ataque manual se limita a datos de prueba y al WAF local `localhost:8080`. La [guía operativa del curso](https://locano-uvg.github.io/proyecto_integrador/#enunciado) resuelve las diferencias con el PDF en aplicación y número de PoC: se usa la aplicación del grupo y el mínimo es **tres** PoC confirmadas en Burp. La guía exige un informe PDF en Canvas y una demo final; esos son actos de entrega, no hechos que pueda demostrar el repositorio por sí solo.

Este informe separa **línea base vulnerable** (H1-H3) de **estado posterior a la remediación** (H4). Una detección no equivale a bloqueo; un `403` del WAF no equivale a corrección de la API; un workflow verde en modo `reporte` no equivale a ausencia de vulnerabilidades.

## 2. Casos de negocio y flujo de datos

El [DFD detallado](hito-1/dfd-casos.svg) une cuatro casos con las pantallas, rutas y datos de la [descomposición de H1](hito-1/README.md):

1. **Acceso e identidad (A1-A2):** credenciales -> WAF -> login/API -> usuarios SQLite -> JWT -> panel. El negocio necesita que cada operación corresponda a una persona autorizada.
2. **Atención de tickets (T1-T5):** usuario autenticado -> WAF -> lista, búsqueda, lectura, creación, edición o borrado -> tickets y datos de clientes en SQLite. El negocio necesita confidencialidad e integridad del caso atendido.
3. **Administración de usuarios (U1-U3):** cuenta autenticada -> WAF -> consulta, alta y cambio de rol -> usuarios SQLite. El negocio necesita separación de funciones y proteger datos de autenticación.
4. **Investigación (O1):** solicitud -> auditoría WAF o evento de la API -> Filebeat -> Elasticsearch -> Kibana. El negocio necesita reconstruir abusos sin divulgar secretos en logs.

El límite de confianza principal es cliente-WAF-API. La API decide identidad, rol y pertenencia de tickets; el WAF no conoce el estado de SQLite. El puerto `4000` de la API no está publicado al host en el Compose de `waf-siem/`, según la [configuración y verificación H0](hito-0/README.md).

## 3. Línea de tiempo y controles

| Momento | Evidencia | Resultado comprobado o documentado |
|---|---|---|
| 3-4 nov | [H0](hito-0/README.md), [H1](hito-1/README.md) | Entorno, roles, DFD, PASTA 1-5, STRIDE, siete casos de abuso y diez hallazgos DAST históricos. |
| 9-10 nov | [Burp](hito-2/poc-burp.md), [ZAP](hito-2/zap-escaneo-2026-11-10.md), [Postman](hito-2/README.md) | Tres PoC por `8080` en `DetectionOnly`: JWT, SQLi de login e IDOR de lectura. Clasificación OWASP 2025, CWE y CVSS v3.1. |
| 10 nov | [Pipeline](hito-2/evidencia-pipeline-2026-11-10.md) | Semgrep, auditoría de dependencias, SBOM CycloneDX y ZAP baseline publicaron artefactos; gate en modo `reporte`. |
| 17 nov, 04:54-05:14 UTC | [Repetición H3](hito-3/demo-purple-team.md) | WAF `On`: SQLi `403`/CRS `942100`; JWT e IDOR detectados por eventos de API, con respuesta vulnerable `200` en esa línea base. La sesión fue ejecutada por Davis simulando el rol azul. |
| 17 nov, 05:36 UTC | [Reprueba H4](hito-4/README.md) | Según registro del Equipo rojo, con WAF en `DetectionOnly`: SQLi `401`, JWT adulterado `401`, IDOR de lectura `403`. |
| 17 nov | [Regresiones H4](../apps/api/src/tests/regression.test.ts) | Cinco pruebas de API pasaron localmente: tres rechazos y dos flujos válidos. La API compiló. El CI del merge H4 terminó correctamente; las regresiones se añadieron después como job propio. |

## 4. Matriz SSDLC por vulnerabilidad

**Convención:** PoC significa petición/respuesta confirmada, `DET` una búsqueda guardada de Kibana y `RS` un requisito de H1. La ausencia de PoC individual se indica de forma explícita.

| Hallazgo, caso y efecto de negocio | Ataque H2 y clasificación | Pipeline / SIEM / WAF H3 | Corrección y reprueba H4 |
|---|---|---|---|
| **H-01, A1: SQLi del login.** Acceso como administrador sin contraseña; compromete cuentas y tickets. RS-05, CA-04. | **PoC-02** Burp/Postman: `admin'--` devolvió token admin. OWASP A05, CWE-89, CVSS 9.1. ZAP activo señaló SQLi en login con confianza baja. | Semgrep y ZAP baseline son controles generales; el baseline público no demuestra esta ruta autenticada. `DET-01` vio CRS `942100`; WAF `On` devolvió `403`. | Query parametrizada en `auth.ts`. Reprueba `401` en `DetectionOnly`; regresión exige `401` y ausencia de token. |
| **H-04, A1/U1 y transversal: JWT sin firma verificada.** Suplantación de identidad y privilegios; expone usuarios y puede afectar tickets. RS-01, CA-01. | **PoC-01** Burp/Postman: JWT alterado devolvió `200` y lista de usuarios. OWASP A07, CWE-347, CVSS 9.1. | No lo demuestra ZAP baseline. `DET-02` registró `jwt_invalid_signature` en `app-security`; el CRS no valida criptografía y no bloqueó la línea base. | `jwt.verify()` en middleware; reprueba `401` en `DetectionOnly`; regresión exige `401`. |
| **H-03, T2: IDOR de lectura.** Un usuario ve ticket y datos de cliente ajenos. RS-03, CA-02. | **PoC-03** Burp/Postman: `viewer` recibió ticket ajeno con `200`. OWASP A01, CWE-639, CVSS 8.1. | No lo demuestra ZAP baseline. `DET-03` registró `ticket_foreign_access`; el WAF no conoce propiedad de objetos. | `GET /api/tickets/:id` devuelve `403` a quien no es dueño ni asignado; reprueba `403` en `DetectionOnly`; regresión confirma además acceso válido de admin. |
| **H-02, T1: XSS reflejado.** Riesgo para sesión y datos del operador que consulta tickets. RS-05, CA-05. | Hallazgo DAST H1 con evidencia; **sin PoC individual de Burp H2**. | `DET-04` y `403` corresponden a una prueba local adicional de XSS, no a PoC-01/02/03. | Sin corrección específica documentada en H4. |
| **H-05, U1: hashes expuestos.** Divulgación de datos de autenticación. RS-04. | Se observó `passwordHash` dentro de la respuesta de PoC-01; no es una cuarta PoC independiente. | `DET-02` identifica el JWT alterado, no impide que una sesión legítima lea hashes. | Sigue presente en `routes/users.ts`; riesgo residual. |
| **H-06/H-07, A1-A2 y transversal: cookie/cabeceras y CORS.** Mayor exposición de sesiones y navegador. | Hallazgos DAST H1; sin PoC individual de Burp H2. | ZAP baseline observó cabeceras faltantes; el WAF no sustituye la política de origen ni atributos de cookie. | Sin corrección específica; riesgo residual del laboratorio. |
| **H-08, U2-U3: rol aceptado del cliente.** Escalada de privilegios y alteración de cuentas. RS-02, CA-03. | Hallazgo H1; sin PoC individual H2. | No existe detección específica demostrada para este abuso lógico. | `POST /api/users` y `PUT /api/users/:id/role` siguen sin autorización por rol; riesgo residual. |
| **H-09, A1/O1: login sin límite.** Intentos repetidos contra cuentas y disponibilidad. RS-06, CA-06. | Hallazgo H1; sin PoC individual H2. | El SIEM recibe eventos de tráfico, pero no se documentó una regla de ráfagas ni un `429`. | Sin corrección específica; riesgo residual. |
| **H-10, A1-A2: errores detallados.** Filtración de detalles internos. | Hallazgo H1; sin PoC individual H2. | Los escaneos pueden señalar exposición, sin sustituto de revisión de respuesta. | H4 retiró el detalle SQL del login, pero el manejador global aún incluye `message` y `stack`; corrección parcial. |

La búsqueda de tickets `q` concatena SQL y las operaciones `PUT`/`DELETE` de tickets no autorizan el objeto. Son riesgos observables en el código y relacionados con T1/T4/T5; no se presentan como PoC de Burp ya ejecutadas. La [matriz de H2](hito-2/README.md) también marca esos límites.

## 5. Gate, WAF y falsas alarmas

El [workflow](../.github/workflows/devsecops.yml) corre en cada push y PR. Sus cuatro controles publican Semgrep, SCA, CycloneDX y ZAP baseline. El [umbral aprobado](hito-2/revision-gate.md) propone cero errores de Semgrep, cero SCA high/critical y cero alertas altas de ZAP para un futuro modo `bloqueo`. Hoy `SECURITY_GATE` permanece en `reporte` para observar una aplicación de laboratorio con fallos conocidos. Cada dependencia vulnerable que siga después de H4 necesita excepción específica con hallazgo, razón, responsable y revisión; la aceptación genérica «hasta H4» ya no basta.

El WAF queda configurado en `On` para H3 con CRS activo. En el laboratorio se comprobó el `403` de SQLi y respuestas `200` de flujos normales. La exclusión `10001` retira solo la evaluación de `Host: 127.0.0.1` en la regla `920350`; no desactiva el CRS. No se observó un falso positivo adicional que justifique otra exclusión. JWT e IDOR requieren la autorización de la API y fueron corregidos en H4.

## 6. Riesgo residual, PASTA etapa 7

El diseño priorizó tres riesgos de negocio y H4 corrigió las tres PoC explotadas. **Esto no convierte a Secure CRM en una aplicación segura para producción.** Continúan, entre otros, la búsqueda SQL de T1, escritura y borrado de tickets ajenos en T4/T5, exposición de hashes en U1, cambios de rol sin autorización en U2/U3, login sin límite y errores detallados. La contraseña se procesa con `weakHash` y existe un secreto JWT de reserva para el laboratorio. En las condiciones del curso, se mantiene el acceso limitado a la instancia local, datos de prueba, API no publicada directamente y WAF activo. La [tabla de H1](hito-1/README.md) permite priorizar correcciones futuras por objetivo afectado y requisito incumplido.

## 7. Auditoría y uso de asistencia

El [registro de H4](hito-4/README.md) identifica la herramienta, resume los prompts, muestra los cambios de JWT, SQLi e IDOR, y documenta revisión humana del diff. La respuesta literal completa de la herramienta no está preservada en ese registro; por ello la documentación de H4 aún debe completarse con el historial auténtico que conserve el equipo, si está disponible. En este cierre se usó asistencia para fortalecer la regresión de SQLi, añadir el job de pruebas al CI y conciliar la trazabilidad. Las cinco regresiones y la compilación se ejecutaron localmente. Ningún documento atribuye al Equipo rojo una prueba realizada por otro integrante.

## 8. Lecciones y entrega

- Un DFD útil une la navegación A1-T5-U3 con datos, límites de confianza y efecto de negocio; de ahí salen requisitos comprobables.
- ZAP baseline, Burp, Kibana y regresiones responden preguntas distintas. Una señal de CI verde en modo reporte no valida autorización por objeto.
- SQLi ofrece la demo completa: ataque -> `DET-01` -> WAF `403` -> corrección en la API -> misma PoC rechazada con WAF en observación.
- Los fallos lógicos de JWT e IDOR deben corregirse en la API. Un bloqueo genérico del WAF sobre rutas legítimas produciría falsas alarmas.

**Antes de subir a Canvas:** realizar la demo conjunta Red-Blue descrita en [estado de H3](hito-3/estado-actual.md), guardar capturas actuales de Actions/SBOM y Kibana, verificar la nueva corrida del job de regresión, incorporar la respuesta auténtica de la asistencia si existe y revisar este informe con los cuatro integrantes. El PDF derivado de este archivo se entrega en Canvas con el enlace al repositorio; no consta aquí que se haya realizado esa entrega.
