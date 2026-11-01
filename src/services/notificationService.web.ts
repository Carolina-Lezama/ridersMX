export const solicitarPermisosNotificaciones = async (): Promise<boolean> => false;

export const limpiarNotificacionesRacha = async (): Promise<void> => {};

export const limpiarNotificacionesEventos = async (): Promise<void> => {};

export const obtenerTotalNotificacionesProgramadas = async (): Promise<number> => 0;

export const programarNotificacionesEventos = async (_userId: string): Promise<boolean> => false;

export const programarNotificacionesRacha = async (
  _completadoHoy: boolean,
  _horaRecordatorio = '19:00',
  _pedirPermiso = false,
): Promise<boolean> => false;

export const notificarLimiteTiempoUso = async (_minutos: number): Promise<boolean> => false;
