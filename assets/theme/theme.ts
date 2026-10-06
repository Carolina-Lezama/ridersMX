// theme.ts

export const lightTheme = {
  // Fondos
  background: '#f8fafc',       // Fondo gris muy claro de la app
  card: '#ffffff',             // Fondo blanco de las tarjetas y header
  
  // Textos
  textPrimary: '#0f172a',      // Títulos y textos principales (casi negro)
  textSecondary: '#64748b',    // Subtítulos y textos secundarios (gris medio)
  
  // Bordes y separadores
  border: '#e2e8f0',           // Bordes de las tarjetas
  divider: '#f1f5f9',          // Líneas divisorias entre opciones
  
  // Iconos
  iconPrimary: '#0f172a',      // Iconos principales
  iconSecondary: '#94a3b8',    // Iconos de flechitas
  
  // Acciones / Peligro (Botón de cerrar sesión)
  dangerBg: '#fef2f2',         // Fondo rojizo claro
  dangerText: '#ef4444',       // Texto rojo brillante
  dangerBorder: '#fecaca',     // Borde rojizo
  
  // Marca / Interfaz
  primary: '#007bff',          // Azul para el switch encendido
  switchTrackFalse: '#cbd5e1', // Color del switch apagado
};

export const darkTheme = {
  // Fondos
  background: '#0f172a',       // Slate 900 - Fondo principal oscuro
  card: '#1e293b',             // Slate 800 - Tarjetas un poco más claras para dar relieve
  
  // Textos
  textPrimary: '#f8fafc',      // Blanco humo para que no lastime la vista
  textSecondary: '#94a3b8',    // Slate 400 - Gris claro para subtítulos
  
  // Bordes y separadores
  border: '#334155',           // Slate 700 - Bordes sutiles
  divider: '#334155',          // Slate 700 - Líneas divisorias oscuras
  
  // Iconos
  iconPrimary: '#f8fafc',      // Iconos en blanco humo
  iconSecondary: '#64748b',    // Iconos de flechitas oscurecidos
  
  // Acciones / Peligro adaptadas a modo oscuro
  dangerBg: '#450a0a',         // Fondo rojo muy oscuro
  dangerText: '#f87171',       // Texto rojo salmón (más legible en oscuro)
  dangerBorder: '#7f1d1d',     // Borde rojo oscuro
  
  // Marca / Interfaz
  primary: '#3b82f6',          // Azul ajustado para mejor contraste
  switchTrackFalse: '#475569', // Color del switch apagado en oscuro
};

// Definimos el tipo de nuestro tema para que TypeScript nos ayude con el autocompletado
export type Theme = typeof lightTheme;