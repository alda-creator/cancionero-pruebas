# Diseño técnico: editor de acordes estructurados

**Estado:** modelo, conversión conservadora, persistencia, render estructurado y editor integrado en la vista previa implementados en la rama de pruebas; pendiente validar Safari/iPhone, Firestore y offline.  
**Rama inicial:** `feature/editor-acordes-estructurados`  
**Iteración de UX móvil:** `feature/editor-integrado-alineacion-movil`  
**Objetivo:** evolucionar el editor de canciones sin romper canciones existentes, transposición, Mi Set, modo Director/Músico ni uso offline.

## 1. Decisión de arquitectura

Los acordes pasan de ser texto detectado en una línea a ser entidades estructuradas asociadas a una posición dentro de una línea de letra. El editor, la vista de lectura, la transposición y los diagramas consumirán el mismo modelo.

Se conserva `rawText` como representación heredada y respaldo reversible. No se hará una conversión masiva destructiva ni se eliminará el formato anterior.

## 2. Modelo de datos propuesto

La canción conserva sus campos actuales (`id`, `title`, `author`, `originalKey`, `rawText`) y podrá incorporar:

```js
{
  editorVersion: 2,
  structuredContent: {
    version: 2,
    blocks: [{
      id: "coro-1",
      label: "CORO",
      rows: [{
        id: "row-1",
        lyric: "Sublime gracia del Señor",
        chords: [{
          id: "chord-1",
          root: "C",
          quality: "",
          bass: null,
          position: { offset: 0, affinity: "before" }
        }]
      }]
    }]
  }
}
```

Reglas:
- `root` y `bass` se guardan en nomenclatura canónica anglosajona (C–B con alteraciones).
- `quality` conserva extensión/calidad, por ejemplo `m7`, `maj7`, `add9`, `7(b9)`.
- La inversión se representa con `bass`, no como texto opaco.
- `position.offset` es el desplazamiento en puntos de código Unicode dentro de `lyric`; se define así para evitar que acentos y caracteres fuera del plano básico rompan posiciones.
- `affinity` resuelve si el acorde queda antes o después del carácter en el límite.
- Los identificadores de bloque/fila/acorde son estables para que la edición no dependa del orden visual.
- La notación latina/anglosajona es una preferencia de presentación; no cambia los datos canónicos.
- La transposición se calcula al presentar el contenido. No muta la tonalidad original ni las entidades guardadas.

El esquema es una base evolutiva: digitaciones, selección de posición de guitarra y metadatos de interpretación se añadirán como datos relacionados, sin mezclar la digitación con la identidad armónica del acorde.

## 3. Compatibilidad con canciones existentes

1. Si una canción tiene `structuredContent` válido y `editorVersion: 2`, se usa el modelo estructurado.
2. Si no lo tiene, se interpreta `rawText` con el parser actual.
3. La conversión heredada será conservadora: bloques y pares de líneas se pueden reconstruir; las posiciones horizontales derivadas de espacios solo se aceptan si son suficientemente claras.
4. Si la ubicación de un acorde es ambigua, se mantiene esa línea en representación heredada y se permite editarla manualmente. No se inventan posiciones.
5. Al guardar una edición estructurada, se guarda también una serialización heredada compatible en `rawText` cuando sea posible. Si una estructura no puede serializarse sin pérdida, se conserva el texto anterior y se marca la fuente estructurada como principal.
6. No se migran todas las canciones al abrir la aplicación. La migración ocurre bajo demanda y con respaldo.

## 4. Capas de la aplicación

- **Dominio:** parseo/validación, normalización de acorde, transposición y conversión heredada.
- **Edición:** selección de texto/caret, insertar acorde, mover, cambiar y eliminar.
- **Presentación:** render de acordes sobre la letra y render de lectura.
- **Digitaciones:** catálogo local de posiciones verificadas y generador SVG offline.
- **Persistencia/sincronización:** serialización de datos versionados, compatibilidad con documentos antiguos y sincronización actual.

No se introducirá una dependencia pesada ni se sustituirá el stack actual de la PWA.

## 5. Reglas de interacción

