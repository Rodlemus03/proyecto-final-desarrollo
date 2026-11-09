# Hito 2 · Pipeline DevSecOps y aporte del Equipo azul

Aplicación: Secure CRM. El pipeline es responsabilidad de los cuatro integrantes. En este hito, el Equipo azul verifica los controles automáticos y justifica el umbral del *security gate* junto con el grupo. El Equipo rojo realiza por separado ZAP y Burp contra la instancia local a través del WAF en `DetectionOnly`, confirma al menos tres PoC y documenta OWASP Top 10:2025, CWE y CVSS v3.1.

## Pipeline del grupo

El workflow [`.github/workflows/devsecops.yml`](../../.github/workflows/devsecops.yml) se ejecuta en `push`, `pull_request` y manualmente. Usa el Compose de la raíz para el ZAP baseline automático sobre `http://localhost:3000/login`. La sesión ofensiva del Equipo rojo usa el Compose de `waf-siem/` y el puerto `8080`; son evidencias distintas.

| Control | Ejecución | Artefacto |
|---|---|---|
| SAST | Semgrep con `p/default` y `p/owasp-top-ten` | `semgrep.sarif` |
| SCA | `pnpm audit --prod --json` sobre el lockfile del monorepo | `pnpm-audit.json` |
| SBOM | Syft, formato CycloneDX JSON | `sbom.cdx.json` |
| DAST automático | ZAP baseline pasivo sobre `/login`, después de verificar web y API | `reporte-zap.html` y `reporte-zap.json` |

El baseline de ZAP es pasivo y solo recorre lo alcanzable desde la página pública. No demuestra que los PoC autenticados o los fallos de lógica de la API estén ausentes; esa evidencia corresponde a las pruebas del Equipo rojo y a las regresiones de H4.

## Evidencia de una corrida real

