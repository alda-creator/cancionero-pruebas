# Cancionero — hoja de ruta maestra

**Documento vivo y fuente de referencia del proyecto.** Actualizarlo al cerrar cada mejora, prueba o decisión. No volver a proponer como pendiente una función marcada como implementada y validada. No borrar elementos históricos: cambiar su estado y anotar el motivo.

**Última actualización:** 25 de noviembre de 2026  
**Fecha objetivo:** preparación para el evento del 20 de diciembre de 2026  
**Laboratorio:** `alda-creator/cancionero-pruebas`  
**Producción:** `alda-creator/cancionero`  
**Versión de laboratorio validada por el usuario:** v1.3.6 (PR #77); v1.3.7 en desarrollo

## 1. Reglas permanentes de trabajo

1. Desarrollar primero en una rama basada en `main` del repositorio de pruebas. No trabajar sobre ramas antiguas divergentes.
2. Hacer cambios pequeños y enfocados, con pruebas automatizadas, revisión de diff y validación real en iPhone/dispositivos cuando corresponda.
3. No anunciar una versión para probar hasta que esté integrada en el `main` del laboratorio y GitHub Pages haya publicado esa versión.
4. No modificar el repositorio de producción, Firebase de producción ni sus reglas sin autorización explícita.
5. No alterar canciones ni posiciones musicales guardadas como efecto secundario de cambios del editor o del renderizador.
6. Antes de cada promoción a producción: respaldo verificable, pruebas de regresión, revisión de Firebase/permisos, comprobación offline/sincronización y plan de reversión.
7. Actualizar esta hoja de ruta al terminar cada PR relevante. Marcar con claridad: implementado, probado por usuario, pendiente de validar, pendiente de desarrollar, aplazado o descartado.
8. No reconstruir funciones ya existentes. Si hay duda, auditar primero el código y la función real.

## 2. Funciones implementadas y confirmadas

| Función | Estado actual | Evidencia / alcance |
|---|---|---|
| PWA instalable y funcionamiento offline | Implementada y probada | El usuario confirmó uso offline. |
| Persistencia local de Mi Set | Implementada y probada | Tonos y secuencias sobreviven al cierre y al uso offline. |
| Mi Set: canciones, orden y repertorio personalizado | Implementado y probado | No volver a planificarlo como función nueva. |
| Mi Set: transposición individual por canción | Implementada y probada | No altera la tonalidad original de la biblioteca. |
| Mi Set: secuencia personalizada de bloques | Implementada y probada | Agregar, repetir, quitar y reordenar bloques. |
| Separación Mi Set / biblioteca Todas | Implementada y probada | Las personalizaciones de Mi Set no modifican la canción original. |
| Director/Músico: compartir canción, tono, orden y secuencia | Implementado y probado por el usuario | El músico recibe la organización del Director sin necesitar tenerla guardada en su propio Mi Set. |
| Notación independiente por dispositivo | Implementada y probada | Director y músico pueden usar CDE o Do-Re-Mi sin cambiar la secuencia compartida. |
| Sincronización de desplazamiento y Auto-Scroll | Implementada y probada | El músico sigue la lectura del Director. |
| GO_TO_BLOCK | Corregido y validado por el usuario | PR #69; el segundo bloque repetido ahora lleva a su instancia correcta. |
| Modo Director, animaciones y controles de seguimiento | Implementados y probados | El usuario confirmó funcionamiento correcto en v1.3.0, salvo la incidencia de instancia repetida indicada arriba. |
| Navegación entre canciones y gestos | Implementados y probados | PR #71 corrigió el reinicio de lectura al cambiar de canción en En Vivo. Validado por el usuario en iPhone; no modificar salvo regresión. |
| Notación anglosajona/latina | Implementada | Preferencia local por dispositivo: C-D-E / Do-Re-Mi. |
| Motor de reconocimiento y transposición de acordes | Implementado y probado | Incluye acordes básicos, extendidos, alterados e inversiones dentro de los casos ya validados. |
| Selector manual de tonalidad original | Implementado y probado | Independiente de la sugerencia basada en el primer acorde. |
| Editor unificado — edición contextual de letra y acordes | Implementado por etapas y validado en laboratorio hasta v1.3.6 | Edición por fila, preservación de offsets instrumentales/cola musical, arrastre táctil, rechazo seguro de destinos ocupados y desplazamiento horizontal independiente. Se conserva el respaldo heredado. |
| Distribución visual y ajuste de línea | Implementados y probados en v1.3.0 | Se recuperó el ajuste natural por palabras; sin desplazamiento horizontal global ni espacio lateral sobrante. |
| Visualización móvil y modo Director | Corregidos y probados en v1.3.0 | El usuario confirmó que el tamaño y encuadre regresaron a lo esperado. |
| Compatibilidad con posiciones después de la última palabra | Implementada y probada a nivel de modelo | Mantener pruebas de regresión para acordes al final de la frase. |

## 3. Incidencias y mejoras activas

### 3.1 GO_TO_BLOCK con bloques repetidos

**Estado:** corregido, desplegado y validado manualmente por el usuario en iPhone (PR #69, v1.3.1).

Caso reproducido por el usuario:
- Secuencia del Director: Estrofa 1 → Coro → Puente → Coro.
- El Director toca la etiqueta del segundo Coro.
- La pantalla del músico saltaba al primer Coro, no al segundo.

**Causa identificada:** el código principal enviaba y recibía `instanceId`, pero el wrapper de `director-fix.js` redefinía `goToRemoteBlock` aceptando solo `blockId`; descartaba la identidad de la aparición. El manejador original entonces elegía el primer bloque con ese mismo ID.

**Corrección aplicada:** el wrapper ahora acepta y reenvía `instanceId`. Se agregó una prueba de regresión para el recorrido emisor → wrapper → manejador. PR #69 también actualiza la versión de laboratorio a v1.3.1 y la caché PWA a v38.

**Validación manual:** el usuario confirmó que la navegación al segundo Coro funciona como debería y que las pruebas propuestas fueron satisfactorias. Incidencia cerrada.

**Pruebas automatizadas:** prueba de navegación repetida, modelo de acordes, diagnósticos, adaptador, documento y sintaxis inline; todas pasaron en CI para PR #69.

### 3.2 P1 — Separación visual de acordes en notación latina

**Estado:** aplazada intencionalmente; no modificar el motor estable ahora.

Observación del usuario: símbolos como `Mib/Sol` y `Fam` no se empalman, pero se ven más juntos que `Eb/G` y `Fm`. La lectura es posible para músicos experimentados, pero puede resultar menos clara para principiantes.

**Decisión:** conservar v1.3.0 como referencia estable. Más adelante investigar un ajuste visual específico y proporcional al ancho real de los símbolos latinos, sin cambiar posiciones musicales guardadas, reflujo, editor ni modo Director. Debe poder revertirse y pasar pruebas comparativas con ambas nomenclaturas.

### 3.3 P2 — Zoom automático al enfocar campos de texto en iPhone

**Estado:** observado por el usuario en la PWA instalada; pendiente de auditoría y corrección en una iteración posterior. No bloquea el uso ni la validación de v1.3.2.

**Comportamiento observado:** al tocar el campo para introducir la clave del Director o el campo de búsqueda, justo cuando aparece el teclado del iPhone, Safari amplía ligeramente el campo de texto. El usuario realiza las pruebas desde la PWA instalada en iPhone.

**Hipótesis técnica por verificar:** comportamiento habitual de Safari/WebKit en iOS cuando un campo enfocado tiene un tamaño de fuente inferior a 16 px. La PWA instalada sigue utilizando el motor del navegador del sistema, por lo que puede presentar el mismo comportamiento.

**Siguiente paso:** auditar los estilos efectivos (incluidos estilos responsivos y estados de foco) de los campos de búsqueda y clave del Director. Si alguno usa menos de 16 px, probar un ajuste a 16 px o más sin alterar la composición visual. Verificar también que no haya reglas de zoom/viewport que introduzcan efectos secundarios. Probar en PWA instalada y Safari, en orientación vertical y con teclado visible.

**Criterio de aceptación:** al enfocar ambos campos, el teclado aparece sin ampliación automática molesta; el tamaño del campo, la búsqueda, el ingreso de clave y el resto de la interfaz siguen funcionando correctamente. Mantenerlo como mejora de experiencia móvil de baja prioridad, separada del trabajo del editor unificado.

## 4. Siguiente proyecto principal — Editor unificado

**Estado:** etapa actual validada por el usuario en v1.3.6 (PR #74–#77). Se completó la validación manual del arrastre, protección de la letra al rechazar destinos ocupados, toque normal para insertar acordes y desplazamiento horizontal de filas. La unificación continúa por etapas; no se considera terminado todo el proyecto del editor. Siguiente iteración en desarrollo: renombrar secciones desde el encabezado del editor, sin cambiar IDs ni contenido musical.

Objetivo: integrar las superficies superior e inferior actuales en una sola experiencia coherente. La letra, los acordes y los bloques deben sentirse como elementos del mismo editor, sin obligar al usuario a cambiar de panel para completar operaciones relacionadas.

Alcance acordado:
- Un solo flujo de edición para letra y acordes.
- Insertar un acorde tocando la posición musical deseada, incluso entre palabras o después de la última palabra.
- Seleccionar, mover, reemplazar y eliminar acordes individualmente.
- Agregar y editar filas instrumentales sin letra (intro, interludio, solo, puente instrumental, final).
- Crear, renombrar, ordenar y editar bloques musicales.
- Mantener una experiencia táctil práctica en iPhone.
- Conservar conversión conservadora y compatibilidad con canciones heredadas.
- Compartir el mismo modelo musical entre editor, vista normal, En Vivo y Director.

**Primera iteración — edición de letra por línea (candidata v1.3.3):**
- Cada fila estructurada ofrece un control contextual para editar su letra sin acudir al campo de texto global.
- La edición usa `ChordModel.updateRowLyric`, que trabaja sobre una copia y conserva IDs/acordes; ajusta offsets según los cambios y valida antes de aceptar.
- Si la estructura puede serializarse sin pérdida, se actualiza también `rawText`; si no, se conserva el respaldo heredado original y `structuredContent` sigue siendo la fuente principal.
- Se mantiene el editor de texto anterior como respaldo durante esta fase; no se elimina ni se oculta hasta validar importación, edición y guardado.
- Prueba añadida: editar letra de una canción pegada de internet, serializar y volver a importar, comparando letra, símbolos y offsets de acordes.
- **Validado por el usuario:** edición de letra por fila y corrección del ciclo agregar/borrar/volver a agregar letra en filas instrumentales; las posiciones originales de los acordes se conservan. PR #74 y PR #75 integrados en laboratorio.

**Criterios de seguridad:**
- No modificar automáticamente canciones existentes por abrirlas.
- Preservar texto original y posiciones musicales durante conversiones.
- Si una conversión es ambigua, conservar el original y ofrecer edición manual.
- No guardar si la reconciliación entre letra y acordes falla.
- Añadir pruebas de regresión antes de cambiar el renderizador compartido.

## 5. Plan para el evento del 20 de diciembre

| Prioridad | Trabajo | Estado | Criterio de aceptación |
|---|---|---|---|
| P0 | Corregir GO_TO_BLOCK para instancias repetidas | Completado y validado | PR #69; el segundo Coro lleva al músico a su segunda instancia. |
| P0 | Editor unificado | Siguiente desarrollo | Edición integrada sin perder funciones ya validadas. |
| P2 | Evitar zoom automático en campos al abrir teclado en iPhone | Anotado; auditoría posterior | Buscar y clave del Director no deben provocar ampliación automática molesta. Véase sección 3.3. |
| P0 | Compatibilidad de canciones antiguas y nuevas | Auditoría continua | Ninguna canción pierde texto, acordes ni posiciones; conversiones ambiguas permanecen intactas. |
| P0 | Director/Músico y modo offline | Auditoría final | Tono, orden, secuencia, notación local y seguimiento correctos tras conexión, desconexión y reconexión. |
| P1 | Modo proyección/pantalla externa | Pendiente | Mostrar letra y acordes o solo letra; seguir la secuencia del Director. |
| P1 | Estado de músicos conectados | Pendiente | El Director identifica de forma útil quién está conectado y su estado. |
| P1 | Indicador de conexión/offline | Pendiente de auditoría | Diferenciar conectado, desconectado y cambios pendientes de sincronización. |
| P1 | Aviso de actualización PWA | Pendiente de auditoría | Informar de una versión nueva y actualizar sin perder datos locales. |
| P1 | Exportación/importación de respaldo | Pendiente | Respaldo recuperable, validado antes de importar y protegido contra sobrescritura accidental. |
| P1 | Mantener pantalla encendida | Pendiente | Opción durante lectura/servicio, con degradación segura si el navegador no lo soporta. |
| P1 | Acción "Iniciar servicio" desde Mi Set | Pendiente de auditoría | Revisar si existe parcialmente y completar el flujo solo si falta. |
| P1 | Editor enriquecido de bloques | Integrar en editor unificado | Intro, Verso, Pre-Coro, Coro, Puente, Interludio, Solo, Instrumental y Final; preservar secuencias existentes. |
| P1 | Biblioteca/diccionario de acordes | Implementación inicial existente; pruebas/diagramas pendientes | Fórmulas, notas, variantes, equivalencias y diagramas/posiciones de guitarra validados. |

## 6. Mejoras para versiones posteriores

| Mejora | Estado / siguiente paso |
|---|---|
| Separación visual de acordes largos en notación latina | Aplazada; anotada en sección 3.2. |
| Rediseño de pantalla de inicio | Pospuesto hasta completar prioridades. |
| Vista horizontal y dos columnas para tabletas | Pendiente. |
| Filtros avanzados de búsqueda | Pendiente. |
| Canciones favoritas | Pendiente. |
| Estadísticas básicas de repertorio/uso | Pendiente; definir valor y privacidad. |
| Auditoría de canciones duplicadas | Pendiente; detectar y reportar, nunca fusionar/borrar automáticamente. |
| Selección directa de tono y visualización de tono original/actual | Auditar lo existente; no duplicar selector manual ya implementado. |
| Preferencias de nomenclatura | Implementadas localmente; solo ampliar si hay necesidad real. |
| Mejoras adicionales de gestos/navegación | Solo si pruebas identifican fricción real. |
| Ajustes visuales de Mi Set | Pospuestos; no prioridad antes del evento. |
| Detección/sugerencia automática de tonalidad | Pendiente de completar/validar; sugerencia, nunca imposición automática. |

## 7. Seguridad, datos y estrategia de publicación

### 7.1 Política de producción

**Decisión:** publicar mejoras por versiones estables y acotadas; no esperar a terminar toda la hoja de ruta. Tampoco usar producción como entorno de pruebas.

Flujo obligatorio:
1. Desarrollo en rama del laboratorio.
2. Pruebas automatizadas y revisión del diff.
3. Integración en laboratorio y despliegue Pages verificado.
4. Pruebas manuales del usuario en iPhone y dispositivos pertinentes.
5. Aprobación explícita de la versión candidata.
6. Respaldo verificable de código y datos; documentar cómo restaurar.
7. Auditoría de Firebase, reglas, permisos, offline, sincronización y canciones heredadas.
8. Promoción controlada a producción con versión identificable.
9. Prueba de humo en producción y vigilancia de errores.
10. Si hay regresión, detener cambios y ejecutar el plan de reversión previamente probado.

La promoción a producción no implica migrar masivamente canciones ni cambiar reglas de Firebase. Esas acciones requieren revisión y autorización separadas.

### 7.2 Riesgos que bloquean una publicación

| Tema | Estado | Condición |
|---|---|---|
| Reglas de Firebase y permisos por rol | Pendiente crítico de auditoría | Verificar Director, músico y administrador; no asumir que autenticación anónima equivale a autorización. |
| Acceso de edición compartida en Firebase de pruebas | Riesgo conocido | No copiar reglas permisivas a producción. |
| Costos/cuotas Firebase | Revisar antes de ampliar uso | Revisar lecturas, escrituras, tráfico y límites. |
| Respaldo y restauración | Pendiente | Demostrar restauración en entorno de pruebas antes de depender del respaldo. |
| Cola offline y conflictos | Auditoría final | Probar cambios concurrentes, reconexión y recuperación sin pérdida. |
| Canciones heredadas | Auditoría final | Probar muestras históricas, formatos mixtos y estructuras incompletas. |
| Service worker | Auditoría final | Verificar caché, actualización y recuperación de versión obsoleta. |

## 8. Lista de verificación antes del evento

- [x] GO_TO_BLOCK lleva a la instancia exacta cuando hay bloques repetidos.
- [x] Cambiar canción en En Vivo reinicia la lectura al inicio, incluso después de desplazarse hasta el final (v1.3.2, PR #71).
- [ ] Auditar y corregir, si procede, el zoom automático al enfocar búsqueda y clave del Director en iPhone.
- [ ] Director/Músico comparte canción, tono, orden y secuencia personalizados.
- [ ] Cada dispositivo conserva su notación CDE/Do-Re-Mi.
- [ ] Desplazamiento manual y Auto-Scroll siguen correctamente al Director.
- [ ] Pruebas en iPhone y, si es posible, más de un dispositivo simultáneo.
- [ ] Pruebas con conexión, offline y reconexión.
- [ ] Cerrar y reabrir la PWA sin perder tonos, secuencias ni cambios.
- [ ] Probar canciones nuevas y antiguas.
- [ ] Probar transposición con acordes extendidos, inversiones y ambas nomenclaturas.
- [ ] Probar el editor unificado y las filas instrumentales.
- [ ] Probar modo proyección en el equipo real que se utilizará.
- [ ] Crear y restaurar un respaldo de prueba.
- [ ] Revisar reglas y permisos de Firebase antes de publicar.
- [ ] Congelar cambios no esenciales y preparar una versión estable para el evento.

## 9. Registro de versiones y decisiones

- **v1.1.18:** Mi Set por tono y secuencia personalizada de bloques; persistencia offline confirmada por el usuario.
- **v1.1.19:** motor unificado de reconocimiento/transposición; pruebas funcionales confirmadas.
- **v1.1.20:** selector manual de tonalidad original independiente del primer acorde; pruebas confirmadas.
- **v1.1.21:** biblioteca consultiva de acordes, fórmulas y notas; implementación inicial.
- **v1.1.22 / v1.1.23:** iteraciones del editor estructurado y preservación/reflujo de acordes.
- **v1.2.8 (PR #64):** distribución visual compartida de acordes; generó regresiones de desplazamiento horizontal y ancho de página que luego se corrigieron.
- **v1.2.9 (PR #66):** recuperación de posiciones musicales extendidas después de la última palabra.
- **v1.3.0 (PR #67):** ajuste natural por palabras, eliminación del desbordamiento horizontal global/espacio lateral y corrección de presentación en modo Director.
- **v1.3.1 (PR #69):** preservación de `instanceId` en GO_TO_BLOCK para navegar a la instancia correcta de bloques repetidos; validada manualmente por el usuario.
- **v1.3.2 (PR #71):** reinicio de `#live-screen` al cambiar canciones y al abrir En Vivo; pruebas automatizadas aprobadas y validación manual satisfactoria del usuario en iPhone.
- **24-nov-2026:** usuario confirmó Director + Mi Set: el músico recibe tono, orden y secuencia personalizados, y mantiene su propia notación. Se detectó la incidencia GO_TO_BLOCK con segundo bloque repetido.
- **24-nov-2026:** decisión de mantener v1.3.0 como referencia estable y aplazar la separación visual adicional para acordes latinos largos.
- **24-nov-2026:** GO_TO_BLOCK con bloques repetidos validado por el usuario; incidencia cerrada.
- **24-nov-2026:** usuario validó v1.3.2 en iPhone: al cambiar de canción en En Vivo, la lectura inicia desde arriba.
- **24-nov-2026:** se registra observación de zoom automático al enfocar búsqueda y clave del Director en iPhone; se investigará como mejora móvil posterior, sin bloquear el editor unificado.
- **24-nov-2026:** siguiente proyecto principal acordado: editor unificado.
- **24-nov-2026:** PR #77 integrada en el laboratorio como v1.3.6; protección contra click sintético residual después de un arrastre rechazado. CI aprobada y GitHub Pages desplegada.
- **24-nov-2026:** el usuario completó las pruebas manuales de v1.3.6 en iPhone: destino ocupado rechazado sin desplazar la letra, destino libre aceptado, inserción normal por toque y desplazamiento horizontal de fila. Se cierra esta etapa; producción y Firebase de producción permanecen intactas.

## 10. Arquitectura y migración al formato estructurado

- **Dirección:** el formato estructurado es el estándar objetivo; el texto heredado se conserva como respaldo seguro mientras haya canciones que no puedan convertirse inequívocamente.
- **Política:** migración bajo demanda, reversible y validada; no realizar conversiones masivas automáticas.
- **Casos críticos:** acordes sin letra (intro/interludios), formatos mixtos, tabulaciones, acordes desplazados, acordes después de la última palabra, canciones recién agregadas que no convierten y muestras históricas.
- **Regla:** ningún caso ambiguo debe provocar pérdida o sobrescritura silenciosa.
- **Documentos relacionados:** `docs/ESTRATEGIA_MIGRACION_FORMATO.md`, `docs/EDITOR_ACORDES_ESTRUCTURADOS.md`, `docs/ADAPTADOR_CANCIONES.md`, `docs/DIAGNOSTICO_FORMATOS.md`.
- **No autorizado sin aprobación explícita:** cambios a producción, Firebase de producción, reglas o migración masiva de la biblioteca.


## 11. Corrección de edición de letra instrumental y cola musical (candidata v1.3.4)

- Al añadir la primera letra a una fila instrumental, conservar los offsets absolutos de todos sus acordes.
- Al vaciar una fila, conservar sus offsets para que no se compriman ni se agrupen en la posición cero.
- En ediciones normales, no recortar los acordes que permanecen después de la última palabra.
- La interfaz permite crear y desplazar acordes hasta 20 posiciones después del final de la letra, en concordancia con el validador estructurado.
- La superficie visual reserva 20 columnas editables después de la letra.
- Pruebas añadidas para agregar/quitar letra en una fila instrumental y para validar un acorde nuevo al final de la cola musical.
- **Completado y validado por el usuario:** PR #75, v1.3.4. CI y GitHub Pages exitosos; el usuario confirmó que los problemas de posiciones instrumentales y acordes al final de la letra quedaron corregidos. Producción intacta.


## 12. Movimiento táctil directo de acordes (candidata v1.3.5)

**Estado:** completado y validado manualmente por el usuario en v1.3.6 (PR #76 y #77).

- Se puede arrastrar un símbolo de acorde directamente sobre el renglón para cambiar su posición musical.
- El mapeo de posición visual a offset de origen conserva la ubicación musical real incluso cuando el render añade espacios para evitar colisiones.
- En filas instrumentales, el desplazamiento horizontal representa posiciones musicales absolutas.
- Un destino ocupado por otro acorde o fuera del límite permitido se rechaza sin mover el acorde.
- Se mantienen los controles actuales de desplazamiento fino y edición del símbolo.
- El gesto de arrastre solo se activa al comenzar sobre un acorde; la superficie restante mantiene su desplazamiento horizontal.
- Se agregó una prueba para verificar el mapeo visual/original de los offsets.

**Validación manual:** el usuario confirmó que el arrastre normal funciona en iPhone y que la superficie restante permite el desplazamiento horizontal independiente. La protección de destinos ocupados se validó en v1.3.6. No retirar el editor heredado ni modificar producción.


## 13. Protección de la letra ante arrastres rechazados (candidata v1.3.6)

- Al terminar un arrastre, el navegador puede emitir un click sintético después de que la vista se vuelve a dibujar.
- Si el nodo del acorde fue reemplazado, ese click puede aterrizar sobre el renglón de letra y colocar un acorde en la posición del toque, haciendo que los espacios visuales cambien (por ejemplo, desplazando la última letra de una palabra).
- Se añade una protección de captura en el contenedor estable del editor para descartar ese click residual únicamente si cae sobre la letra durante el breve intervalo posterior al arrastre.
- No cambia el texto, los offsets ni el algoritmo de distribución; los destinos ocupados siguen rechazándose y el gesto normal de tocar la letra sigue disponible.
- **Validado por el usuario en iPhone:** al arrastrar un acorde a una posición ocupada, el movimiento se rechaza y la última letra de la línea permanece intacta; el arrastre a una posición libre funciona; el toque normal sobre la letra sigue permitiendo insertar acordes. El desplazamiento horizontal de la fila también funciona sin iniciar sobre un acorde.


## 14. Edición de bloques — renombrar secciones (v1.3.7)

**Estado:** completado y validado por el usuario en iPhone, incluyendo Mi Set y Director/Músico.

**Alcance de esta iteración:** permitir cambiar el nombre de una sección desde su encabezado en el editor estructurado.

- La operación trabaja sobre una copia validada del documento.
- Conserva el ID del bloque, el orden, las filas, los IDs de fila y todos los acordes/offsets.
- Rechaza nombres vacíos, mayores de 60 caracteres, con corchetes o saltos de línea para evitar etiquetas heredadas malformadas.
- Cuando la estructura puede serializarse sin pérdida, actualiza también la vista de texto heredado; si no puede, conserva ese respaldo y guarda la estructura válida como fuente principal.
- No agrega, elimina ni reordena bloques en esta iteración.
- Mi Set consume los IDs del documento normalizado para que renombrar una etiqueta no invalide las secuencias guardadas.
- No altera la composición de las secuencias personalizadas de Mi Set ni la navegación Director/Músico.
- Pruebas de modelo: renombrado, no mutación del original, preservación de IDs/contenido, serialización y validación de entradas inválidas.

**Estado:** implementación en rama de laboratorio; pendiente revisión, CI, despliegue y prueba manual en iPhone.


## 15. Edición de bloques — agregar secciones (candidata v1.3.8)

**Alcance de esta iteración:** agregar una sección nueva desde el editor unificado, sin recurrir al editor de texto heredado.

- Acción contextual «＋ Sección» en el encabezado del editor.
- Crea al final un bloque con nombre inicial «NUEVA SECCIÓN» y una fila instrumental vacía para que el usuario pueda renombrarlo y agregar letra/acordes. También permite iniciar el documento estructurado cuando se crea una canción completamente nueva y aún no tiene texto.
- El nuevo bloque y su fila reciben IDs únicos; los bloques y filas existentes conservan sus IDs y contenido.
- La operación valida el documento, trabaja sobre una copia y no modifica el original si falla.
- El texto heredado se actualiza únicamente si la estructura puede serializarse; la estructura validada permanece como fuente principal.
- No elimina ni reordena bloques. La eliminación queda para una etapa separada con confirmación.
- No altera la lógica de Mi Set ni Director/Músico; los nuevos IDs se integran al mismo documento estructurado.
- Pruebas cubren orden al final, fila vacía inicial, IDs únicos, no mutación y rechazo de etiquetas inválidas.

**Estado:** implementación en rama de laboratorio; pendiente revisión, CI, despliegue y prueba manual en iPhone.
