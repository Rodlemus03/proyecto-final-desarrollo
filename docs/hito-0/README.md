# Hito 0 · Arranque del Proyecto Final Integrador

Aplicación del grupo: Secure CRM, la misma del Proyecto DAST. La [guía del curso](https://locano-uvg.github.io/proyecto_integrador/#enunciado) indica usar esta aplicación cuando es la del grupo y copiar el entorno `waf-siem/` al repositorio del proyecto. El PDF del curso usa Juice Shop como referencia, pero la guía aclara esta diferencia.

## Integrantes y roles

| Integrante | Equipo | Responsabilidad |
|---|---|---|
| Davis Roldán | Rojo | Reconocimiento y superficie de ataque en H1; PoC en H2 |
| Julio Lemus | Rojo | Hallazgos DAST y pruebas ofensivas en H2 |
| Andre Marroquín | Azul | Configuración común y controles de verificación |
| Gabriel Paz | Azul | Observabilidad y verificación del WAF/SIEM |

El DFD, STRIDE, PASTA, los casos de abuso y el informe son responsabilidad compartida. La parte asignada al Equipo rojo permanece indicada como pendiente en [Hito 1](../hito-1/README.md).

El repositorio del grupo tiene la etiqueta pública de GitHub [`proyecto-final`](https://github.com/topics/proyecto-final).

## Entorno configurado

Se copió la plantilla `waf-siem/` de la rama `feat/proyecto-final` del repositorio de la guía y se adaptó a Secure CRM. Este es el Compose que se usa para el Proyecto Final:

```text
Navegador ──► web :3000 ──► WAF :8080 ──► API interna :4000 ──► SQLite
                          │
                          └──► logs WAF ──► Filebeat ──► Elasticsearch ──► Kibana :5601
```

| Componente | Acceso desde esta laptop | Estado inicial |
|---|---|---|
| Web Next.js | `http://127.0.0.1:3000` | Llama a la API por `http://localhost:8080` |
| WAF ModSecurity + OWASP CRS | `http://127.0.0.1:8080` | `DetectionOnly`: registra sin bloquear |
| API Express | Puerto `4000` solo interno en Docker | No está publicado al host |
| Elasticsearch | `http://127.0.0.1:9200` | Nodo único; `yellow` o `green` es aceptable |
| Kibana | `http://127.0.0.1:5601` | Data view `filebeat-*`, tiempo `@timestamp` |

El WAF permite los métodos usados por la API (`GET`, `HEAD`, `POST`, `OPTIONS`, `PUT`, `DELETE`). `WAF_BIND=127.0.0.1` evita exponer el laboratorio a otras máquinas. La API no tiene `ports:` en este Compose, de modo que no se puede saltar el WAF con `localhost:4000`. La web se sirve directamente por `3000`, como interfaz; sus peticiones a la API pasan por `8080`.

La configuración activa de esta laptop está en `waf-siem/.env`, ignorado por Git. `waf-siem/.env.example` contiene los valores de arranque sin credenciales privadas. Elasticsearch y Kibana tienen la seguridad deshabilitada **solo para este laboratorio local**. Se usan únicamente cuentas y datos de prueba: la auditoría del WAF puede registrar el cuerpo de peticiones.

## Arranque y verificación en Windows

Desde `waf-siem/`:

```powershell
Copy-Item .env.example .env  # solo si aún no existe
docker compose up -d --build
& 'C:\Program Files\Git\bin\bash.exe' './scripts/verificar.sh' todo
docker compose ps
```

El Compose de la raíz corresponde al laboratorio DAST anterior y publica la API directamente. Para este proyecto se usa el Compose de `waf-siem/`. No ejecuten ambos al mismo tiempo: compiten por el puerto de la web.

Para consultar el funcionamiento:

1. Abrir `http://127.0.0.1:3000` para la interfaz.
2. Abrir `http://127.0.0.1:8080/api/health` para comprobar la API por el WAF.
3. Abrir `http://127.0.0.1:5601/app/discover`, seleccionar el data view `filebeat`, rango *Last 15 minutes* y buscar `fields.fuente : "waf-access"`.
4. La colección y el environment de Postman están en `waf-siem/postman/`. La prueba de acceso directo a `4000` debe fallar en esta configuración.

Para detener el entorno y conservar índices y logs: `docker compose down` desde `waf-siem/`. No usar `down -v` si se desea conservar la evidencia.

## Evidencia de verificación

El registro de la prueba local está en [verificacion-2026-11-03.txt](verificacion-2026-11-03.txt). La web, el health por el WAF, el login de prueba y el listado de tickets respondieron; el puerto directo `4000` no respondió. Elasticsearch y Kibana estuvieron disponibles, Filebeat conectó y Discover mostró eventos `waf-access` de las solicitudes.

Esta prueba verifica el arranque y la observabilidad del H0. No incluye escaneo ni PoC del Equipo rojo. La superficie de ataque y la selección de hallazgos DAST siguen pendientes de ese equipo para cerrar H1.