- Insertar un acorde en la posición del cursor o selección actual.
- Permitir ajustar su posición sin añadir espacios manuales al texto.
- Seleccionar un acorde para cambiar su nombre; eliminarlo no modifica la letra.
- Pulsación prolongada en lectura abre la ficha/diagrama; un toque normal mantiene su comportamiento actual.
- El diagrama se cierra al tocar fuera y admite Escape en escritorio.
- Los gestos de navegación no deben interceptar el desplazamiento vertical ni los controles del editor.

## 6. Integridad y compatibilidad

Cada fase debe probar:
- canciones heredadas con acorde-línea y letra-línea;
- canciones solo con letra, etiquetas de bloque y líneas instrumentales;
- acordes latinos/anglosajones, alteraciones, extensiones e inversiones;
- transposición y tono original manual;
- Mi Set, secuencias de bloques y persistencia local;
- Director/Músico, cambios remotos y múltiples dispositivos;
- conexión, desconexión, reconexión y caché offline;
- guardar, cerrar y reabrir sin pérdida ni duplicación.

No se cambia Firebase ni sus reglas en esta iniciativa.

## 7. Fases de implementación

1. **Completada en rama:** esquema v2, validador, parser de símbolos, conversor heredado conservador y serializador protegido; sin cambios en la interfaz.
2. **Completada en rama:** pruebas de acordes, nomenclaturas, inversiones, posiciones Unicode, ambigüedad, validación y serialización. 8 pruebas ejecutadas correctamente.
3. **Completada en rama:** cargar el módulo en la PWA y generar `structuredContent` al guardar cuando la conversión sea inequívoca; `rawText` se conserva como respaldo.
4. **Implementada inicialmente en rama:** el render consume la estructura validada y coloca cada acorde en su posición con una capa independiente; transposición y notación se aplican al símbolo presentado. El render heredado permanece como fallback. La secuencia de Mi Set conserva los IDs del parser antiguo.
5. **Implementada inicialmente en rama:** panel visual con lista de líneas, selección de línea, selección por toque sobre la letra para calcular posición, alta/modificación/eliminación de acordes y validación para evitar dos acordes en el mismo punto. Los cambios se guardan en `structuredContent`; `rawText` se mantiene intacto como respaldo. La edición del texto heredado vuelve a generar el borrador estructurado.
6. **Pendiente:** edición más directa de arrastrar/mover acordes, ajustes de UX y pruebas reales en Safari/iPhone y otros tamaños de pantalla.
7. Añadir catálogo de digitaciones y diagramas SVG locales.
8. Validar persistencia, sincronización, responsive y funcionamiento offline en navegador antes de habilitar pruebas de usuario.

**Criterio de salida:** ninguna canción antigua pierde información; una canción nueva puede editarse sin alinear acordes con espacios; todas las vistas usan la misma identidad de acorde.

## 8. Implementación actual en la rama

