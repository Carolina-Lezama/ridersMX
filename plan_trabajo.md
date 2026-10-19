nuevas cosas a revisar:

![alt text](image.png)
[{"id":"c653f7cf-df56-4dba-9183-02f7f9f016fa","evento_id":"0b3d90b1-d342-4128-b551-7683617c5ad6","perfil_id":"5ceb80ce-3a25-4c9d-bece-2708f430c3f1","distancia_km":"5","duracion_minutos":10,"calificacion":5,"comentarios_review":"meh","foto_url":null,"velocidad_promedio":null,"clima":null,"tipo_terreno":null,"gastos_ruta":"0","created_at":"2026-10-19 14:25:45.749812+00"}]
no se guarda con que motocicleta del usuario se realizo el viaje, modificar la bd para agregar este apartado, luego incluir un apartado que me permita seleccionar cual

el boton no guardar esta(rodada) no funciona, si cambiamos de apartado y regresamos la vuelve a mostrar
lo mismo pasa si pulsamos el boton de recordar mañana, salimos del modal, vamos a otro apartado, regresamos, vuelve a mostrarse aunque sea el mismo dia

calendario interactivo para mostrar que dias de racha hemos tenido

en el apartado dashboard existe el Estado de tu Moto, aqui solo muestra una moto por defecto, mostrar cual querer mostrarse como top, opcion de mostrar todas en forma de lista, sea en apartado diferente(nueva pantalla/modal) o en el mismo bashboard

el apartado estado de tu moto muestra:
<View style={styles.metricsGrid}>
<View style={styles.metricItem}>
<Ionicons name="speedometer-outline" size={18} color={theme.textSecondary} />
<Text style={styles.metricValue}>{kilometrosTotales.toLocaleString('es-MX')} km</Text>
<Text style={styles.metricLabel}>Kilometraje registrado</Text>
</View>
<View style={styles.dividerVertical} />
<View style={styles.metricItem}>
<Ionicons name="build-outline" size={18} color={theme.textSecondary} />
<Text style={styles.metricValue}>{kilometrosTotales >= 1000 ? '¡Logro!' : `${Math.max(0, 1000 - kilometrosTotales)} km`}</Text>
<Text style={styles.metricLabel}>{kilometrosTotales >= 1000 ? 'Meta de 1,000 km' : 'Para los 1,000 km'}</Text>
</View>

es correcto que se traiga todo en motocicletas y eventos, el error ocurre que aunque en eventos marque una cantidad de kilometros, si abres el apartado de motocicletas esta misma moto marca 0 si tiene ese valor, es decir, se estan sumando ambos pero no se actualizan los valores, en lugar de recurrir a consultar ambos, se deberia actualizar lo que se tiene en motocicletas y usarse ese valor.

hay elementos visuales del apartado agenda que no tienen modo oscuro

en el modal denuevo evento(rodada) en el apartado moto asociada, debe mostrar las motos del usuario y un apartado especial que diga otro si solo fue con alguien mas(esta moto no debe repecutir en la bd(manejo de errores))

![alt text](image-1.png)
el chatbot esta muy desconfigurado

terminos de seguridad

politicas de privacidad

revisar el dashboard

revisar para que sirve tus logros en dashboard
