# Cancionero — hoja de ruta maestra

**Documento vivo y fuente de referencia del proyecto.** Actualizarlo al cerrar cada mejora, prueba o decisión. No volver a proponer como pendiente una función marcada como implementada y validada. No borrar elementos históricos: cambiar su estado y anotar el motivo.

**Última actualización:** 26 de noviembre de 2026  
**Fecha objetivo:** preparación para el evento del 20 de diciembre de 2026  
**Laboratorio:** `alda-creator/cancionero-pruebas`  
**Producción:** `alda-creator/cancionero`  
**Última versión validada manualmente por el usuario:** v1.3.23 (PR #105), con la segunda iteración de pulido visual y el ocultamiento del selector técnico heredado validados en iPhone. **Siguiente trabajo:** auditoría y desarrollo de la sugerencia automática de tonalidad, exclusivamente en laboratorio.

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
| Selector manual de tonalidad original | Implementado y probado | El usuario puede elegir la tonalidad original sin depender del primer acorde. La sugerencia automática queda como trabajo explícito de cierre del editor. |
| Editor unificado — edición contextual de letra, acordes y bloques | Implementado por etapas y validado en laboratorio hasta v1.3.8 | Edición por fila, preservación de offsets instrumentales/cola musical, arrastre táctil, renombrado y creación de secciones. Se conserva el respaldo heredado. |
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

**Estado:** edición estructurada, importación de canciones completas y fragmentos, panel contextual adaptable al teclado y primer pulido visual completados e integrados en laboratorio. El usuario validó manualmente v1.3.20 en iPhone. El editor sigue abierto únicamente para la segunda iteración visual y la sugerencia automática de tonalidad; ambas deben validarse antes de cerrar el proyecto.

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
| P0 | Editor unificado: entrada inteligente y edición musical | Implementado y validado en laboratorio (v1.3.16–v1.3.20) | Pegado directo, conversión segura, respaldo literal, edición de filas y acordes, bloques, offsets y panel contextual; compatibilidad conservada. |
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
| Detección/sugerencia automática de tonalidad | Incluida en el cierre del editor | Auditar el código existente; analizar acordes con criterio musical, estimar confianza, sugerir solo cuando haya evidencia suficiente y permitir aceptar o elegir manualmente. Nunca imponer cambios ni alterar la tonalidad guardada sin confirmación. |

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
- **v1.3.13 (PR #89):** auto-desplazamiento vertical progresivo durante el arrastre de secciones; CI, GitHub Pages y validación manual en iPhone exitosos. Reordenamiento de secciones cerrado.
- **24-nov-2026:** usuario confirmó Director + Mi Set: el músico recibe tono, orden y secuencia personalizados, y mantiene su propia notación. Se detectó la incidencia GO_TO_BLOCK con segundo bloque repetido.
- **24-nov-2026:** decisión de mantener v1.3.0 como referencia estable y aplazar la separación visual adicional para acordes latinos largos.
- **24-nov-2026:** GO_TO_BLOCK con bloques repetidos validado por el usuario; incidencia cerrada.
- **24-nov-2026:** usuario validó v1.3.2 en iPhone: al cambiar de canción en En Vivo, la lectura inicia desde arriba.
- **24-nov-2026:** se registra observación de zoom automático al enfocar búsqueda y clave del Director en iPhone; se investigará como mejora móvil posterior, sin bloquear el editor unificado.
- **24-nov-2026:** siguiente proyecto principal acordado: editor unificado.
- **24-nov-2026:** PR #77 integrada en el laboratorio como v1.3.6; protección contra click sintético residual después de un arrastre rechazado. CI aprobada y GitHub Pages desplegada.
- **25-nov-2026:** el usuario validó v1.3.7: renombrar secciones conserva contenido, IDs y secuencias de Mi Set; Director/Músico sigue funcionando.
- **25-nov-2026:** el usuario validó v1.3.8: agregar secciones desde el editor unificado funciona en canciones existentes y nuevas; se conserva el contenido previo. Se registra como mejora futura unificar también la representación/gestión de etiquetas heredadas como `[Estrofa 1]`, `[Coro]` y `[Puente]`, sin cambiar ahora la compatibilidad de importación.
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

**Estado:** completado y validado manualmente por el usuario en iPhone en v1.3.7 (PR #79 y corrección de IDs en PR #81).


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

**Estado:** completado y validado manualmente por el usuario en iPhone en v1.3.8 (PR #82).


## 16. Mi Set — sincronización de contenido fuente y personalización

**Estado:** resuelto y validado por el usuario en v1.3.9 (PR #84).

El usuario comprobó en iPhone que los cambios editoriales de la canción original se reflejan en Mi Set sin quitar y volver a agregar la canción:
- Al corregir un acorde en la biblioteca, Mi Set recibe el acorde corregido y aplica la transposición individual que ya estaba configurada.
- Al eliminar una sección de la canción fuente, desaparece la referencia correspondiente de Mi Set.
- Al agregar una sección nueva, no se inserta automáticamente en la secuencia personalizada; queda disponible para que el usuario decida si la agrega y dónde la coloca.
- Se conserva la personalización de tono y la secuencia de Mi Set.

**Decisión de arquitectura validada:** la biblioteca es la fuente del contenido editorial; Mi Set conserva su organización y transposición personal. No reconstruir la secuencia personalizada a partir del orden de la canción fuente.

## 17. Edición de bloques — eliminar secciones (candidata v1.3.9)

**Alcance:** eliminar una sección desde su encabezado en el editor unificado.

- La acción se muestra dentro del modo de edición del encabezado, separada de renombrar.
- Antes de eliminar, se solicita confirmación indicando que se borrarán la letra y los acordes de esa sección al guardar.
- La operación se identifica por el ID estable del bloque; no depende de su posición ni etiqueta.
- Los demás bloques, filas, acordes, offsets e IDs permanecen intactos.
- Se conserva al menos una sección para que la canción no quede sin un punto de edición; si solo existe una, se debe vaciar su contenido en vez de eliminarla.
- Si la sección participa en una secuencia personalizada de Mi Set, su referencia dejará de corresponder a un bloque existente. La normalización de secuencias descarta referencias inexistentes; el usuario debe revisar la secuencia después de eliminar bloques.
- La operación trabaja sobre una copia validada y no muta el documento original si falla.
- La serialización heredada se actualiza solo si no pierde información; de lo contrario se conserva el respaldo y la estructura validada sigue siendo la fuente principal.

**Estado:** completado y validado por el usuario en iPhone en v1.3.9 (PR #84). El usuario confirmó eliminación, persistencia y comportamiento esperado en Mi Set. Producción y Firebase de producción permanecen intactas.


## 18. Edición de bloques — reordenar secciones en la canción original (v1.3.10)

**Objetivo:** permitir que el usuario cambie el orden de las secciones de la canción fuente desde el editor unificado, sin confundirlo con la secuencia personalizada de Mi Set.

- Arrastrar una sección desde un asa visible en su encabezado para colocarla antes o después de las demás.
- Ofrecer controles de subir/bajar como alternativa precisa y accesible al gesto táctil.
- Reordenar por ID estable y posición final; no reconstruir los bloques a partir de sus etiquetas ni índices.
- Conservar íntegros los IDs, etiquetas, filas, letras, acordes, offsets y contenido de cada sección; solo cambia el arreglo de bloques.
- Serializar el nuevo orden al texto heredado cuando sea posible y mantener la estructura validada como fuente principal si no lo es.
- Mi Set recibe el nuevo orden de la canción fuente, pero conserva su propia secuencia personalizada y transposición.
- Pruebas de modelo para movimientos al inicio, al final y posiciones intermedias, IDs inexistentes, índices inválidos, no mutación y preservación de contenido.

**Estado:** completado y validado por el usuario en iPhone en v1.3.10. El usuario confirmó que el arrastre y el orden resultante funcionan correctamente. Producción y Firebase de producción permanecen intactas.


## 19. Arrastre libre y auto-desplazamiento de secciones (v1.3.11–v1.3.13)

**Observación validada por el usuario en v1.3.10:** el arrastre funciona, pero se percibe como movimiento de una posición por gesto.

**Ajuste:** el asa de arrastre permitirá colocar una sección directamente en cualquier posición, aunque implique saltar varias secciones. Las flechas ↑/↓ seguirán moviendo exactamente una posición por pulsación.

- Calcular el índice final a partir de los puntos medios de todas las secciones restantes.
- Escuchar el ciclo de puntero en la ventana para mantener seguimiento durante todo el gesto táctil.
- Mantener indicador visual de destino y cancelar sin cambios al recibir `pointercancel`.
- Conservar el movimiento por ID estable y todo el contenido interno del bloque.
- Pruebas del cálculo de inserción en el inicio, posiciones intermedias y final.

**Estado:** completado y validado por el usuario en iPhone en v1.3.13 (PR #89). El usuario confirmó que el auto-desplazamiento funciona con fluidez en ambas direcciones, incluso al pasar secciones largas. Las flechas conservan el movimiento de una posición por pulsación; el arrastre libre permite saltar varias posiciones y el auto-scroll facilita continuar el gesto sin soltar. CI y GitHub Pages exitosos. Producción y Firebase de producción permanecen intactas.

- **25-nov-2026:** el usuario validó v1.3.13 en iPhone y confirmó que el auto-desplazamiento durante el arrastre es fluido; se cierra la etapa de reordenamiento de secciones. Siguiente fase acordada: auditoría y unificación de etiquetas heredadas en el editor, preservando la compatibilidad con texto pegado desde Internet.


- **25-nov-2026:** PR #91 integró v1.3.14; CI y GitHub Pages finalizaron correctamente. El usuario validó en iPhone etiquetas habituales, `[Coro Especial]` como sección independiente y `[con gozo]` como texto dentro de la letra. La fase de reconocimiento/importación queda validada. Siguiente paso: probar edición y renombrado de etiquetas desde el editor unificado, guardado/reapertura y coherencia con Mi Set. Producción y Firebase de producción permanecen intactas.


## 20. Entrada inteligente y unificación del pegado (v1.3.16)

**Auditoría del 26 de noviembre de 2026:** la conversión heredada ya estaba implementada en `ChordModel.convertLegacy()`, pero la superficie estructurada no la invocaba al pegar dentro de una fila. Además, `applyStructuredRowLyric()` convertía los saltos de línea en espacios, por lo que varios renglones se aplanaban antes de guardarse. El modelo estructurado sí admite múltiples filas por sección; no es necesario cambiar el formato de datos.

**Alcance de la primera iteración:**
- Añadir una opción de importación dentro del editor estructurado para pegar una canción completa, reconocer encabezados, acordes y letra, y reemplazar el borrador únicamente después de confirmar cuando ya existe contenido.
- Permitir pegar o escribir varias líneas en el editor de letra de una fila; si el fragmento se puede convertir de forma segura, reemplazar esa fila por varias filas estructuradas dentro de la misma sección.
- Reutilizar `ChordModel.convertLegacy()` y conservar la identidad de la fila inicial, IDs únicos, acordes, offsets y texto original de respaldo.
- Si el fragmento contiene varias secciones, dirigir al importador de canción completa en lugar de aplanar o interpretar parcialmente el contenido.
- Si la conversión es ambigua, conservar intacto el borrador actual y explicar el motivo.
- Mantener el editor de texto heredado como respaldo hasta que el usuario valide todos los escenarios.

**Criterios de aceptación manual:**
1. Crear una canción y pegar una canción completa desde la opción del editor unificado; deben reconocerse secciones, acordes, letra y filas instrumentales.
2. Crear una sección, pegar una estrofa multilínea con acordes dentro del editor de letra y comprobar que se distribuye en filas separadas.
3. Pegar varias líneas de letra sin acordes; no deben aplanarse y los acordes ya existentes de la primera fila deben conservarse.
4. Probar inversiones como `D/F#`, acordes al final de línea y espacios amplios.
5. Guardar, salir y reabrir; comparar texto, acordes, offsets, filas y etiquetas.
6. Confirmar que las importaciones ambiguas no sustituyen el contenido existente y que las canciones heredadas siguen abriéndose con el respaldo.

**Estado:** implementación inicial en rama `feat/entrada-inteligente-editor-unificado`; CI automatizado completado correctamente (incluidos modelo de acordes, navegación, diagnósticos, adaptador, documento y sintaxis inline); revisión del diff completada. PR #95 integrado en main mediante squash (commit 16c7a03827e4d3c6612e886170b92dd7a7bf88cf); CI de main y GitHub Pages completados correctamente. Pendiente de validación manual del usuario en iPhone. Producción y Firebase de producción permanecen intactas.


### 4.1 — Rediseño visual y unificación real del editor (fase iniciada después de v1.3.16)

**Objetivo acordado con el usuario:** una sola superficie de edición, sencilla para personas con poca experiencia tecnológica, que reúna el ingreso manual, el pegado desde Internet y las herramientas estructuradas.

**Dirección de diseño acordada:**
- Tomar como referencia visual la sencillez del editor de texto original, sin conservar dos editores visibles o dos apartados separados.
- Permitir pegar la canción completa directamente en la superficie principal; el reconocimiento y la conversión estructurada deben ocurrir sin abrir un panel de importación independiente.
- Mantener en esa misma experiencia la acción «＋ Sección», la creación/renombrado de secciones, el reordenamiento y la edición de letra y acordes.
- Retirar de la interfaz los encabezados técnicos «Editor unificado» y «Editor de texto original (alternativo)», así como las etiquetas rápidas fijas de Estrofa 1, Estrofa 2, Coro y Puente. La acción genérica «＋ Sección» permitirá elegir o escribir el nombre de cualquier sección.
- Simplificar la ayuda de tonalidad a una frase breve. Incorporar o verificar la sugerencia automática de tonalidad; el usuario debe poder confirmarla o cambiarla. No presentar una tonalidad como segura cuando el análisis sea ambiguo.
- Convertir el panel de edición de acordes en un control flotante/contextual que aparezca al seleccionar un acorde o un punto de la letra y se oculte al aceptar o cancelar. Debe reposicionarse para no tapar el contenido ni quedar detrás del teclado del iPhone.
- Eliminar textos técnicos de estado de la vista normal. Si una conversión no es segura, comunicarlo de forma breve y comprensible, conservar el texto original intacto y permitir seguir trabajando sin pérdida.

**Orden de implementación propuesto:**
1. Auditar y unificar primero la superficie de entrada/edición, incluyendo pegado directo y transición segura a la estructura editable.
2. Implementar el panel flotante de acordes como una etapa independiente.
3. Pulir jerarquía visual, espacios, controles y accesibilidad móvil.
4. Validar en iPhone pegado, edición manual, canciones antiguas/ambiguas, acordes, offsets, secciones, guardado y reapertura.

**Protecciones obligatorias:** conservar `rawText` como respaldo; no descartar ni reordenar acordes, offsets, IDs o filas instrumentales; no alterar canciones existentes al abrirlas; no quitar el camino de recuperación para canciones no convertibles; no modificar producción ni Firebase de producción.

**Avance técnico inicial (PR #96, aún en revisión):** menú de secciones implementado; el área de texto original acepta pegado directo y, cuando `convertLegacy()` produce una estructura válida, importa al borrador estructurado. La superficie de texto se oculta mientras existe una estructura editable, evitando mostrar dos representaciones simultáneas; vuelve a mostrarse cuando no hay conversión segura, para conservar el respaldo literal. Se retiraron de la vista los encabezados «Editor unificado» y «Editor de texto original (alternativo)», el panel independiente de pegado y los botones rápidos de bloques. La importación se refactorizó en una función compartida para conservar validación y confirmación.

**Verificación automatizada:** workflow «Chord model tests» #141 (run `45914937943`) completado con éxito: modelo de acordes, navegación repetida, scroll de lectura, diagnósticos, adaptador, documento y sintaxis JavaScript inline.

**Estado de esta fase:** PR #96 integrado en laboratorio y validado manualmente por el usuario en iPhone. El usuario confirmó que el pegado directo, el reconocimiento, la edición y el respaldo de formatos antiguos funcionan correctamente. Se cierra esta etapa.


### 4.3 — Cierre del editor: pulido visual superior y sugerencia automática de tonalidad

**Estado:** pulido visual superior cerrado y validado manualmente por el usuario en iPhone hasta v1.3.23 (PR #103–#105). Pendiente únicamente implementar y validar la sugerencia automática de tonalidad; exclusivamente en laboratorio.

**Base ya cerrada:** la edición estructurada, el pegado directo, la conversión conservadora, el respaldo literal, la edición de acordes/letras/bloques, la preservación de offsets y el panel contextual adaptable al teclado fueron validados por el usuario. El pulido visual completo (v1.3.21–v1.3.23, PR #103–#105) también fue validado en iPhone; el selector técnico heredado quedó oculto sin eliminar su lógica de recuperación.

**Orden de cierre acordado:**
1. **Actualizar esta hoja de ruta:** completado; se registra el cierre visual validado en v1.3.23.
2. **Pulido visual — iteración 2 (v1.3.21–v1.3.23):** completado y validado manualmente por el usuario en iPhone. Incluye la jerarquía visual de título, autor, selector de tonalidad y área de pegado; el texto de ayuda se simplificó a «Ajusta la tonalidad aquí». Como último ajuste, se ocultó de la interfaz normal el recuadro técnico «Datos encontrados en la base de datos / Cargar rawText», conservando su lógica interna de recuperación para compatibilidad con registros heredados. No se alteran IDs, eventos, conversión, guardado, lógica musical, posiciones, offsets, métricas tipográficas ni geometría de la vista previa.
3. **Sugerencia automática de tonalidad:** auditar primero el analizador y las capacidades existentes. No duplicar lógica ni asumir que el primer acorde determina la tonalidad. Diseñar una propuesta basada en el conjunto de acordes y contexto armónico disponible, contemplando inversiones, acordes de paso, tonalidades relativas y casos ambiguos. Mostrar una sugerencia solo cuando la confianza sea suficiente; explicar cuando no haya evidencia concluyente. La decisión final siempre corresponde al usuario.
4. **Validación manual final en iPhone:** probar canciones nuevas, pegadas completas y por fragmentos, formatos antiguos/no convertibles, tonalidades claras y ambiguas, aceptación/rechazo/cambio manual de sugerencia, guardado y reapertura.

**Criterios de aceptación de la sugerencia de tonalidad:**
- No cambiar silenciosamente la tonalidad original ni transponer la canción.
- No tratar el primer acorde como tonalidad definitiva.
- La sugerencia debe poder aceptarse, ignorarse o sustituirse manualmente.
- Si el análisis es ambiguo o insuficiente, no presentar una respuesta como segura.
- El análisis no debe reescribir canciones, acordes, offsets, secuencias ni datos existentes.
- Añadir pruebas automatizadas con progresiones representativas, inversiones, acordes cromáticos/de paso, tonalidades relativas y casos ambiguos.
- Mantener compatibilidad con canciones pegadas de Internet y formatos heredados.

**Regla de cierre:** el editor no se declarará terminado hasta implementar y validar la sugerencia automática de tonalidad en laboratorio. No se modificará producción ni Firebase de producción.

### Etapa siguiente: panel flotante contextual de acordes

**PR #97 integrado en laboratorio:** los controles de acorde aparecen ahora en un panel flotante fijo, centrado y adaptable al ancho de pantalla, con margen para el área segura inferior de iOS. El panel solo se muestra al seleccionar una línea o un acorde. Se añadió una acción explícita para cancelar/cerrar sin modificar el borrador; aceptar guarda y oculta el panel, mientras que eliminar conserva su acción independiente. Se mantienen las validaciones y los controles de desplazamiento existentes.

**Verificación automatizada:** workflow «Chord model tests» #149 (run `45917136269`) completado con éxito, incluidas pruebas de modelo, navegación, adaptador, documento y sintaxis JavaScript inline.

**Versión preparada para laboratorio:** v1.3.18, caché SW v56. **Pendiente:** confirmar despliegue de Pages y validar manualmente en iPhone la inserción, edición, movimiento, aceptación, cancelación y eliminación de acordes en distintas partes de canciones largas.


### Iteración de teclado — panel contextual adaptable (v1.3.19)

**Decisión confirmada por el usuario:** probar el comportamiento tipo AssistiveTouch solo como referencia de interacción, sin dejar un botón flotante permanente. El panel debe seguir cerrado cuando no hay selección y desaparecer al aceptar o cancelar, igual que en la versión anterior.

**Alcance de esta iteración:**
- Mantener el panel contextual actual y todos sus controles.
- Dejar de reservar espacio inferior en el editor cuando aparece el panel, para que no empuje el contenido de canciones largas.
- Escuchar los cambios del viewport visual de iOS (visualViewport) y elevar el panel por encima del teclado cuando este aparece.
- Restablecer su posición normal al cerrar el teclado o la selección.
- No introducir burbuja persistente ni arrastre manual en esta primera prueba.

**Protecciones:** no cambiar modelo de acordes, offsets, selección, validación, guardado, movimiento, eliminación ni importación. No tocar producción ni Firebase.

**Estado:** completado, integrado en laboratorio y validado manualmente por el usuario en iPhone (PR #98, v1.3.19; commit 8758d9c24a4f56f5003f9d8026ed795b0f7dae84). CI de PR y pruebas posteriores a la integración completadas correctamente; GitHub Pages publicó la versión. El usuario confirmó que el panel se mantiene por encima del teclado y permite seguir editando canciones largas sin quedar oculto. Observó desplazamientos ocasionales de pantalla, considerados compatibles con el reajuste de viewport de iOS y no bloqueantes mientras no afecten la edición. Se cierra esta iteración sin añadir burbuja permanente ni arrastre manual.

**Siguiente etapa acordada:** pulido visual del editor. Se limita a jerarquía visual, espaciado, alineación, consistencia de controles, estados y accesibilidad táctil. No modificar el modelo musical, offsets, conversión/importación, selección, validación, guardado, movimiento, eliminación, ni el comportamiento del panel contextual ya validado. Antes de tocar código, auditar la interfaz actual y definir cambios visuales pequeños y verificables; mantener compatibilidad con canciones pegadas desde Internet y formatos heredados.

### 4.2 — Pulido visual del editor (iteración 1, v1.3.20)

**Objetivo:** mejorar la legibilidad y la comodidad táctil de la superficie estructurada, manteniendo una interfaz minimalista, sencilla y práctica.

**Alcance de esta iteración (solo CSS):**
- Dar más jerarquía visual a los encabezados de sección.
- Aumentar el tamaño y la claridad de los controles para agregar, reordenar y editar secciones.
- Separar ligeramente las filas y hacer más legibles sus etiquetas.
- Mejorar los estados de foco visibles y las áreas táctiles, sin añadir complejidad visual.
- Mantener compatibilidad con tema claro y oscuro.

**Límites de seguridad:** no cambiar HTML funcional, JavaScript, modelo musical, offsets, conversión/importación, selección, validación, guardado, movimiento, eliminación ni secuencias de Mi Set. No modificar las métricas tipográficas, el ancho, el espaciado horizontal ni la geometría de la vista previa de acordes/letra, porque participan en la correspondencia entre posición visual y posición musical. No alterar el panel contextual adaptable al teclado ya validado.

**Estado:** completado, integrado en laboratorio (PR #100, commit `90461369b8bfb23e97b5a67a75325091665480b1`) y validado manualmente por el usuario en iPhone. El usuario confirmó que la presentación se ve muy bien y que las pruebas fueron correctas. Se cierra la primera iteración visual. No se reportaron regresiones en edición o geometría musical. Producción y Firebase de producción permanecen intactas.

**Siguiente revisión visual propuesta:** auditar la zona superior del editor (selector de tonalidad, indicaciones de ayuda y entrada de edición/pegado) y la consistencia visual entre editor estructurado y respaldo de texto antiguo. La siguiente iteración debe limitarse a la presentación y claridad de esos controles, conservando el pegado directo de canciones completas, la conversión automática segura y el respaldo literal cuando no se pueda convertir. Antes de implementarla, identificar selectores/estilos reales y evitar cambios funcionales o en la geometría de letra/acordes.

- **v1.3.19 (PR #98):** panel contextual adaptable al teclado; validación manual satisfactoria en iPhone. PR #99 registra el cierre y delimita el pulido visual.
