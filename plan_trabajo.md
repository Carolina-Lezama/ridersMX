




















Validación de Formularios "En Vivo" (Login, Register, Moto): Actualmente, la aplicación espera a que el usuario presione "Guardar" para decirle si hay un error. Podemos implementar lógica local para que, si el usuario escribe un correo inválido o una contraseña muy corta, el borde del CustomInput se ponga rojo de inmediato y muestre un texto de ayuda debajo, antes de enviar el formulario.

Micro-animaciones (Barra de opciones / Menú): Podemos agregar efectos visuales para que, cuando el usuario toque un icono de la barra de navegación inferior, este haga un pequeño rebote o cambie de tamaño suavemente.

Estados Vacíos Ilustrados (Empty States): Ya hicimos uno básico en el Garaje (cuando no hay motos), pero podemos mejorarlo en el Dashboard. Diseñar componentes atractivos que guíen al usuario sobre qué hacer cuando no tiene datos registrados aún.

codigo de app a revisar:

Etapa 4: Animaciones y Microinteracciones (Opcional pero recomendado)
¿Qué haremos? Utilizaremos la API Animated nativa de React Native o la librería react-native-reanimated para hacer que los puntitos indicadores crezcan o cambien de color suavemente conforme el usuario desliza la pantalla.

Justificación: Este es el "excelente ejercicio de diseño" que mencionaste. Las transiciones fluidas marcan la diferencia entre una app que se siente "de juguete" y una app que se siente "premium".

