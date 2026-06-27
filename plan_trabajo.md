Fase 1: Blindaje de la Base de Datos (RLS para Motocicletas)
Acción: Ejecutaremos un script SQL en Supabase para crear las Políticas de Seguridad (Policies) específicas para la tabla motocicletas.

Justificación: Si recuerdas nuestro tropiezo con el error 401 en el registro, fue porque la tabla estaba bloqueada. Necesitamos decirle a Supabase: "Permite que un usuario inserte, actualice y borre motos, pero solo si el perfil_id de esa moto coincide con su sesión actual". Sin esto, el frontend fallará silenciosamente.

Fase 2: Creación de MotoFormScreen.tsx (El Formulario Maestro)
Acción: Crearemos una pantalla completamente nueva dedicada exclusivamente al formulario de la motocicleta (Marca, Modelo, Año, etc.).

Justificación: En lugar de tener una pantalla para "Agregar" y otra idéntica para "Editar", usaremos la misma pantalla para ambas acciones. Si la pantalla recibe un ID, se comportará como editor (llenando los datos previos); si no recibe nada, será un lienzo en blanco para una moto nueva. Esto reduce el código a la mitad y facilita el mantenimiento.

Fase 3: Conexión y Navegación con Parámetros
Acción: Actualizaremos el archivo App.tsx para registrar la nueva pantalla y modificaremos tu actual MisMotosScreen.

Justificación: Haremos que el botón flotante (FAB) de MisMotosScreen abra el formulario "en blanco". Además, haremos que, al tocar una moto de la lista, se abra el mismo formulario, pero enviándole el ID de la moto tocada a través de los parámetros de navegación de React Navigation.

Fase 4: Lógica de Eliminación Segura (Delete)
Acción: Agregaremos un botón rojo de "Eliminar Vehículo" al final de MotoFormScreen (que solo será visible si se está editando una moto, no si se está creando una nueva).

Justificación: Borrar registros de una base de datos es una acción destructiva. Implementaremos un Alert de doble confirmación nativo del celular ("¿Estás seguro de que deseas eliminar esta moto?") antes de ejecutar el borrado real en Supabase para prevenir toques accidentales.