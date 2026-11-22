# Diagnóstico técnico de canciones (fase 0)
Este módulo analiza datos locales suministrados, sin modificar ni guardar canciones. No lee Firestore ni ejecuta migración.
Clasificaciones: `structured-valid`, `structured-invalid`, `legacy-convertible`, `legacy-ambiguous`, `empty`.
Se contabilizan líneas, líneas de acordes reconocidas, etiquetas de sección, tabulaciones y filas instrumentales estructuradas.
La herramienta está pensada para alimentar una auditoría de una muestra o exportación voluntaria, no para recorrer la biblioteca remota automáticamente.
