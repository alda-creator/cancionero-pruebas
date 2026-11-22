# Cancionero — inventario maestro y plan de trabajo

**Documento vivo.** Actualizar este inventario al cerrar cada mejora. No eliminar elementos: cambiar su estado a implementado, pospuesto, descartado con motivo o pendiente de auditoría.

**Fecha objetivo de preparación:** 20 de diciembre de 2026  
**Entorno de trabajo:** `alda-creator/cancionero-pruebas`  
**Producción:** `alda-creator/cancionero` permanece congelado; no modificar producción ni su Firebase sin autorización explícita.

## 1. Reglas de trabajo

1. Toda función nueva se desarrolla primero en una rama de trabajo del repositorio de pruebas.
2. Revisar compatibilidad con canciones antiguas, modo offline, cola de sincronización, Mi Set y sincronización Director/Músico antes de integrar.
3. No anunciar una prueba hasta que el cambio esté integrado en `main` del repositorio de pruebas y la vista previa esté disponible.
4. No hacer cambios en Firebase de producción ni publicar a producción sin autorización explícita.
5. Priorizar estabilidad y utilidad para la reunión del 20 de diciembre. Las mejoras que no quepan se conservan en este inventario para versiones posteriores.
6. El rediseño visual general se deja para después de completar las funciones prioritarias, salvo que un problema visual impida utilizar una función.

## 2. Funciones implementadas y confirmadas

| Función | Estado | Nota |
|---|---|---|
| PWA instalable y funcionamiento offline | Implementada y probada | El usuario confirmó uso sin conexión. |
| Persistencia local de datos y Mi Set | Implementada | Verificar en auditoría final los casos de recuperación. |
| Mi Set personalizado por tono | Implementado y probado | Los tonos sobreviven al cierre de la PWA y al uso offline. |
| Secuencia personalizada de bloques por canción | Implementada y probada | Agregar, repetir, quitar, reordenar y restaurar secuencia original. |
| Mi Set frente a pestaña Todas | Implementado y probado | Mi Set usa personalizaciones; Todas conserva tono y orden originales. |
| Sincronización Director/Músico | Implementada y probada | La secuencia remota es temporal y no sobrescribe el Mi Set local del músico. |
| Navegación remota a bloque | Implementada y probada | Usa identificadores de instancia para bloques repetidos. |
| Auto-Scroll y sincronización de lectura | Implementados | Preservar durante cambios del motor y del editor. |
| Gestos de navegación | Implementados | Auditar solo si se detectan problemas reales. |
| Búsqueda de canciones | Implementada | Filtros avanzados quedan pendientes. |
| Modo oscuro | Implementado | Rediseño visual general pospuesto. |
| Transposición básica | Implementada | El motor está en proceso de ampliación y pruebas. |
| Notación anglosajona/latina | Implementada | Preferencia local C-D-E / Do-Re-Mi; auditar compatibilidad con nuevos acordes. |

## 3. Plan prioritario para el 20 de diciembre

Orden de trabajo recomendado. El orden podrá ajustarse si las pruebas descubren dependencias o riesgos.

