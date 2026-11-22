# Estrategia de evolución al formato estructurado

**Estado:** propuesta aprobada para orientar el desarrollo; implementación gradual, reversible y protegida.
**Alcance:** entorno de pruebas del Cancionero. No modificar producción ni Firebase durante esta iniciativa.

## Objetivo
El formato estructurado de canción será el estándar futuro para edición, representación, transposición, Director/Músico y Mi Set. El formato heredado de texto plano se mantendrá como compatibilidad temporal y respaldo; su uso se reducirá por etapas, sin borrado ni migraciones masivas inseguras.

## Principios de migración
1. **Conservar siempre el original:** mantener una copia del texto fuente y, cuando corresponda, el registro previo antes de migrar.
2. **Migrar por canción y bajo demanda:** no convertir toda la biblioteca automáticamente al abrir o actualizar la PWA.
3. **Conversión reversible y auditada:** registrar resultado, versión del conversor, advertencias y origen; evitar modificar el texto fuente hasta que la estructura se valide.
4. **No adivinar silenciosamente:** ante ambigüedad, conservar la fuente, explicar qué no se pudo interpretar y ofrecer revisión asistida.
5. **Estructura parcial válida:** admitir bloques, filas solo de letra, filas de letra con acordes y filas instrumentales sin letra.
6. **Un único contrato para las vistas:** editor, lector, Mi Set, Director/Músico deben consumir una representación común o una capa adaptadora que entregue la misma estructura; los fallbacks no deben mantener visores paralelos indefinidamente.
7. **No degradar funciones:** conservar notación latina/anglo, transposición, auto-scroll, offline, sincronización, orden de bloques e IDs usados por funciones existentes.
8. **Pruebas antes de avanzar:** cada fase debe incluir pruebas automatizadas, revisión de datos y pruebas reales en móvil, sincronización y offline cuando aplique.
9. **Migración por lotes opt-in en fases futuras:** solo después de validar el conversor, ofrecer herramientas para revisar canciones, migrar un grupo, restaurar respaldo y comparar antes/después. No implementar migración masiva automática sin una autorización y plan de recuperación explícitos.

## Fases de reducción del formato heredado
- **Fase 0 — Inventario y diagnóstico:** clasificar canciones por estructura, detectar patrones de texto, formatos mixtos, tabulaciones, acordes sin letra y casos ambiguos; producir diagnóstico sin alterar datos.
- **Fase 1 — Modelo estructurado completo:** incorporar filas instrumentales y bloques flexibles; acordes independientes de la letra y posiciones con significado definido.
- **Fase 2 — Editor unificado:** letra, acordes y bloques editables desde la misma superficie, con controles contextuales; sin paneles duplicados.
- **Fase 3 — Conversión/adaptación robusta:** parser más tolerante, importación asistida y adaptador de canciones sin estructura; la conversión nunca destruye el original.
- **Fase 4 — Render común:** un único render de lectura, compatible con todas las canciones adaptadas; reflujo vertical que conserva la relación musical entre texto y acordes.
- **Fase 5 — Detección de tonalidad y UX de bloques:** sugerir tonalidad con nivel de confianza, distinguir sugerida de confirmada; menús compactos para insertar estrofas, coros y secciones instrumentales.
- **Fase 6 — Herramientas de migración asistida:** revisión de estado, migración individual o por lotes seleccionados, respaldos, reporte de errores y restauración.
- **Fase 7 — Retiro gradual de rutas heredadas:** solo cuando métricas/pruebas y compatibilidad indiquen que las canciones y funciones críticas están cubiertas. El texto original permanece como respaldo exportable.

## Criterios de salida de una fase
- pruebas unitarias y de integración pertinentes;
- ninguna pérdida de letra, acordes, bloques o metadatos en pruebas de migración;
- canciones nuevas y muestras históricas representativas;
- verificación móvil y offline/sync según alcance;
- documentación actualizada y revisión del usuario antes de promover a producción.

## Muestras mínimas para el inventario/pruebas
- letra sin acordes;
- letra con acordes por encima;
- acordes al principio, medio y final de línea;
- acordes en offsets largos o fuera del ancho visible;
- líneas instrumentales sin letra y separadas por espacios;
- tabulaciones, espacios mixtos y saltos de línea;
- notación latina y anglosajona, alteraciones, extensiones e inversiones;
- etiquetas repetidas y bloques personalizados;
- canciones nuevas que fallaron conversión y canciones históricas que ya se adaptaron;
- texto Unicode y acentos;
- transposición, Mi Set, Director/Músico, Auto-Scroll, offline y sincronización.
