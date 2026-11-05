export const solicitarPermisosNotificaciones = async (): Promise<boolean> => false;

export const limpiarNotificacionesRacha = async (): Promise<void> => {};

export const programarNotificacionesRacha = async (
  _completadoHoy: boolean,
  _horaRecordatorio = '19:00',
): Promise<boolean> => false;

export const notificarLimiteTiempoUso = async (_minutos: number): Promise<boolean> => false;
