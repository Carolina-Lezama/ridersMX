

4. Documento y Banco de Preguntas (quizQuestions.json)
Objetivo: Disponer de una fuente de datos local estructurada, fácil de ampliar y mantener.
	Ubicación del archivo: src/data/quizQuestions.json.
	Estructura del Schema:
JSON
[
  {
    "id": "q_001",
    "categoria": "Mantenimiento",
    "pregunta": "¿Qué indica un color blanquecino o lechoso en el aceite del motor?",
    "opciones": [
      "Desgaste normal por kilometraje",
      "Presencia de anticongelante/agua en el motor",
      "Exceso de aditivo de viscosidad",
      "Falta de uso del vehículo"
    ],
    "respuestaCorrecta": 1,
    "explicacion": "El aspecto lechoso se produce por la emulsión del aceite al mezclarse con líquido refrigerante o agua."
  }
]
	Lógica de Rotación Diaria:
	Cálculo algorítmico basado en el día del año: indice = diaDelAño % totalPreguntas.
	Garantiza que todos los usuarios reciban la misma pregunta el mismo día sin necesidad de realizar consultas pesadas al backend.
5. Sistema de Comodines (Streak Freeze / Congelador)
Objetivo: Proteger la motivación del usuario evitando que pierda todo su avance por olvidar ingresar un solo día.
	Lógica de Negocio:
	Cada usuario inicia con 1 Comodín disponible por defecto.
	Regla de consumo: Si el sistema detecta que el último check-in fue hace 2 días (Día-2), en lugar de reiniciar la racha a 0, evalúa:
	Si tiene comodín: Consume 1 comodín, mantiene la racha intacta y marca el día perdido como "Salvado con ❄️".
	Si no tiene comodín: La racha se reinicia a 0.
	Regeneración de Comodines: Se otorga 1 comodín extra al alcanzar hitos importantes (ej. racha de 7 y 30 días), con un límite máximo de 2 comodines acumulados.
	Visualización: Ícono de copo de nieve / escudo helado ❄️ situado junto a la llama en el Dashboard.
6. Arquitectura de Base de Datos (Supabase SQL)
Objetivo: Crear una estructura relacional limpia, segura y eficiente en Supabase.
	Estructura de Tablas:
Tabla	Campo Clave	Descripción
rachas_usuario	perfil_id (PK, FK)	Almacena racha_actual, racha_maxima, ultimo_checkin (DATE), comodines_disponibles y ultimo_comodin_usado.
insignias	id (PK)	Catálogo de logros con nombre, descripcion, icono y racha_requerida.
usuario_insignias	(perfil_id, insignia_id)	Historial de insignias desbloqueadas por usuario con fecha_desbloqueo.
	Procedimiento Almacenado (RPC SQL):
	Creación de la función procesar_checkin_diario(p_user_id) que ejecuta en una sola transacción atómica:
	Validar si el check-in de hoy ya fue realizado.
	Calcular días transcurridos desde el último check-in.
	Incrementar racha o aplicar comodín según corresponda.
	Verificar si se alcanzaron nuevas insignias e insertarlas en usuario_insignias.
	Retornar el estado actualizado de la racha al cliente.
7. Apartado Visual de Notificaciones (Pantalla de Preferencias)
Objetivo: Ofrecer una pantalla completa de ajustes de alertas con categorización clara, dejando preparadas las futuras integraciones.
	Ubicación: Reemplazo/Actualización del módulo de preferencias en ConfiguracionScreen.tsx o NotificacionesScreen.tsx.
	Estructura por Secciones (Switches Independientes):
 ┌──────────────────────────────────────────────────────────┐
 │ PREFERENCIAS DE NOTIFICACIONES                           │
 ├──────────────────────────────────────────────────────────┤
 │  [🔥] RACHA Y HÁBITOS                                   │
 │   • Recordatorio de Check-in Diario             [ ON ] │
 │   • Hora del Recordatorio                   [ 19:00 PM ] │
 ├──────────────────────────────────────────────────────────┤
 │  [⏱️] BIENESTAR Y TIEMPO DE USO                         │
 │   • Alerta de Límite Diario Alcanzado           [ ON ] │
 ├──────────────────────────────────────────────────────────┤
 │  [🛠️] VEHÍCULO Y MANTENIMIENTO (Próximamente)            │
 │   • Recordatorios de Cambio de Aceite / Frenos  [ OFF ] │
 ├──────────────────────────────────────────────────────────┤
 │  [💬] COMUNIDAD (Próximamente)                           │
 │   • Respuestas a tus publicaciones              [ OFF ] │
 └──────────────────────────────────────────────────────────┘
8. Sistema Horario de Recordatorios y Tiempo de Uso
Objetivo: Configurar las alertas programadas locales utilizando expo-notifications.
	Alertas Programadas de Racha:
	Alerta 1 (Preventiva - 7:00 PM): Se programa diariamente. Si el usuario realiza su check-in antes de esa hora, la notificación de ese día se cancela automáticamente.
	Alerta 2 (Urgencia - 10:00 PM): Se dispara únicamente si a las 10:00 PM el usuario no ha realizado su check-in y su racha está en riesgo.
	Alertas Integradas de Tiempo de Uso:
	Evento gatillado directamente desde useAppTimeTracker cuando los minutos de sesión alcancen el limiteNotificacion configurado.
