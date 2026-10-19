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
      throw error;
    }
  },
};

export default geminiapi;