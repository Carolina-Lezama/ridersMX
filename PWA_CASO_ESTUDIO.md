# RidersMX como aplicación web progresiva

**Caso de estudio:** herramientas digitales para motociclistas  
**Fecha de validación:** 25 de noviembre de 2026  
**Estado:** PWA publicada y verificada en producción

## 1. Caso de estudio

RidersMX reúne en una aplicación las tareas frecuentes de una persona motociclista: administrar su garaje, preparar y planear rodadas, consultar eventos y mantenimientos, completar listas de seguridad, guardar reseñas y recibir recordatorios. El caso combina datos personales persistentes en el dispositivo con información compartida desde servicios remotos y una experiencia web que puede volver a abrirse sin conexión.

## 2. Plataformas y herramientas

| Plataforma o herramienta | Uso y justificación |
|---|---|
| Expo SDK 56 y React Native | Mantienen una implementación común para Android y web y permiten reutilizar pantallas y flujos existentes. Se siguió la referencia de [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) y la guía de [PWA de Expo](https://docs.expo.dev/guides/progressive-web-apps/). |
| React Native Web y React | Renderizan en el navegador los componentes compartidos de React Native, preservando la interfaz de la app. |
| TypeScript | Verifica tipos en la aplicación y sus servicios antes de exportar. |
| Metro y `expo export --platform web` | Generan el bundle web de producción en `dist/`; `public/` aporta los archivos PWA copiados a la exportación. |
| Manifiesto y Service Worker del navegador | Declaran el modo instalable, identidad e iconos; guardan el shell y los recursos estáticos para volver a abrir la app offline. |
| Supabase | Proporciona autenticación, base de datos y servicios remotos para los datos compartidos de RidersMX. |
| AsyncStorage | Conserva preferencias y datos locales usados por diferentes funciones. |
| Expo Image Picker / cámara del dispositivo | Permite seleccionar imágenes y, en los flujos compatibles, tomar fotografías con la cámara; el navegador solicita los permisos correspondientes. |
| Expo Notifications y API de notificaciones web | Conservan las notificaciones nativas y habilitan permisos y recordatorios locales en navegadores compatibles. |
| Expo Hosting (EAS) | Publica el artefacto web HTTPS y proporciona la URL estable de producción. |

Versiones relevantes del proyecto: Expo `~56.0.23`, React `19.2.3`, React Native `0.85.3`, React Native Web `^0.21.2`, TypeScript `~6.0.3`, Supabase JS `^2.108.2`, AsyncStorage `2.2.0`, Image Picker `~56.0.25` y Notifications `~56.0.26`.

## 3. Parámetros de configuración

### PWA

Configuración en [`public/manifest.json`](./public/manifest.json):

| Parámetro | Valor |
|---|---|
| Nombre / nombre corto | `RidersApp` / `RidersMX` |
| `start_url` y `scope` | `/` |
| `display` | `standalone` |
| Orientación preferida | `portrait` |
| Color de tema | `#2563EB` |
| Color de fondo | `#0F172A` |
| Iconos | `public/logo192.png` (192 × 192) y `public/logo512.png` (512 × 512, `any maskable`) |

[`public/index.html`](./public/index.html) enlaza el manifiesto y registra `/sw.js` al cargar la página. [`public/sw.js`](./public/sw.js) usa el caché `ridersapp-pwa-v1`: precarga el HTML raíz, el bundle JavaScript y los iconos; responde las navegaciones con estrategia *network-first* y reserva el shell para el modo offline. Los recursos estáticos del mismo origen se guardan al solicitarlos. Las peticiones que no son recursos estáticos (por ejemplo, llamadas API) y los orígenes externos no se almacenan en ese caché. Al activar una versión nueva, solo elimina versiones anteriores con el prefijo `ridersapp-pwa-`.

El comando reproducible de exportación es `npm run web:build`, que ejecuta `expo export --platform web` y escribe `dist/`. El sitio debe servirse por HTTPS para instalarlo en un dispositivo; `localhost` también se admite para pruebas.

### Datos y permisos

- Los datos remotos se consultan mediante Supabase; las operaciones remotas necesitan conectividad.
- AsyncStorage guarda datos locales. Entre los ejemplos están perfiles de combustible, progreso de la lista pre-viaje y un respaldo local de los límites de uso.
- El caché PWA conserva los recursos de la aplicación, no una copia completa de la base de datos ni una cola general de cambios pendientes.
- Los recordatorios web requieren permiso del navegador. La implementación actual usa temporizadores de la sesión de la página: no garantiza una notificación si se cierra la página o el navegador. Las notificaciones push en segundo plano requieren un servicio push y suscripción de servidor, que no forman parte de esta entrega.
- El acceso a cámara/fotos requiere consentimiento del usuario y depende del navegador y dispositivo. No se solicita acceso silencioso.

## 4. Vistas y requisitos funcionales

| Requisito | Estado y evidencia |
|---|---|
| Vistas generadas del lado del cliente | **Incluido.** Las pantallas compartidas se renderizan en el navegador con React Native Web. La entrada de la app es [`index.ts`](./index.ts). |
| Vistas generadas del lado del servidor (SSR) | **Pendiente.** La app web actual es una SPA cliente; el HTML exportado contiene el punto de montaje y el bundle. Supabase es un backend remoto, pero sus respuestas de datos no equivalen a vistas SSR. Para cumplir este requisito se necesita una migración/diseño de rutas y renderizado de servidor, por ejemplo con Expo Router y su modo de renderizado web compatible. |
| Datos locales | **Incluido.** AsyncStorage se usa, por ejemplo, en [`fuelRangeService.ts`](./src/services/fuelRangeService.ts) y [`preRideChecklistService.ts`](./src/services/preRideChecklistService.ts). |
| Datos remotos | **Incluido en línea.** Supabase se consulta desde los servicios de la app; la disponibilidad depende de conexión y credenciales de entorno configuradas. |
| Datos/experiencia offline | **Parcial.** El shell, el bundle y los iconos se cachean; se verificó la reapertura offline. Algunas funciones leen valores guardados localmente. No hay sincronización genérica de escrituras remotas cuando vuelve la conexión. |
| Notificaciones | **Incluido con limitación web.** La app nativa usa Expo Notifications. La versión web solicita permiso y agenda recordatorios locales mientras la página mantiene activa la sesión; no hay push garantizado con la app cerrada. Véase [`notificationService.web.ts`](./src/services/notificationService.web.ts). |
| Elementos físicos del dispositivo | **Incluido en los flujos de cámara y galería**, por ejemplo en [`MotoGalleryScreen.tsx`](./src/screens/main/MotoGalleryScreen.tsx). En web la disponibilidad varía y requiere permiso; no se hizo una prueba física con cámara en este entorno. |

## 5. Reporte de pruebas

Pruebas ejecutadas el 25 de noviembre de 2026:

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | Correcto, sin errores TypeScript. |
| `npm test -- --runInBand` | Correcto: **19 suites, 48 pruebas aprobadas**. Incluye pruebas de permisos y programación de recordatorios web. |
| `npm run web:build` | Correcto. Metro exportó la app web y generó `dist/`, incluido un bundle JavaScript de aproximadamente 3.4 MB. |
| Comprobación del artefacto | Correcto: `index.html`, `manifest.json`, `sw.js`, iconos y bundle existen; el JSON del manifiesto se pudo analizar. |
| Navegador en producción | Correcto: HTTPS, manifiesto con HTTP 200, nombre `RidersApp`, modo `standalone`, Service Worker `activated` y página bajo su control. |
| Recarga sin conexión en producción | Correcto: al simular pérdida de red y recargar, la pantalla de onboarding volvió a mostrarse desde el shell/bundle cacheado. |
| Cámara física y permisos reales de notificación | No probados con un teléfono/navegador físico; requieren validar en el dispositivo destino y aceptar los permisos. |

### Evidencia técnica reproducible

- El navegador en producción encontró el caché `ridersapp-pwa-v1` y el Service Worker activo/controlador.
- La prueba offline se ejecutó sobre `https://ridersapp.expo.app/` con la red deshabilitada en el navegador; la recarga terminó sin error y mostró el onboarding.
- Los recursos fuente verificables están en [`public/manifest.json`](./public/manifest.json), [`public/sw.js`](./public/sw.js) y [`public/index.html`](./public/index.html).

## 6. Publicación

- **URL de producción:** [https://ridersapp.expo.app](https://ridersapp.expo.app)
- **URL de esta implementación:** [https://ridersapp--dd3gfa2v10.expo.app](https://ridersapp--dd3gfa2v10.expo.app)
- **Alojamiento:** Expo Hosting (EAS), despliegue promovido a producción el 25 de noviembre de 2026.

## 7. Pendientes conocidos

1. Añadir vistas realmente renderizadas en servidor si la rúbrica exige SSR; la app publicada actualmente renderiza sus pantallas en el cliente.
2. Incorporar un proveedor/endpoint de Web Push y persistir suscripciones si se requieren notificaciones cuando la PWA esté cerrada.
3. Probar instalación, cámara y notificaciones con dispositivos y navegadores objetivo.
4. Definir qué operaciones de negocio deben estar disponibles offline y añadir sincronización/conflictos de datos para esas operaciones.
