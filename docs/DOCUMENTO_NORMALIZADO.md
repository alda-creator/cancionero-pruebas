# Documento normalizado de canción (fase preparatoria)
SongDocument crea una proyección independiente, ordenada y neutral respecto de la interfaz, a partir de un resultado válido de SongAdapter.

- No escribe ni migra datos.
- No accede a Firebase.
- Conserva IDs, etiquetas, texto y posiciones de acordes.
- Expone el indicador `instrumental` para filas sin letra.
- Aísla la proyección de los objetos mutables del adaptador.
- El editor y render todavía no consumen este módulo.

Esta etapa prueba un contrato de lectura compartido para futuras superficies de edición y renderizado.
