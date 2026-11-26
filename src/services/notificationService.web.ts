import { supabase } from './supabase';
import { obtenerFechaRecordatorioEvento } from '../utils/eventoNotifications';

const PREFIJO_NOTIFICACION_EVENTO = 'evento-';
const PREFIJO_NOTIFICACION_RACHA = 'racha-';
const MAX_TIMEOUT_MS = 2_147_483_647;
const notificacionesProgramadas = new Map<string, ReturnType<typeof setTimeout>>();

interface EventoProgramable {
  id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  tipo: string | null;
  estado: string | null;
}

export interface PreferenciasNotificacionesAgenda {
  rodadasEnabled: boolean;
  mantenimientosEnabled: boolean;
}

const notificacionesDisponibles = () => typeof Notification !== 'undefined';

const mostrarNotificacion = async (
  id: string,
  titulo: string,
  cuerpo: string,
  data?: Record<string, string>,
): Promise<boolean> => {
  if (!notificacionesDisponibles() || Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body: cuerpo,
    tag: id,
    icon: '/logo192.png',
    data,
  };
  const registration = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistration()
    : undefined;

  if (registration && 'showNotification' in registration) {
    await registration.showNotification(titulo, options);
  } else {
    new Notification(titulo, options);
  }
  return true;
};

const programarNotificacion = (
  id: string,
  fecha: Date,
  titulo: string,
  cuerpo: string,
  data?: Record<string, string>,
) => {
  const demora = fecha.getTime() - Date.now();
  if (demora <= 0 || demora > MAX_TIMEOUT_MS) return;

  const timer = setTimeout(() => {
    notificacionesProgramadas.delete(id);
    void mostrarNotificacion(id, titulo, cuerpo, data).catch((error: unknown) => {
      console.error('No se pudo mostrar el recordatorio web:', error);
    });
  }, demora);
  notificacionesProgramadas.set(id, timer);
};

const limpiarNotificaciones = (prefijo: string) => {
  for (const [id, timer] of notificacionesProgramadas) {
    if (!id.startsWith(prefijo)) continue;
    clearTimeout(timer);
    notificacionesProgramadas.delete(id);
  }
};

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  if (!notificacionesDisponibles()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
};

export const tienePermisosNotificaciones = async (): Promise<boolean> => (
  notificacionesDisponibles() && Notification.permission === 'granted'
);

export const limpiarNotificacionesRacha = async (): Promise<void> => {
  limpiarNotificaciones(PREFIJO_NOTIFICACION_RACHA);
};

export const limpiarNotificacionesEventos = async (): Promise<void> => {
  limpiarNotificaciones(PREFIJO_NOTIFICACION_EVENTO);
};

export const obtenerTotalNotificacionesProgramadas = async (): Promise<number> => (
  notificacionesProgramadas.size
);

export const programarNotificacionesEventos = async (
  userId: string,
  preferencias: PreferenciasNotificacionesAgenda = {
    rodadasEnabled: true,
    mantenimientosEnabled: true,
  },
): Promise<boolean> => {
  await limpiarNotificacionesEventos();
  if (!preferencias.rodadasEnabled && !preferencias.mantenimientosEnabled) return true;
  if (!(await tienePermisosNotificaciones())) return false;

  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const { data: eventos, error } = await supabase
    .from('eventos')
    .select('id, titulo, fecha, hora, tipo, estado')
    .eq('perfil_id', userId)
    .eq('estado', 'Planeada')
    .gte('fecha', fechaHoy)
    .order('fecha', { ascending: true })
    .limit(100);

  if (error) throw error;

  for (const evento of (eventos ?? []) as EventoProgramable[]) {
    if (!evento.hora) continue;

    const esMantenimiento = evento.tipo === 'mantenimiento';
    if (esMantenimiento ? !preferencias.mantenimientosEnabled : !preferencias.rodadasEnabled) {
      continue;
    }

    const fechaRecordatorio = obtenerFechaRecordatorioEvento(evento.fecha, evento.hora);
    if (!fechaRecordatorio) continue;

    programarNotificacion(
      `${PREFIJO_NOTIFICACION_EVENTO}${evento.id}`,
      fechaRecordatorio,
      esMantenimiento ? 'Recordatorio de mantenimiento' : 'Tu rodada se acerca',
      `${evento.titulo} comienza en 30 minutos.`,
      { eventId: evento.id },
    );
  }

  return true;
};

export const programarNotificacionesRacha = async (
  completadoHoy: boolean,
  horaRecordatorio = '19:00',
  pedirPermiso = false,
): Promise<boolean> => {
  const [hora, minuto] = horaRecordatorio.split(':').map(Number);
  if (
    !Number.isInteger(hora)
    || hora < 0
    || hora > 23
    || !Number.isInteger(minuto)
    || minuto < 0
    || minuto > 59
  ) {
    throw new Error(`Hora de recordatorio no válida: ${horaRecordatorio}`);
  }

  const tienePermiso = (await tienePermisosNotificaciones())
    || (pedirPermiso && await solicitarPermisosNotificaciones());
  if (!tienePermiso) return false;

  await limpiarNotificacionesRacha();
  for (let dia = 0; dia < 7; dia++) {
    if (dia === 0 && completadoHoy) continue;

    const recordatorio = new Date();
    recordatorio.setDate(recordatorio.getDate() + dia);
    recordatorio.setHours(hora, minuto, 0, 0);

    if (recordatorio > new Date()) {
      programarNotificacion(
        `${PREFIJO_NOTIFICACION_RACHA}recordatorio-dia${dia}`,
        recordatorio,
        'RidersMX · Tu racha te espera',
        'Haz tu check-in de hoy y mantén vivo tu progreso.',
      );
    }

    const minutosUrgencia = Math.min(hora * 60 + minuto + 180, 23 * 60 + 59);
    const urgencia = new Date(recordatorio);
    urgencia.setHours(Math.floor(minutosUrgencia / 60), minutosUrgencia % 60, 0, 0);
    if (minutosUrgencia > hora * 60 + minuto && urgencia > new Date()) {
      programarNotificacion(
        `${PREFIJO_NOTIFICACION_RACHA}urgencia-dia${dia}`,
        urgencia,
        'RidersMX · Último aviso del día',
        'Aún puedes completar tu check-in y conservar tu racha.',
      );
    }
  }
  return true;
};

export const notificarLimiteTiempoUso = async (minutos: number): Promise<boolean> => {
  if (!(await solicitarPermisosNotificaciones())) return false;
  return mostrarNotificacion(
    'alerta-tiempo-uso',
    'Límite de tiempo alcanzado',
    `Has superado tu límite de ${minutos} minutos de uso en la sesión de hoy.`,
  );
};
