# Diseño técnico: editor de acordes estructurados

**Estado:** fase 1 implementada en rama de pruebas; módulo de dominio y conversión conservadora con pruebas automatizadas. Integración con la PWA todavía pendiente.  
**Rama:** `feature/editor-acordes-estructurados`  
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
3. Integrar render estructurado manteniendo fallback heredado.
4. Añadir inserción y edición visual de acordes.
5. Integrar transposición sobre entidades estructuradas.
6. Añadir catálogo de digitaciones y diagramas SVG locales.
7. Validar persistencia, sincronización y funcionamiento offline antes de habilitar pruebas de usuario.

**Criterio de salida:** ninguna canción antigua pierde información; una canción nueva puede editarse sin alinear acordes con espacios; todas las vistas usan la misma identidad de acorde.

## 8. Implementación actual en la rama

- `js/chord-model.js`: módulo aislado UMD, disponible como `ChordModel` en navegador y exportable en Node para pruebas. No está cargado todavía por `index.html`.
- `tests/chord-model.test.js`: suite de 8 pruebas; ejecución aislada sobre el contenido real de ambos archivos: 8/8 correctas.
- El conversor no intenta adivinar si hay tabulaciones o acordes más allá del final de la letra.
- El serializador rechaza acordes superpuestos o afinidades que el formato heredado no representa.
- No se ha modificado `index.html`, `sw.js`, Firebase ni el comportamiento de la aplicación.
