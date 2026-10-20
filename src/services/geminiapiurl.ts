// src/services/geminiapiurl.ts
const API_URL = 'https://gemini-backend-zeta.vercel.app';

const geminiapi = {
  enviarMensaje: async (mensaje: string): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const data = await response.json();
      return data.respuesta;
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      throw new Error(
        `No se pudo conectar con el servidor del chatbot en ${API_URL}. ` +
          'Inicia Expo con npm start o npm run web para levantar también el backend ' +
          'y verifica que el navegador pueda acceder a esa dirección.',
      );
    }
  },
};

export default geminiapi;