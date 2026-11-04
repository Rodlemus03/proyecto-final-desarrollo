# Entrega pendiente del Equipo rojo para cerrar Hito 1

Responsables: Davis Roldán y Julio Lemus. Trabajen solo con la instancia local del grupo, a través del WAF en `http://localhost:8080`. El WAF queda en `DetectionOnly` para H0–H2.

1. Revisen sus evidencias del Proyecto DAST y confirmen cuáles hallazgos de la tabla PASTA, etapa 5, fueron documentados. Agreguen la referencia a esas evidencias; no basta con repetir el enunciado de la guía.
2. Elaboren el mapa de superficie de ataque de Secure CRM con rutas y métodos, roles, entradas y salidas, datos en riesgo y los límites de confianza del DFD. Guárdenlo en `docs/hito-1/superficie.svg` o como imagen equivalente y agréguenlo a `README.md`.
3. Verifiquen en el entorno local que la API responde por `8080` y que `4000` no es accesible desde el host. Si encuentran otro camino directo a la API, documenten ese bypass. No prueben servicios públicos ni de terceros.
4. Señalen al menos tres hallazgos DAST candidatos para las pruebas del Hito 2 y relacionen cada uno con una entrada de su mapa. Los PoC, ZAP/Burp, CVSS y la clasificación final se hacen en H2.
5. Revisen con el Equipo azul el DFD, STRIDE, PASTA y los casos de abuso antes de declarar el Hito 1 cerrado.

El entorno, roles, controles del Equipo azul y el borrador común de diseño ya están preparados. Esta lista no afirma que el reconocimiento o los PoC del Equipo rojo estén hechos.
