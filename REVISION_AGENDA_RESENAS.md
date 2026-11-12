# Revisión de agenda, citas y reseñas

## Alcance

Se revisaron la carga y visualización del calendario, altas y ediciones de citas, recurrencias, recordatorios locales, detección de eventos pendientes y el modal para reseñar rodadas y mantenimientos.

## Hallazgos y resolución

| # | Problema encontrado | Corrección aplicada | Estado |
|---|---|---|---|
| 1 | La fecha inicial del formulario nuevo se derivaba de `toISOString()` (UTC), que puede ser el día anterior/siguiente respecto al calendario local. | El valor predeterminado ahora se forma con año, mes y día locales. | **Resuelto** |
| 2 | Al editar una cita en formato de hora localizado por `toLocaleTimeString` (por ejemplo, `p. m.`), el formulario separaba el sufijo como `p.` y no sumaba 12 horas; guardar podía convertir una cita vespertina en matutina. | La edición reutiliza el parser de fecha/hora local ya probado por el sistema de recordatorios. La hora del modal de reseña también se formatea desde la fecha parseada. | **Resuelto** |
| 3 | Una cita cancelada o reprogramada con `estado_review = pendiente` todavía podía abrir el modal de reseña. | La búsqueda de reseñas pendientes descarta ambos estados antes de seleccionar una cita vencida. | **Resuelto** |
| 4 | En reseñas de rodada, distancia y duración inválidas se convertían silenciosamente a cero; se aceptaban valores negativos y minutos fraccionarios aunque la columna es entera. | El modal valida distancia no negativa y duración en minutos enteros no negativos; muestra error sin guardar datos sustitutos. | **Resuelto** |
| 5 | La reseña de rodada se insertaba antes de marcar la cita como completada. Si fallaba la segunda operación, reintentar podía dejar estados parciales. | Se consulta primero si ya existe bitácora para evento/usuario; reintentos completan el estado sin insertar otra fila. La consulta de restricciones remota confirmó además `UNIQUE (evento_id)`, que protege contra inserciones simultáneas para una misma cita. Se marca también `estado = 'Completada'`. | **Resuelto en cliente y respaldado por restricción única remota** |
| 6 | Guardar una reseña dejaba `completado = true` pero conservaba `estado = 'Planeada'`, por lo que la tarjeta podía seguir mostrando el estado equivocado. | Las reseñas de rodada y mantenimiento actualizan `estado` a `Completada` junto con los otros indicadores. | **Resuelto** |
| 7 | La pantalla de agenda solo escribía el error en consola; la UI mostraba el estado vacío como si no existieran citas. También podía conservar datos previos si no había sesión. | La pantalla limpia los datos en errores/sesión ausente, muestra un mensaje diferenciado y permite reintentar. | **Resuelto** |
| 8 | La carga de agenda dependía de un listener `focus` creado en `useEffect`, que podía no capturar el foco inicial y dejar la pantalla indefinidamente en carga. | La consulta ahora usa `useFocusEffect`, que ejecuta la carga al enfocar por primera vez y en cada regreso a la pantalla. | **Resuelto** |
| 9 | El modal dependía solo de `visible` para reiniciar sus datos. Al encadenar la reseña siguiente sin cerrar realmente el modal, podían permanecer calificación, notas, foto y valores de la cita anterior. | El formulario y la selección se reinician al cambiar la cita, además de abrir/cerrar; la carga de motos anterior se limpia. | **Resuelto** |
| 10 | Si expiraba la sesión, algunas acciones del modal retornaban sin aviso y los errores de posponer/ignorar perdían el detalle del backend. | Se comprueban errores de sesión y se muestran mensajes explícitos en guardar, posponer e ignorar. | **Resuelto** |
| 11 | En citas mensuales cerca del final de mes, sumar tres meses con `setMonth` podía desbordar la fecha y dejar una fecha final inesperada para la recurrencia. | La fecha predeterminada de fin ahora usa el helper que limita el día al último día del mes de destino. | **Resuelto** |
| 12 | La edición y borrado consultaban/modificaban por ID sin incluir el perfil autenticado en el filtro de cliente. | Las operaciones ahora restringen también por `perfil_id` de la sesión. | **Resuelto en cliente; las políticas RLS siguen siendo la barrera de seguridad** |
| 13 | La pestaña “Todas” mostraba hora y título, pero no la fecha de cada cita; las actividades de distintos días podían confundirse. | Las tarjetas muestran la fecha cuando la lista está en modo “Todas”. | **Resuelto** |
| 14 | Cambiar manualmente el estado a `Completada` o salir de ese estado no sincronizaba la columna booleana `completado`. | El formulario ahora deriva `completado` del estado seleccionado en cada guardado. | **Resuelto** |

## Pruebas añadidas

- Una cita vencida completada puede abrirse para reseña, mientras que las canceladas/reprogramadas no.
- Reintentar el guardado de una rodada existente no inserta otra bitácora y actualiza el evento a completado.

## Pendiente de validación manual

- Probar en iOS/Android/Web el formato real de hora que devuelve cada picker y el caso de editar una cita de tarde.
- Confirmar en Supabase las políticas RLS para `eventos` y `bitacoras_rodadas`.
- La consulta remota falló al buscar `public.resenas_mantenimiento`; el panel compartido tampoco muestra esa tabla y sí muestra `resenas`. La app usa `resenas_mantenimiento` para guardar reseñas de mantenimiento, así que ese flujo remoto no está operativo hasta aplicar/revisar `supabase/migrations/20261027000000_add_maintenance_review_support.sql`. La tabla `supabase_migrations.schema_migrations` no existe en el entorno consultado, por lo que no se pudo comprobar el historial de migraciones desde SQL Editor.