- `js/chord-model.js`: módulo UMD cargado por `index.html` antes del código principal; expone `window.ChordModel` y puede exportarse en Node para pruebas.
- `saveSong()` genera `editorVersion: 2` y `structuredContent` solo cuando la conversión y validación terminan correctamente. `rawText` siempre se conserva; las canciones ambiguas siguen guardándose en formato heredado.
- La conversión es bajo demanda al guardar; no se realiza migración masiva al abrir la aplicación.
- `sw.js` usa caché v19 e incluye el módulo en la precarga para uso offline.
- `tests/chord-model.test.js`: suite de 8 pruebas; 8/8 correctas. También se verificó sintácticamente el script principal y el service worker.
- El conversor no intenta adivinar si hay tabulaciones o acordes más allá del final de la letra.
- El serializador rechaza acordes superpuestos o afinidades que el formato heredado no representa.
- `index.html` integra el modelo y el primer render estructurado: valida `structuredContent`, conserva el fallback heredado, ancla acordes con posiciones CSS basadas en la tipografía monoespaciada y transpone/convierte notación al mostrar. No añade espacios a la letra.
- El render estructurado mantiene los IDs de bloque que espera Mi Set y el control de secuencia. La misma función de render se utiliza en la vista de canción y en la pantalla en vivo.
- El panel visual se agregó al editor: lista líneas por bloque, permite seleccionar una línea y tocar la letra para obtener una posición Unicode; el formulario acepta símbolos de acorde, agrega o modifica una entidad y elimina la seleccionada. Se impide colocar dos acordes en el mismo offset. Guardar prioriza el borrador estructurado y conserva `rawText` sin alterarlo.
- El editor visual incorpora controles para desplazar el acorde seleccionado un punto Unicode a la izquierda o derecha; respeta los límites de la letra y bloquea colisiones con otros acordes.
- Cada fila muestra ahora una vista previa alineada: los símbolos de acorde aparecen encima de la letra en su posición aproximada, además de la lista seleccionable para editar.
- Se añadió protección contra pérdida accidental: si ya se modificaron acordes visualmente, intentar editar el texto heredado, insertar etiquetas o cargar un campo alternativo solicita confirmación antes de descartar el borrador estructurado.
- Estas mejoras son verificaciones de código; la interacción táctil, el diálogo de confirmación y el comportamiento de Safari/iPhone aún requieren prueba real en navegador.
- La edición de texto heredado reinicia el borrador visual desde la conversión; al abrir una canción estructurada, se restaura su estructura exacta después de refrescar la previsualización. Se excluyen `editorVersion` y `structuredContent` de los botones de campos heredados.
- Verificación estática posterior: el bloque principal de JavaScript compila sin errores; las 8 pruebas del modelo pasan; se confirmó presencia del panel, acciones, guardado estructurado y fallback. Aún no equivale a prueba visual en navegador ni a validación real de Firestore/offline.
- `sw.js` sigue en caché v19; no se añadió ningún recurso nuevo. No se modificó Firebase ni sus reglas.

- La vista previa y los chips del editor respetan la preferencia de notación anglosajona o latina; la estructura interna sigue guardando raíces canónicas para transponer sin ambigüedad.


## 9. Iteración UX móvil — v1.1.22

- La vista previa de cada línea es también la superficie de edición: tocar la letra posiciona el cursor musical y tocar un acorde existente permite seleccionarlo.
- Se elimina la duplicación de letra, vista previa y chips independientes; el editor presenta una sola representación de cada línea.
- Los controles de acorde aparecen únicamente después de seleccionar una línea y se mantienen compactos.
- En lectura y edición, las líneas estructuradas conservan una sola línea horizontal desplazable. Esto evita que el texto se envuelva debajo de acordes posicionados con coordenadas de carácter, que antes podían salirse de la tarjeta o quedar superpuestos.
- La navegación horizontal es intencional en líneas largas; debe probarse con VoiceOver, Safari iOS y tamaños de pantalla reducidos.
- Se conserva el formato heredado: las canciones antiguas se convierten de manera conservadora al abrir el editor; si la conversión no es segura, se mantiene el texto original sin modificarlo.
- Caché PWA incrementada a v20 para forzar la actualización de los recursos.


## 10. Corrección de integridad y lectura en vivo — iteración siguiente

- La edición del texto ya no invalida ni descarta el borrador estructurado.
- `reconcileLyrics` convierte el texto editado a filas y las reconcilia con la estructura anterior: conserva IDs y acordes de filas coincidentes, actualiza las letras y ajusta offsets cuando se insertan/eliminan caracteres antes del acorde.
- Las líneas nuevas nacen sin acordes; las líneas eliminadas dejan de existir. Las filas modificadas entre anclas intactas se emparejan por orden.
- Si la conversión del texto editado es ambigua o inválida, se conserva el último borrador estructurado y se bloquea el guardado para evitar pérdida silenciosa.
- El render de lectura divide visualmente cada fila en unidades de palabras con acordes anclados; el navegador puede envolverlas en varias líneas verticales sin scroll horizontal. La posición estructurada sigue almacenada como offset dentro de la letra original.
- Las canciones heredadas se convierten solo para visualización cuando el parser puede hacerlo sin ambigüedad. No se migran ni escriben automáticamente.
- Pendiente: pruebas reales en Safari/iPhone, Auto-Scroll, Director/Músico, Firestore y modo offline; comprobar líneas largas, acordes múltiples sobre una palabra y cambios complejos de varias estrofas.