9. Persistencia y Control de Estado de Notificaciones
Objetivo: Garantizar que los cambios en los switches de notificaciones se apliquen inmediatamente tanto en el sistema operativo del teléfono como en la base de datos.
	Estrategia de Almacenamiento Doble:
	Local (AsyncStorage): Lectura instantánea al arrancar la app sin esperar respuesta de red.
	Remoto (Supabase perfiles): Guardado de una estructura JSONB notificaciones_config para mantener las preferencias sincronizadas entre dispositivos.
	Lógica de Canceling/Scheduling:
	Switch ON: Registra los disparadores de tiempo en el motor de expo-notifications.
	Switch OFF: Ejecuta inmediatamente cancelAllScheduledNotificationsAsync() o cancela el ID específico de la alarma de racha.
Matriz de Resumen del Plan de Trabajo
Paso	Módulo	Entregable Clave	Dependencia Directa
1	Base de Datos	Script SQL en Supabase (Tablas + RPC procesar_checkin_diario).	Ninguna
2	Datos Estáticos	quizQuestions.json + insigniasCatalog.ts.	Ninguna
3	Servicios	streakService.ts (Lógica de racha, check-in y comodín).	Paso 1 y 2
4	UI Quiz	QuizModal.tsx / QuizScreen.tsx con animaciones.	Paso 3
5	UI Dashboard	RachaWidget.tsx con animación de fuego y estado dinámico.	Paso 3
6	UI Logros	InsigniasScreen.tsx con la galería de insignias y comodines.	Paso 1 y 3
7	Notificaciones	notificationService.ts con expo-notifications.	Ninguna
8	UI Ajustes	Pantalla de Preferencias de Notificaciones completa.	Paso 7
9	Integración	Conexión global del widget, modal, alertas y persistencia.	Pasos 4, 5, 6 y 8


















SIGUIENTE APARTADO, HACER PLAN DE TRABAJO: Notificaciones Push



hacer los apartados de configuracion:

Recordatorios de Mantenimiento
cambiar contraseña
agregar otra cuenta
mi actividad reciente

que en dashboard se ocupe el nombre del usuario y no uno predeterminado 






Para tu perfil como desarrolladora y con múltiples proyectos en puerta (como tu sistema de papelería en PHP/MySQL y tus aplicaciones web/móviles), lo más inteligente y económico es comprar un VPS único (como un servidor en Hetzner o DigitalOcean).

pero no se guardan kilometros ni nada, sino que solo son fechas, pero me diste una gran idea, porque no agregar un apartado, despues de que la rodada pase(ese mismo dia o al siguiente), que se le pregunte al usuario como estuvo, duracion, distancias, etc. y de eso si podemos hacer registros y graficos para el lobby 


Pedir al usuario al terminar la rodada —o recordárselo al día siguiente— que ingrese datos sencillos como la distancia aproximada, el tiempo de duración, una foto o una breve reseña transforma una simple fecha en una bitácora de experiencias.















Fase 1: Blindaje de la Base de Datos (RLS para Motocicletas)
Acción: Ejecutaremos un script SQL en Supabase para crear las Políticas de Seguridad (Policies) específicas para la tabla motocicletas.

Justificación: Si recuerdas nuestro tropiezo con el error 401 en el registro, fue porque la tabla estaba bloqueada. Necesitamos decirle a Supabase: "Permite que un usuario inserte, actualice y borre motos, pero solo si el perfil_id de esa moto coincide con su sesión actual". Sin esto, el frontend fallará silenciosamente.







2. Mejoras de UI/UX a tus módulos actuales
   Ya tienes la estructura funcional de varios apartados. Ahora podemos hacer que se sientan como una aplicación Premium:

Skeletons Loaders (Dashboard y Perfil): En lugar de mostrar la clásica ruedita azul girando (ActivityIndicator) cuando la app cargue datos, podemos construir "Skeletons". Son esos bloques de color gris claro que parpadean y simulan la forma que tendrá el contenido (como hace YouTube o Facebook antes de cargar un video).

Validación de Formularios "En Vivo" (Login, Register, Moto): Actualmente, la aplicación espera a que el usuario presione "Guardar" para decirle si hay un error. Podemos implementar lógica local para que, si el usuario escribe un correo inválido o una contraseña muy corta, el borde del CustomInput se ponga rojo de inmediato y muestre un texto de ayuda debajo, antes de enviar el formulario.

Micro-animaciones (Barra de opciones / Menú): Podemos agregar efectos visuales para que, cuando el usuario toque un icono de la barra de navegación inferior, este haga un pequeño rebote o cambie de tamaño suavemente.

Estados Vacíos Ilustrados (Empty States): Ya hicimos uno básico en el Garaje (cuando no hay motos), pero podemos mejorarlo en el Dashboard. Diseñar componentes atractivos que guíen al usuario sobre qué hacer cuando no tiene datos registrados aún.

codigo de app a revisar:

Etapa 4: Animaciones y Microinteracciones (Opcional pero recomendado)
¿Qué haremos? Utilizaremos la API Animated nativa de React Native o la librería react-native-reanimated para hacer que los puntitos indicadores crezcan o cambien de color suavemente conforme el usuario desliza la pantalla.

Justificación: Este es el "excelente ejercicio de diseño" que mencionaste. Las transiciones fluidas marcan la diferencia entre una app que se siente "de juguete" y una app que se siente "premium".




        {/* SECCIÓN 3: SOPORTE E INFORMACIÓN */}
        <Text style={styles.sectionTitle}>Soporte e Información</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Centro de Ayuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Términos y Privacidad</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Versión de la App</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>