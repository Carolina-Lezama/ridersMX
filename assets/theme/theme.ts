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
  onPrimary: '#ffffff',        // Texto e iconos sobre acciones primarias
  accent: '#FF6347',           // Coral usado para acentos y acciones destacadas
  cardHeader: '#f1f5f9',       // Fondo secundario para encabezados de tarjetas
  switchTrackFalse: '#cbd5e1', // Color del switch apagado
  successText: '#059669',
  successBg: '#d1fae5',
  successBorder: '#a7f3d0',
  warningText: '#b45309',
  warningBg: '#fef3c7',
  warningBorder: '#fcd34d',
  mutedBg: '#f1f5f9',
  accentBg: '#fff1ee',
  star: '#f59e0b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  teal: '#14b8a6',
  shadow: '#000000',
  overlay: 'rgba(15, 23, 42, 0.55)',
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
  onPrimary: '#ffffff',
  accent: '#FF7A5C',           // Coral más claro para mantener contraste en oscuro
  cardHeader: '#243247',       // Fondo secundario para encabezados de tarjetas
  switchTrackFalse: '#475569', // Color del switch apagado en oscuro
  successText: '#34d399',
  successBg: '#064e3b',
  successBorder: '#047857',
  warningText: '#fbbf24',
  warningBg: '#422006',
  warningBorder: '#92400e',
  mutedBg: '#334155',
  accentBg: '#3a211c',
  star: '#fbbf24',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  pink: '#f472b6',
  teal: '#2dd4bf',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

// Definimos el tipo de nuestro tema para que TypeScript nos ayude con el autocompletado
export type Theme = typeof lightTheme;