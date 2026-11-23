# Adaptador de canciones (fase preparatoria)
El adaptador SongAdapter ofrece una entrada común para canciones con estructura v2 validada y canciones heredadas de texto plano.

## Alcance
- Devuelve una estructura v2 clonada para canciones estructuradas válidas.
- Convierte canciones heredadas de forma temporal y no destructiva, usando ChordModel.
- Mantiene rawText original en el resultado.
- Clasifica casos inválidos, ambiguos, vacíos y modelo no disponible.
- No guarda, no modifica Firestore, no altera canciones y no se integra todavía a las superficies UI.

## Contrato
`SongAdapter.adapt(song, ChordModel)` retorna `ok`, `status`, `structuredContent`, `rawText`, `warnings` y `source`. La estructura devuelta se clona para evitar que los consumidores modifiquen directamente la fuente.

Esta etapa solo establece y prueba el contrato. La integración con editor y render se hará por etapas después de revisión y pruebas móviles.
