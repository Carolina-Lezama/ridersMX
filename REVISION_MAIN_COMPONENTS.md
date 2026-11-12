# Revisión de pantallas restantes de `main` y componentes

## Alcance

Se revisaron las pantallas de `src/screens/main` y los componentes compartidos que no quedaron cubiertos por las revisiones previas. Las áreas de rachas, agenda/reseñas y `menu_options` mantienen sus informes separados: `REVISION_RACHAS.md`, `REVISION_AGENDA_RESENAS.md` y `REVISION_MENU_OPTIONS.md`.

Se inspeccionaron perfil, garaje y formulario de motocicleta, onboarding, configuración y cuentas, ayuda, notificaciones, tiempo de uso, estadísticas, insignias, y componentes compartidos de cuenta, formularios, estado vacío, paginación, carga y aviso de tiempo.

## Problemas encontrados y resolución

| # | Área | Problema | Resolución | Estado |
|---|---|---|---|---|
| 1 | Perfil | La biografía iniciaba con `:?`; si se guardaba antes de que terminara la carga del perfil, podía persistirse ese texto accidental. | La biografía inicia vacía y un error de carga ahora muestra una pantalla de error con reintento, en vez de dejar editar y guardar campos vacíos. | Resuelto |
| 2 | Perfil | El guardado no comprobaba si Supabase había actualizado una fila; una respuesta sin error pero sin perfil afectado podía mostrarse como éxito. | Se solicita la fila actualizada y se informa si no existe un perfil que guardar. | Resuelto |
| 3 | Perfil | La validación y el máximo de teléfono exigían 10 dígitos para todos los países, aunque se permite elegir códigos internacionales distintos. | El máximo considera el código del país y se valida el rango internacional de 7 a 15 dígitos totales. | Resuelto |
| 4 | Garaje | Un error al consultar las motocicletas podía confundirse con un garaje vacío. | El garaje distingue error de lista vacía, ofrece reintento y carga de nuevo al recuperar el foco. | Resuelto |
| 5 | Formulario de motocicleta | El borrado podía reportar éxito sin confirmar que se eliminó una fila. Los campos numéricos también aceptaban texto parcial en web y `parseInt` podía guardar solo el prefijo numérico. | El borrado requiere confirmación de la fila afectada y los valores numéricos se validan como enteros no negativos antes de guardar. | Resuelto |
| 6 | Estadísticas | Los errores al cargar motos no se comprobaban y las consultas no se refrescaban al regresar a la pantalla; respuestas lentas podían escribir resultados obsoletos. | Se verifican errores de sesión y de garaje, se recarga al enfocar, se cancela la actualización tras perder foco y se ofrece reintento. | Resuelto |
| 7 | Tiempo de uso y límites | Si fallaba la lectura de límites y no había respaldo local, la pantalla dejaba los valores por defecto en cero sin distinguirlos de una configuración real. Las métricas también quedaban obsoletas al volver a la pantalla. | El fallo se muestra con reintento y desactiva cambios/guardado hasta cargar datos válidos. Métricas y límites se actualizan al enfocar; ante error de métricas se muestran guiones, no ceros engañosos. | Resuelto |
| 8 | Notificaciones | El control de recordatorios de agenda estaba fijo en `false` y deshabilitado pese a existir lógica de permisos, persistencia y programación. | El switch se conecta a la configuración existente. En web, donde la implementación de notificaciones locales no está disponible, los controles afectados aparecen como próximos y quedan deshabilitados. | Resuelto |
| 9 | Notificaciones | Cambios rápidos de distintos switches u hora podían guardar configuraciones basadas en cierres obsoletos y competir por la programación local. | Se serializan las mutaciones y la interfaz deshabilita controles mientras se guarda. | Resuelto |
| 10 | Selector de cuentas e insignias | Una consulta que terminara después de cerrar/cambiar de pantalla podía publicar estado obsoleto; en cuentas podía incluso sobreescribir la lista recién cargada al reabrir el modal. | Se invalida la carga al cerrar o perder foco antes de aplicar sus resultados. | Resuelto |
| 11 | Onboarding | El índice de elementos visibles no estaba protegido frente a `null` y los errores de persistencia solo se registraban en consola, sin explicar por qué no se podía continuar. | Se valida el índice y se informa al usuario si no se puede persistir la finalización; se retiraron logs de depuración. | Resuelto |
| 12 | Web: perfil, garaje, ajustes, insignias y formulario de motocicleta | Algunos errores o confirmaciones dependían de `Alert.alert`, que no ofrece el mismo comportamiento en web. | Los avisos y errores modificados usan diálogo web cuando corresponde y conservan el comportamiento nativo en iOS/Android. | Resuelto |
| 13 | Configuración | Había estado local de alertas de mantenimiento sin uso. Cerrar sesión podía fallar sin mostrar feedback en web, y una sesión ausente o una fecha de creación inválida dejaba “Cargando...” indefinidamente en “Usuario desde”. | Se eliminó el estado sin uso, se añadió feedback web y los casos sin sesión/fecha válida muestran “Fecha no disponible”. | Resuelto |

## Pendientes externos / límites

- Los botones de términos y política de privacidad todavía abren un texto que indica que los documentos se publicarán después. No se inventó contenido legal: hace falta que producto/legal proporcione los documentos aprobados y sus URLs.
- Las notificaciones locales de racha y agenda siguen sin soporte en web; los controles se identifican como próximos en esa plataforma. No se verificó la entrega en dispositivos físicos ni los permisos del sistema operativo.
- No se pudieron probar las consultas, políticas RLS ni RPC contra el proyecto Supabase remoto. Las pruebas locales no sustituyen esa verificación.
- En los componentes comunes restantes (botón, entrada, paginador, estados vacíos, skeleton y modal de aviso) no se encontró otro defecto de flujo reproducible en el código inspeccionado.

## Verificación

- `npm run typecheck`: correcto.
- `npm test -- --runInBand`: 7 suites aprobadas, 20 pruebas aprobadas.
- `git diff --check`: correcto.
- La validación se limita a automatización local; conviene probar manualmente perfiles con números internacionales, errores de red/permisos, cambio rápido de cuenta y notificaciones en iOS/Android.
