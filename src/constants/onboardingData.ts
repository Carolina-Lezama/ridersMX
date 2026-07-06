export interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image: string; // Aquí guardaremos la referencia al asset local o animación
  backgroundColor: string; // Un color de fondo sutil por si queremos transiciones de color
}

export const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: '1',
    title: '¡Bienvenido al Club, Rider!',
    description: 'La aplicación definitiva para apasionados de las dos ruedas. Todo lo que necesitas para tu vida motociclista en un solo lugar.',
    image: 'welcome_moto', // Identificador para tu imagen/ilustración
    backgroundColor: '#007bff', // Azul principal de la app
  },
  {
    id: '2',
    title: 'Controla tu Garaje',
    description: 'Registra tus motocicletas, gestiona sus especificaciones y lleva un historial detallado de mantenimientos sin perder ningún dato.',
    image: 'garage_moto',
    backgroundColor: '#1e293b', // Gris oscuro / Slate
  },
  {
    id: '3',
    title: 'Planifica tus Rodadas',
    description: 'Organiza tu calendario, descubre próximos eventos de la comunidad y nunca te pierdas una salida a la carretera.',
    image: 'calendar_moto',
    backgroundColor: '#10b981', // Verde esmeralda (ideal para eventos/rutas)
  },
  {
    id: '4',
    title: 'Seguridad en el Camino',
    description: 'Mantén a la mano tu información médica, contactos de emergencia y números de licencia para rodar siempre protegido.',
    image: 'security_moto',
    backgroundColor: '#ef4444', // Rojo seguridad
  },
];