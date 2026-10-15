import Constants from 'expo-constants';

const getApiUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const host = Constants.expoConfig?.hostUri?.replace(/:\d+$/, '');
  if (!host) {
    throw new Error(
      'No se configuró EXPO_PUBLIC_GEMINI_API_URL para el servidor de diagnóstico.',
    );
  }

  return `http://${host}:5000`;
};

const geminiapi = {
  enviarMensaje: async (mensaje: string): Promise<string> => {
    const apiUrl = getApiUrl();
    let response: Response;

    try {
      response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      throw new Error(
        'No se pudo conectar con el servidor del chatbot. Inicia la app con npm start para levantarlo junto con Expo.',
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