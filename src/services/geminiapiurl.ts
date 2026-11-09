import * as FileSystem from 'expo-file-system';
// ==========================================
// CONFIGURACIÓN INICIAL Y URL BASE
// ==========================================
// Define la constante con la dirección web del servidor backend en Vercel
// hacia donde el cliente realizará todas las peticiones HTTP.
const API_URL = 'https://gemini-backend-zeta.vercel.app';

// ==========================================
// OBJETO PRINCIPAL DEL CLIENTE API
// ==========================================
// Agrupa todas las funciones y métodos de comunicación con el chatbot.
const geminiapi = {

  // ==========================================
  // MÉTODO PARA ENVIAR MENSAJES DE TEXTO
  // ==========================================
  // Función asíncrona que comunica una consulta escrita al servidor de Flask.
enviarMensaje: async (mensaje: string): Promise<string> => {
    let response: Response;
    // Control de errores de red o caídas de conexión con el servidor
    try {
      //Peticion POST donde envia el mensaje convertido a cadena JSON
      response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
      //Muestra el error en la consola
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      //Envia un mensaje de error al usuario final dentro del chat
      throw new Error(
        `No se pudo conectar con el servidor del chatbot en ${API_URL}. ` +
          'Verifica que el backend esté disponible e inténtalo de nuevo.',
      );
    }

    // Valida si el código de estado HTTP de la respuesta NO es exitoso (ej. 400, 500, etc.)
    if (!response.ok) {
      // Lee el texto crudo del error exacto devuelto por Vercel o por el script de Python en Flask
      const errorText = await response.text();
      // Lanza una excepción detallando el estatus HTTP y el mensaje de error del servidor
      throw new Error(`Error ${response.status} del servidor: ${errorText}`);
    }
    
    //Procesamiento, casteo y validación estructural del JSON de respuesta
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('El servidor del chatbot devolvió una respuesta inválida.');
    }

    //Extracción y verificación final del texto generado por la IA
    const payload = data as { respuesta?: unknown };
    if (typeof payload.respuesta !== 'string' || !payload.respuesta.trim()) {
      throw new Error('El servidor del chatbot no devolvió una respuesta válida.');
    }

    return payload.respuesta;
  },

  // ==========================================
  // MÉTODO PARA ENVÍO MULTIMODAL (IMAGEN + TEXTO)
  // ==========================================
  // Función asíncrona que empaqueta una imagen en Base64 junto a su texto descriptivo.
enviarImagenYTexto: async (base64Images: string[], mensaje: string): Promise<string> => {
    let response: Response;
    //Control de errores de red al transmitir archivos de imagen pesados
    try {
      response = await fetch(`${API_URL}/api/chat`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, imagenes: base64Images }),
      });
    } catch (error) {
      console.error('Error al enviar la imagen a Gemini:', error);
      throw new Error(
        `No se pudo conectar con el servidor del chatbot en ${API_URL}. ` +
          'Verifica que el backend esté disponible e inténtalo de nuevo.',
      );
    }
    //Comprobación de que el servidor no haya rechazado la petición multimodal
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status} del servidor: ${errorText}`);
    }
    //Conversión y validación de integridad del JSON recibido del backend
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('El servidor del chatbot devolvió una respuesta inválida.');
    }

    //Comprobación estricta de que la respuesta de visión de la IA no venga vacía
    const payload = data as { respuesta?: unknown };
    if (typeof payload.respuesta !== 'string' || !payload.respuesta.trim()) {
      throw new Error('El servidor del chatbot no devolvió una respuesta válida.');
    }

    return payload.respuesta;
  },
};


export default geminiapi;