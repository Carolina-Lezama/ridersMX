const API_URL = 'https://gemini-backend-zeta.vercel.app';

const geminiapi = {
  enviarMensaje: async (mensaje: string): Promise<string> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      throw new Error(
        `No se pudo conectar con el servidor del chatbot en ${API_URL}. ` +
          'Verifica que el backend esté disponible e inténtalo de nuevo.',
      );
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('El servidor del chatbot devolvió una respuesta inválida.');
    }

    const payload = data as { respuesta?: unknown; error?: unknown };
    if (!response.ok) {
      throw new Error(
        typeof payload.error === 'string'
          ? payload.error
          : `El servidor del chatbot respondió con el error ${response.status}.`,
      );
    }
    if (typeof payload.respuesta !== 'string' || !payload.respuesta.trim()) {
      throw new Error('El servidor del chatbot no devolvió una respuesta válida.');
    }

    return payload.respuesta;
  },
};

export default geminiapi;