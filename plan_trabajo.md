Revisé los flujos y corregí los problemas funcionales claros, manteniendo las insignias como demo, según tu elección.

Gráficas: corregí el agrupamiento para que los kilómetros correspondan solo a los últimos seis meses y no mezcle el mismo mes de distintos años. También limité la consulta a ese periodo en estadisticasService.ts.
Gastos: la consulta de mantenimiento ahora filtra por perfil y propaga errores en vez de convertirlos silenciosamente en importes cero. Los errores de carga se muestran en pantalla en EstadisticasScreen.tsx.
Compilación: corregí una propiedad inválida de estilos (justify); npx tsc --noEmit ahora termina correctamente.
Insignias: la pantalla mostraba datos fijos de prueba en InsigniasScreen.tsx. Dejé esos datos como demo y conecté el botón “Compartir Logro” al diálogo nativo de compartir (InsigniasScreen.tsx).
Inicio: corregí el enlace de Insignias, que decía “Ver Gráficas”, en InicioScreen.tsx. Ambas pantallas ya estaban registradas en la navegación.
La verificación fue de compilación TypeScript; no validé consultas contra una sesión real de Supabase ni en un dispositivo. Las insignias, por ahora, no representan el progreso real de cada usuario.



















el boton no guardar esta(rodada) no funciona, si cambiamos de apartado y regresamos la vuelve a mostrar
lo mismo pasa si pulsamos el boton de recordar mañana, salimos del modal, vamos a otro apartado, regresamos, vuelve a mostrarse aunque sea el mismo dia







![alt text](image-1.png)
el chatbot esta muy desconfigurado

terminos de seguridad

politicas de privacidad

revisar el dashboard

