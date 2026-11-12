# Revisión y correcciones del apartado de rachas

## Alcance

Se revisaron la lógica cliente de la racha, el check-in, el quiz diario, el calendario y los recordatorios. El usuario compartió la definición y el esquema desplegados de Supabase; no se ejecutaron cambios en la base remota. Por eso se separan las correcciones locales y la migración preparada de la validación que todavía requiere aplicar SQL.

## Hallazgos y resolución

| # | Problema | Resolución | Estado |
|---|---|---|---|
| 1 | Un check-in se presentaba como exitoso aunque fallara el RPC: se guardaba y devolvía el estado optimista sin sincronización. | Ya no se muestra el estado optimista como completado antes de la respuesta remota; los errores del RPC se propagan y el hook reconcilia el estado. No se registra éxito offline que no esté en el servidor. | **Resuelto en cliente** |
| 2 | Una respuesta exitosa del RPC seguida de un fallo al registrar el historial revertía visualmente la racha, aunque el servidor ya podía haberla actualizado. | Ante errores del flujo, el hook vuelve a consultar el estado remoto antes de restaurar el estado anterior. | **Resuelto en cliente** |
| 3 | El check-in que usaba un comodín no registraba el día congelado en `historial_checkins`, por lo que el calendario no podía dibujarlo como tal. | La migración registra el día anterior como `comodin` en el mismo RPC y el cliente lo añade al estado local según la fecha confirmada por el servidor. | **Corrección preparada; pendiente aplicar en Supabase** |
| 4 | El fallback local evaluaba un comodín pero no persistía el estado evaluado; al volver a abrir la app podía recalcularse desde la misma copia sin actualizarla. | Se guarda el estado local después de evaluarlo para que una misma fecha no vuelva a descontar el mismo comodín. | **Resuelto en cliente** |
| 5 | La diferencia de días se calculaba con medianoche local y milisegundos, susceptible a cambios de horario estacional. | El cálculo ahora compara días de calendario UTC derivados de las fechas ISO. | **Resuelto en cliente** |
| 6 | El quiz derivaba el día del año de milisegundos transcurridos y podía desfasar/repetir la pregunta al cambiar el horario estacional. Además, la pregunta solo se cargaba al montar la pantalla. | El índice se calcula con componentes de calendario y la pregunta se vuelve a cargar cada vez que la pantalla recibe el foco. | **Resuelto en cliente** |
| 7 | El estado de comodín reciente no se recuperaba de la base al iniciar: solo se consultaban el conteo, los comodines y el último check-in. | La función desplegada guarda en `ultimo_comodin_usado` el día salvado (ayer); el cliente ahora exige que el último check-in sea hoy y que el día salvado sea ayer. | **Resuelto en cliente** |
| 8 | La app usa el día local, pero Supabase ejecuta el RPC con `CURRENT_DATE` en UTC. | La migración recibe la zona IANA local, valida que exista y calcula la fecha con esa zona; el cliente aplica el día que devuelve el servidor. | **Implementado en código y migración; falta aplicarla y probarla en Supabase** |
| 9 | Se percibía que el quiz se habilitaba a la hora del último intento. | El RPC desplegado no tiene temporizador de 24 horas: usa el cambio de fecha UTC. El quiz rota por día local. El cambio corrige el desajuste UTC/local, pero no se confirmó un temporizador ligado a la hora de respuesta. | **Causa de la disponibilidad “a la misma hora” no confirmada; validar con prueba manual tras migrar** |
| 10 | El RPC expone el check-in de cualquier usuario: es `SECURITY DEFINER`, recibe `p_user_id`, no compara con `auth.uid()` y `anon` tiene `EXECUTE`. | La migración exige una sesión autenticada, compara el ID con `auth.uid()`, fija `search_path` y limita `EXECUTE` a `authenticated` y `service_role`. | **Corrección preparada; pendiente aplicar en Supabase** |
| 11 | Lectura pública de perfiles, rachas e historial. | La migración quita la lectura pública de las tablas privadas, permite leer solo la fila propia y mantiene la vista `perfiles_publicos` —confirmada con solo `id`, `username` y `avatar_url`— para el foro. También impide modificar la racha directamente. | **Corrección preparada; pendiente aplicar en Supabase y probar el foro** |
| 12 | El estado de la fila de racha y el historial de check-ins no concuerdan para la cuenta consultada. | La migración registra el check-in y el comodín en la misma transacción que la actualización de racha. El cliente deja de insertar historial por separado. No se alteran registros históricos existentes. | **Corrección preparada; pendiente aplicar en Supabase** |
| 13 | `registrar_tiempo_uso` también concedía `EXECUTE` a `anon`. | La migración limita la ejecución a `authenticated` y `service_role`, coherente con el cliente, que solo invoca el RPC cuando hay sesión. | **Corrección preparada; pendiente aplicar en Supabase** |

## Verificación con Supabase (12 de noviembre de 2026)

- La zona horaria de PostgreSQL es `UTC`; en la consulta realizada era 14:13 en `America/Mexico_City` y 20:13 UTC. Ambas fechas aún coincidían en ese instante, pero divergen cada día después de las 18:00 locales.
- `procesar_checkin_diario` y `registrar_tiempo_uso` son `SECURITY DEFINER`; ambos tienen `EXECUTE` para `anon`. El primero modifica la fila indicada por `p_user_id` sin validar al usuario autenticado.
- Las tablas `perfiles`, `rachas_usuario` e `historial_checkins` reportan RLS habilitado, pero también permisos de lectura para `anon`; las políticas devueltas incluyen lectura pública (`qual = true`).
- La definición del RPC confirma `CURRENT_DATE`, no valida respuestas ni implementa una ventana de 24 horas.
- La vista `perfiles_publicos` proyecta únicamente `id`, `username` y `avatar_url`.
- El cliente de seguimiento de tiempo verifica que exista una sesión antes de invocar `registrar_tiempo_uso`.
- Los resultados remotos pertenecen a la consulta diagnóstica y no cambian datos; no se ejecutaron mutaciones manuales.

## Cambios realizados

- `src/services/streakService.ts`: comparación de fechas estable ante DST, uso de la zona local IANA, fecha autoritativa del servidor, persistencia del fallback evaluado e hidratación correcta del comodín reciente.
- `src/utils/hooks/useStreak.ts`: reconciliación con el backend en errores posteriores a iniciar el check-in.
- `src/services/quizService.ts` y `src/screens/main/InicioScreen.tsx`: pregunta diaria basada en fecha calendario y recarga al enfocar la pantalla.
- `supabase/migrations/20261112000000_harden_streaks_and_profile_reads.sql`: valida identidad y zona horaria, serializa el check-in, registra su historial de forma atómica y restringe las lecturas/escrituras privadas.
- Pruebas unitarias para fechas/DST, comodín, fallo de red y parámetros enviados al RPC.

## Antes de cerrar los pendientes

Aplicar la migración en Supabase antes de cerrar los puntos 8 y 10–13. Después probar: check-in repetido el mismo día, cruce de medianoche local, cruce de las 18:00 de Ciudad de México, intento anónimo, intento con ID de otra cuenta, uso de comodín y lectura del foro desde `perfiles_publicos`. El punto 9 requiere además reproducir el horario reportado con el dispositivo y revisar la configuración de notificaciones.
