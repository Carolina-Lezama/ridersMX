// ThemeContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from './theme';

// 1. Definimos qué información va a compartir nuestro contexto
interface ThemeContextProps {
  isDarkMode: boolean;       // Para saber el estado actual (y pasarlo al Switch)
  theme: Theme;              // Los colores actuales (lightTheme o darkTheme)
  toggleTheme: () => void;   // La función para cambiar el tema
}

// 2. Creamos el Contexto con valores por defecto
const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

// 3. Creamos el Proveedor (ThemeProvider)
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReady, setIsReady] = useState(false); // Evita el parpadeo inicial

  // Al abrir la app, buscamos en la memoria (caché) qué tema tenía el usuario
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_modo_oscuro');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true'); // Convertimos el string a boolean
        }
      } catch (error) {
        console.error('Error cargando el tema de AsyncStorage:', error);
      } finally {
        setIsReady(true); // Ya terminamos de leer, podemos mostrar la app
      }
    };

    loadThemePreferences();
  }, []);

  // Función que se ejecutará cuando el usuario presione el Switch
  const toggleTheme = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue); // Actualizamos el estado en memoria RAM
      await AsyncStorage.setItem('@app_modo_oscuro', newValue.toString()); // Guardamos en disco (caché)
    } catch (error) {
      console.error('Error guardando el tema en AsyncStorage:', error);
    }
  };

  // Dependiendo del estado, elegimos la paleta de colores
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Si aún está leyendo de la base de datos local, no dibujamos nada para evitar "flicker"
  if (!isReady) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Creamos un Hook personalizado para usarlo fácilmente en las pantallas
export const useTheme = () => useContext(ThemeContext);