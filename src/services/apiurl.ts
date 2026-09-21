// src/services/api.ts
const API_URL = 'http://192.168.100.43:5000';

const geminiapi = {
  enviarMensaje: async (mensaje: string): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ mensaje }),
      });
      const data = await response.json();
      return data.respuesta;
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      throw error;
    }
  },
};

export default geminiapi;