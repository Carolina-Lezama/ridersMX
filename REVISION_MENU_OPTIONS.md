# Revisión de `menu_options`

## Alcance

Se revisaron las siete pantallas registradas en la navegación y sus auxiliares: Foro, creación de publicaciones, Diagnóstico, Mantenimiento, Reseñas, Simulador Editor, Simulador Librería, `diseñostore.ts`, `catalogos.ts` y el servicio del chatbot.

## Problemas encontrados y resolución

| # | Apartado | Problema observado | Corrección | Estado |
|---|---|---|---|---|
| 1 | Foro | El feed se cargaba solo al montar la pantalla; al volver desde crear o editar contenido podía mostrar publicaciones, reacciones y asistencias desactualizadas. | Se recarga al enfocar la pantalla y después de las mutaciones. | Resuelto |
| 2 | Foro | Si fallaba la carga, el error quedaba únicamente en consola y la pantalla podía parecer vacía. | Se conserva el contenido disponible, se muestra un aviso y se ofrece reintentar; el estado vacío diferencia un fallo de un foro sin publicaciones. | Resuelto |
| 3 | Crear publicación | La búsqueda de lugares consultaba LocationIQ por cada tecla y respuestas lentas de búsquedas anteriores podían reemplazar resultados recientes. Tampoco se verificaba el estado HTTP. | Se añadió espera breve, invalidación de solicitudes obsoletas, validación HTTP y un mensaje visible si falla la búsqueda. | Resuelto |
| 4 | Crear publicación | Si se subía la foto y luego fallaba la inserción del post, el archivo quedaba huérfano en Storage. También se asumía que la lectura local de la imagen siempre funcionaba. | Se valida la respuesta al leer la imagen y se elimina la subida pendiente si no se crea la publicación; los errores de limpieza quedan registrados. | Resuelto |
| 5 | Foro / edición | Un rechazo al abrir el selector de imágenes podía quedar como promesa no manejada. | El flujo captura el error, verifica que exista una imagen y muestra una notificación. | Resuelto |
| 6 | Reseñas | La publicación agregaba una opinión al estado local y reportaba éxito aunque Supabase no devolviera la fila persistida. La reseña podía quedar sin ID y no ser editable/eliminable hasta recargar. | Se exige la fila y su ID antes de actualizar la interfaz local; la ausencia de confirmación se informa como error. | Resuelto |
| 7 | Reseñas | Errores de red al publicar o editar podían dejar el indicador `enviando` activado permanentemente. | El flujo captura excepciones, conserva el formulario para reintentar e implementa `finally` para liberar el indicador. | Resuelto |
| 8 | Reseñas | Catálogo, opiniones y estado de moderación se consultaban solo al montar la pantalla; al cambiar de cuenta o volver a ella podían mostrarse datos viejos. Algunos errores de carga no se comunicaban. | Se recargan al enfocar, se limpian estados dependientes de la cuenta anterior y se informa cuando falla una consulta. | Resuelto |
| 9 | Simulador / garaje | La persistencia ignoraba fallos de lectura y escritura; además, la carga se marcaba como terminada antes de leer correctamente, bloqueando reintentos. Guardar o borrar podía mostrar éxito antes de confirmar el guardado. | Se registran errores, se permite reintentar lecturas fallidas y las operaciones del garaje ahora esperan la escritura antes de cambiar la interfaz o confirmar éxito. | Resuelto |
| 10 | Simulador / fotos | Errores del selector de imágenes y de la copia de fotos podían quedar ocultos o sin manejo; fallos de copia no se registraban. | Los errores se capturan y notifican; el fallo al conservar una copia permanente queda registrado y se conserva la URI original como alternativa. | Resuelto |
| 11 | Web: Diagnóstico, Reseñas y Simulador | Las confirmaciones de `Alert.alert` no funcionan en web, así que acciones como borrar el chat o confirmar cambios podían parecer inactivas. | Se usan `window.confirm`/`window.alert` en web y se mantiene el diálogo nativo en iOS/Android. | Resuelto |
| 12 | Diagnóstico / Reseñas | Había logs temporales con respuestas de base de datos y datos de reseñas en consola. | Se eliminaron los logs de depuración y se conservaron avisos de error sin volcar filas completas. | Resuelto |
| 13 | Diagnóstico / chatbot | Había imports de `expo-file-system` que no se utilizaban en la pantalla ni en el servicio. | Se retiraron los imports innecesarios. | Resuelto |
| 14 | Foro / privacidad | Autores, comentaristas y sugerencias de usuarios se consultaban directamente en `perfiles`, que incluye teléfono y fecha de nacimiento y tenía lectura pública. | Las lecturas sociales del foro ahora usan `perfiles_publicos`, limitada a `id`, `username` y `avatar_url`. La migración pendiente elimina la lectura pública de la tabla base. | Cliente corregido; migración pendiente de aplicar |

## Revisión sin hallazgos locales confirmados

- En Mantenimiento, Editor y Librería, las operaciones de añadir elementos, abrir diseños y cambiar de pestaña usan el almacén compartido; no se encontró otro fallo de flujo reproducible aparte de la persistencia descrita arriba.
- El límite de cupo de las rodadas se aplica también en el trigger local de Supabase, no solo en el botón de la interfaz.
- La migración de privacidad y rachas está preparada, pero no se aplicó en Supabase; las reglas remotas no se consideran verificadas hasta ejecutarla.

## Pendientes externos / límites de esta revisión

- La clave de LocationIQ está incluida en el cliente móvil/web, por lo que debe tratarse como pública. No se cambió automáticamente: corresponde restringirla por plataforma/cuota desde LocationIQ o mover la consulta a un servicio controlado. No se reproduce el valor de la clave en este documento.
- No se pudo probar la comunicación real con Supabase, LocationIQ ni el backend Gemini. En particular, el límite de cantidad/tamaño de imágenes aceptado por Gemini debe confirmarse con el backend antes de imponer un límite arbitrario en la interfaz.
- La validación ejecutada es automatizada local; aún conviene hacer pruebas manuales en web y móvil con sesión iniciada, sin conexión, permisos denegados, almacenamiento lleno y respuestas fallidas del backend.

## Verificación

- `npm run typecheck`: correcto.
- `npm test -- --runInBand`: 7 suites aprobadas, 20 pruebas aprobadas.
- `git diff --check`: correcto.
- `npm run doctor`: 19/22 comprobaciones. Reporta problemas preexistentes fuera de este apartado: imágenes de `app.json` con formato/dimensiones no válidas, dos dependencias con versión de parche distinta a la esperada por Expo SDK 56 y la regresión de memoria detectada por Expo Doctor para Hermes V1. No se modificaron assets ni dependencias como parte de esta revisión.