| Prioridad | Mejora | Estado | Criterio de aceptación |
|---|---|---|---|
| P0 | Motor unificado de reconocimiento y transposición de acordes | Implementado y probado por usuario | Reconoce y transpone acordes básicos, extendidos, alterados, inversiones y bajos; conserva sufijos y espaciado; funciona en ambas nomenclaturas. |
| P0 | Selector manual de tonalidad original independiente del primer acorde | Implementado y probado por usuario | En alta/edición se selecciona y guarda la tonalidad original; el detector de primer acorde solo sugiere, y las canciones antiguas conservan su tonalidad. |
| P0 | Biblioteca/diccionario de acordes | Implementación inicial v1.1.21 en rama; pendiente pruebas | Consulta fórmulas y notas por raíz de 25 familias de acordes, variantes, búsqueda y notación latina/anglo. Diagramas de guitarra quedan por completar/validar. | Variantes y equivalencias, nombres latinos, bajos alternativos y diagramas/posiciones de guitarra. |
| P0 | Editor visual de acordes sobre la letra | Primera versión publicada y validada por usuario; UX móvil v1.1.22 en rama | Modelo estructurado, conversión conservadora, edición dentro de una sola vista previa y controles contextuales. Líneas largas usan desplazamiento horizontal para conservar alineación sin empalmes. Pendiente integrar esta iteración y validar Safari/iPhone, Firestore y modo offline. Ver `docs/EDITOR_ACORDES_ESTRUCTURADOS.md`. |
| P0 | Compatibilidad con pegado e importación de canciones antiguas | Pendiente | Reconoce formatos antiguos cuando sea posible; conserva siempre el texto original y ofrece alternativa manual si hay ambigüedad. |
| P1 | Migración conservadora al modelo estructurado | Conversión bajo demanda integrada en rama | Al guardar una canción, se añade la estructura solo si la conversión es inequívoca; las canciones ambiguas permanecen en formato heredado. `rawText` se conserva. |
| P1 | Modo proyección/pantalla externa | Pendiente | Presenta letra y acordes o solo letra; el Director controla lo que se proyecta. |
| P1 | Mejoras de estado del Director | Pendiente | Identifica músicos conectados y muestra su estado de conexión de forma útil. |
| P1 | Indicador de conexión/offline | Pendiente de auditoría | El usuario distingue claramente conexión, desconexión y sincronización pendiente. |
| P1 | Aviso de actualización de la PWA | Pendiente de auditoría | Informa cuando hay versión nueva y permite actualizar sin perder datos locales. |
| P1 | Exportación/importación de respaldo | Pendiente | Copia recuperable de canciones y configuraciones; validación antes de importar y protección contra sobrescrituras accidentales. |
| P1 | Mantener pantalla encendida | Pendiente | Opción durante el uso de lectura/servicio, con degradación segura si el navegador no lo soporta. |
| P1 | Acción «Iniciar servicio» en Mi Set | Pendiente de auditoría | Revisar si ya existe parcialmente; iniciar la secuencia de servicio con el flujo más directo posible. |
| P1 | Editor enriquecido de bloques | Pendiente de auditoría | Crear/editar bloques como Intro, Verso, Pre-Coro, Coro, Puente, Interludio, Solo, Instrumental y Final; conservar las secuencias personalizadas existentes. |

## 4. Mejoras complementarias para versiones posteriores

No se descartan. Se mantienen registradas y se priorizarán después de asegurar las funciones esenciales.

| Mejora | Estado / siguiente paso |
|---|---|
| Rediseño de la pantalla de inicio | Pospuesto hasta completar funciones. |
| Vista horizontal y diseño de dos columnas para tabletas | Pendiente. |
| Filtros avanzados de búsqueda | Pendiente. |
| Canciones favoritas | Pendiente. |
| Estadísticas básicas del repertorio y uso | Pendiente; definir qué datos aportan valor sin invadir privacidad. |
| Auditoría de canciones duplicadas | Pendiente; detectar y reportar, nunca fusionar ni borrar automáticamente. |
| Selección directa de tono y visualización de tono original/actual | Auditar lo existente y completar si falta. |
| Preferencias de nomenclatura musical | Auditar; ya existe preferencia local de notación anglosajona/latina. |
| Mejoras adicionales de gestos y navegación | Solo si las pruebas identifican fricción real. |
| Ajustes visuales del editor de Mi Set | Pospuestos; el usuario confirmó que la ubicación actual no es ideal, pero prefiere terminar funciones primero. |

## 5. Seguridad y preparación para producción

