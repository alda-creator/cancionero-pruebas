# Firebase · entorno de pruebas

## Firestore y autenticación

La aplicación de pruebas utiliza Firebase Authentication con inicio de sesión anónimo antes de abrir el listener de `songs`.

1. En Firebase Console, proyecto **cancionero-pruebas** → Authentication → Sign-in method, habilitar **Anonymous**.
2. En Firestore Database → Rules, publicar el contenido de `firestore.rules`.
3. No cambiar reglas ni configuración del proyecto de producción.

Las reglas permiten leer, crear, modificar y borrar documentos de `songs` a cualquier usuario autenticado, incluidos usuarios anónimos. Esto conserva el comportamiento actual de cancionero compartido, pero **no es un sistema de permisos por persona**: cualquier visitante que active la app puede obtener una sesión anónima y editar el repertorio. No guardar información privada en esta base de pruebas. Para restringir quién puede editar habrá que incorporar una identidad de usuario y reglas de autorización por rol antes de usarla como base privada.

La app conserva una copia local de las canciones. Si se guarda o elimina una canción sin conexión o antes de completar el inicio de sesión, la operación queda en una cola local y se reintenta automáticamente al recuperar Internet y autenticación. Al abrir por primera vez sin conexión solo estarán disponibles las canciones que ya se hayan descargado o guardado en ese dispositivo. Firestore también tiene persistencia local habilitada para la sesión autenticada.
