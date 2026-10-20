import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
  if (configuredUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(configuredUrl);
    } catch {
      throw new Error(
        'EXPO_PUBLIC_GEMINI_API_URL debe ser una URL absoluta válida, por ejemplo https://tu-servidor.com.',
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('EXPO_PUBLIC_GEMINI_API_URL debe usar HTTP o HTTPS.');
    }

    return configuredUrl.replace(/\/+$/, '');
  }

  if (__DEV__) {
    if (Platform.OS === 'web') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      return `http://${hostname || 'localhost'}:5000`;
    }

    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      try {
        const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
        if (host) {
          return `http://${host}:5000`;
        }
      } catch {
        // Fall through to the actionable configuration error below.
      }
    }
  }

  throw new Error(
    'No se configuró EXPO_PUBLIC_GEMINI_API_URL para el servidor de diagnóstico. ' +
      'Configúrala con la URL base HTTPS de tu backend antes de compilar la app.',
  );
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
        `No se pudo conectar con el servidor del chatbot en ${apiUrl}. ` +
          'Inicia Expo con npm start o npm run web para levantar también el backend ' +
          'y verifica que el navegador pueda acceder a esa dirección.',
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