Corrida de la rama `codex/hito-2-blue-team` del **9 de noviembre de 2026**, commit [`4cff3bc`](https://github.com/mar22266/proyecto-final-desarrollo/commit/4cff3bc1dbacc0a41c457f6f5cd90dc733f8b712): [DevSecOps #42665284624](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42665284624). Los cuatro jobs terminaron correctamente y se publicaron los cuatro artefactos después de validar los reportes y el resultado técnico de ZAP. La [corrida anterior de `main`](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42656069281) sirve como línea base de comparación; las métricas se mantuvieron.

| Control | Resultado observado en el reporte | Evidencia |
|---|---|---|
| SAST | 16 resultados en SARIF; el paso del gate encontró **2 `ERROR`**, ambos por ejecutar contenedores sin `USER` explícito. | [Artefacto Semgrep](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42665284624/artifacts/13695504647) |
| SCA | 159 dependencias de producción; 4 avisos `low`, 24 `moderate`, **19 `high` y 6 `critical`**. El gate contó 25 `high/critical`. | [Artefacto SCA](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42665284624/artifacts/13695044634) |
| SBOM | CycloneDX 1.6; 308 componentes y 124 relaciones de dependencia en el JSON generado. | [Artefacto SBOM](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42665284624/artifacts/13697165020) |
| ZAP baseline | 12 tipos de alerta: 0 de riesgo alto, 2 medio, 6 bajo y 4 informativas. Entre las medias figuran CSP y protección contra *clickjacking* ausentes. | [Artefacto ZAP](https://github.com/mar22266/proyecto-final-desarrollo/actions/runs/42665284624/artifacts/13696556223) |

**Cómo leer el verde de Actions:** `SECURITY_GATE: "reporte"` permite que los pasos del gate registren hallazgos sin hacer fallar el job. En esta corrida, los pasos de SAST y SCA devolvieron código 1, aunque sus jobs concluyeron `success`. Por tanto, `success` confirma que los controles corrieron y publicaron evidencia; no significa que el código haya pasado los umbrales de bloqueo.

### Lectura inicial de los hallazgos del gate

Los **25 avisos `high/critical`** de SCA son avisos del inventario de dependencias, no 25 explotaciones confirmadas. El JSON del artefacto muestra estas rutas de dependencia:

| Paquete afectado | Ruta y versión directa del proyecto | Avisos `critical` | Avisos `high` | Prioridad de revisión |
|---|---|---:|---:|---|
| `next` | `apps/web` → `next@14.2.15` | 4 | 11 | Revisar qué avisos aplican a las funciones usadas y planificar actualización compatible. |
| `lodash` | `apps/api` → `lodash@4.17.11` | 1 | 3 | Revisar el uso de Lodash y una versión corregida. |
| `jsonwebtoken` | `apps/api` → `jsonwebtoken@8.5.1` | 0 | 1 | Revisar actualización junto con la corrección de verificación de firma prevista en H4. |
| `proxy-addr`, `body-parser` | Transitivas de `express` en `apps/api` | 1 | 1 | Revisar la cadena de Express y sus versiones resueltas en el lockfile. |
| `postcss`, `source-map-js` | Transitivas de `next` en `apps/web` | 0 | 3 | Revisar si la actualización de Next corrige también la cadena transitiva. |

El gate de Semgrep encontró **dos `ERROR`** por la ausencia de un `USER` explícito en [`apps/api/Dockerfile`](../../apps/api/Dockerfile) y [`apps/web/Dockerfile`](../../apps/web/Dockerfile). Esto describe la ejecución de los contenedores; no se atribuye a un PoC de aplicación del Equipo rojo. Antes de cambiar los Dockerfiles hay que comprobar permisos de la base SQLite, del build de Next y del arranque. El baseline pasivo de ZAP no tuvo alertas altas, aunque sí señaló cabeceras faltantes de riesgo medio.

## Umbral del security gate

El umbral configurado y propuesto al grupo para este laboratorio es **cero hallazgos de severidad `ERROR` en Semgrep, cero vulnerabilidades `high/critical` en dependencias de producción y cero alertas de riesgo alto en el ZAP baseline**. El SBOM debe generarse como artefacto, pero no tiene un umbral de vulnerabilidades propio.

| Control | Umbral y razón | Línea base del 9 de noviembre |
|---|---|---|
| Semgrep | Cualquier `ERROR` exige revisión porque indica un riesgo de código o configuración de alta severidad. | 2: superaría el gate. |
| `pnpm audit --prod` | Un aviso `high` o `critical` en dependencias usadas al ejecutar la app exige remediación o una excepción documentada. Los avisos `low/moderate` quedan visibles en el reporte. | 25: superaría el gate. |
| ZAP baseline | Una alerta de riesgo alto en páginas públicas exige revisión. Las demás se conservan como evidencia para priorizar. | 0: pasaría el gate. |

El workflow queda en `reporte` mientras Secure CRM siga deliberadamente vulnerable. En `bloqueo`, un resultado por encima de cualquiera de esos umbrales hace fallar el job correspondiente. Un fallo técnico del escaneo o un reporte faltante **sí** debe fallar incluso en `reporte`; el workflow valida el JSON de SCA y ZAP, el código de salida de ZAP y la existencia de los artefactos.

Este gate no sustituye las pruebas de autorización por objeto, firma JWT o regresión de H4. Al revisar una corrección se debe comparar su resultado con los PoC del Equipo rojo, además de mirar el pipeline.

## Relación con el diseño del Hito 1

Los controles automáticos dan una señal parcial sobre los [requisitos de seguridad](../hito-1/README.md#5-requisitos-de-seguridad-verificables): Semgrep revisa patrones de código y configuración; SCA revisa dependencias; ZAP revisa pasivamente la superficie pública; el SBOM inventaría componentes. Los requisitos RS-01 a RS-05 necesitan también los PoC y pruebas de regresión. RS-06 a RS-08 requieren evidencia del WAF/SIEM en H3. La matriz final debe distinguir qué control observó realmente cada hallazgo.

## Evidencia pendiente para cerrar H2 completo

- Conservar la corrida de Actions de esta rama y el artefacto SBOM enlazados arriba; agregar las capturas de la corrida y del artefacto que pide la guía visual antes de la entrega en Canvas.
- Equipo rojo: guardar en `docs/hito-2/` el reporte de ZAP contra `localhost:8080`, las parejas petición/respuesta de **al menos tres PoC** en Burp, la clasificación y el CVSS justificado métrica por métrica.
- Equipo rojo: repetir los PoC confirmados en Postman y anotar hora, ruta y resultado para que el Equipo azul pueda encontrarlos en Kibana durante H3.
- Grupo: revisar conjuntamente el umbral anterior y registrar cualquier excepción con hallazgo, justificación, responsable y fecha de revisión.

No se atribuyen al Equipo rojo los reportes del baseline automático ni se presentan como evidencia de sus PoC manuales.

## Uso de IA en esta entrega

Se usó **Codex (OpenAI)** para analizar el workflow y los artefactos de la corrida, proponer validaciones de reportes y redactar esta línea base. La solicitud fue avanzar con el Hito 2 del Equipo azul. Los cambios generados son el ajuste de fiabilidad en `devsecops.yml` y esta documentación. El grupo debe revisar el diff y la nueva corrida antes de integrar la rama; no se han agregado dependencias ni secretos.