| Tema | Estado | Condición para publicar |
|---|---|---|
| Reglas de Firebase y permisos por rol | Pendiente crítico | Diseñar y probar roles reales (Director, músico, administrador); no asumir que autenticación anónima equivale a autorización. |
| Acceso de edición a canciones compartidas | Riesgo conocido en Firebase de pruebas | Actualmente la autenticación anónima permite permisos compartidos amplios; no replicar esa regla en producción. |
| Costos y cuotas de Firebase | Revisar antes de ampliar uso | Vigilar cuotas, lecturas/escrituras, tráfico y necesidad real de cambiar de plan. |
| Compatibilidad offline/sincronización | Auditoría final | Probar cola de cambios, reconexión, conflictos y recuperación sin pérdida de datos. |
| Compatibilidad con canciones antiguas | Auditoría final | Probar formatos históricos y canciones con estructuras incompletas. |
| Director, Músico y pantalla de lectura | Auditoría final | Probar varios dispositivos simultáneos, desconexiones y reconexiones. |
| Service worker y actualización de PWA | Auditoría final | Verificar caché, nueva versión y actualización sin dejar una versión obsoleta bloqueada. |

## 6. Lista de verificación antes de la reunión

- [ ] Las funciones prioritarias están integradas en la rama principal del entorno de pruebas.
- [ ] Pruebas reales en iPhone y, si está disponible, en más de un dispositivo simultáneo.
- [ ] Pruebas con conexión, sin conexión y reconexión.
- [ ] Cerrar y volver a abrir la PWA sin perder tonos, secuencias ni cambios guardados.
- [ ] Probar canciones nuevas y canciones antiguas.
- [ ] Probar transposición en ambas nomenclaturas, incluyendo inversiones y acordes extendidos.
- [ ] Probar Director/Músico, repetición de bloques y navegación remota.
- [ ] Probar modo proyección en el equipo que se utilizará en la reunión.
- [ ] Crear y restaurar un respaldo de prueba.
- [ ] Revisar permisos y reglas de Firebase antes de cualquier publicación.
- [ ] Congelar cambios no esenciales y preparar una versión estable para el evento.

## 7. Registro de versiones y cambios

- **v1.1.18:** Mi Set por tono y secuencia personalizada de bloques; funcionamiento offline y persistencia confirmados por el usuario en dos iPhone.
- **v1.1.19:** Motor unificado de reconocimiento/transposición de acordes; pruebas funcionales del usuario confirmadas.
- **v1.1.20:** selector manual de tonalidad original independiente del primer acorde; pruebas funcionales confirmadas por usuario.
- **v1.1.21:** biblioteca consultiva de acordes, fórmulas y notas; integrada en el entorno de pruebas.
- **Iniciativa en curso:** editor de acordes estructurados. PR #38 y UX v1.1.22 integrados en laboratorio. Nueva corrección v1.1.23 en rama `fix/editor-preservar-acordes-reflow`: reconciliar letra sin descartar acordes, bloquear guardado si la reconciliación falla y reflujo vertical automático para lectura en vivo. Pendiente validar Safari/iPhone, Auto-Scroll, Director/Músico, Firestore y offline.
- **Rama de implementación del motor:** `feature/acordes-configurables`.
- **Trabajo anterior:** biblioteca de acordes (v1.1.21), rama `feature/biblioteca-acordes`.  
- **Trabajo actual:** UX móvil del editor estructurado (v1.1.22), rama `feature/editor-integrado-alineacion-movil`.


## 8. Estrategia de transición al formato estructurado (prioridad de arquitectura)

- **Dirección acordada:** el formato estructurado será el estándar; el texto heredado se reducirá gradualmente como ruta principal, pero seguirá como respaldo seguro.
- **Política:** migración bajo demanda, reversible, validada, con original preservado; no se realizarán conversiones masivas automáticas.
- **Fases:** inventario/diagnóstico sin alterar datos; filas instrumentales y bloques flexibles; editor único; conversor/adaptador robusto; render común; detección de tonalidad; menús compactos de bloques; herramientas de migración asistida; retiro gradual de rutas heredadas cuando haya evidencia de cobertura y seguridad.
- **Casos críticos:** acordes sin letra (INTRO/interludios), formatos mixtos, tabulaciones, acordes desplazados, canciones recién agregadas que no convierten y muestras históricas. Ningún caso ambiguo debe provocar pérdida o sobrescritura silenciosa.
- **Documento de política:** `docs/ESTRATEGIA_MIGRACION_FORMATO.md`.
- **No se autoriza en esta fase:** cambios a producción, Firebase, reglas, ni migración masiva de biblioteca.
