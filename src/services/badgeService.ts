import { supabase } from './supabase';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export interface Insignia {
  id: string;
  nombre: string;
  descripcion: string;
  requisito: string;
  icono: ComponentProps<typeof Ionicons>['name'];
  color: string;
  desbloqueada: boolean;
  fechaDesbloqueo?: string;
  progresoActual: number;
  progresoTotal: number;
}

interface BadgeProgress {
  rachaMaxima: number;
  checkins: number;
  kilometros: number;
  motocicletas: number;
  rodadas: number;
  mantenimientos: number;
  publicaciones: number;
  resenas: number;
}

const crearInsignias = (progreso: BadgeProgress): Insignia[] => [
  {
    id: 'primer-checkin',
    nombre: 'Primer paso',
    descripcion: 'Completaste tu primer check-in diario.',
    requisito: 'Completa un check-in.',
    icono: 'footsteps-outline',
    color: '#3b82f6',
    desbloqueada: progreso.checkins >= 1,
    progresoActual: progreso.checkins,
    progresoTotal: 1,
  },
  {
    id: 'racha-semanal',
    nombre: 'Rider constante',
    descripcion: 'Mantuviste una racha de una semana.',
    requisito: 'Alcanza una racha máxima de 7 días.',
    icono: 'flame-outline',
    color: '#f59e0b',
    desbloqueada: progreso.rachaMaxima >= 7,
    progresoActual: progreso.rachaMaxima,
    progresoTotal: 7,
  },
  {
    id: 'racha-mensual',
    nombre: 'Leyenda del asfalto',
    descripcion: 'Tu constancia alcanzó un mes completo.',
    requisito: 'Alcanza una racha máxima de 30 días.',
    icono: 'trophy-outline',
    color: '#ec4899',
    desbloqueada: progreso.rachaMaxima >= 30,
    progresoActual: progreso.rachaMaxima,
    progresoTotal: 30,
  },
  {
    id: 'primera-moto',
    nombre: 'Garaje listo',
    descripcion: 'Registraste una motocicleta en tu garaje.',
    requisito: 'Registra una motocicleta.',
    icono: 'bicycle-outline',
    color: '#8b5cf6',
    desbloqueada: progreso.motocicletas >= 1,
    progresoActual: progreso.motocicletas,
    progresoTotal: 1,
  },
  {
    id: 'primera-rodada',
    nombre: 'Kilómetros de libertad',
    descripcion: 'Guardaste tu primera rodada en la bitácora.',
    requisito: 'Registra una rodada.',
    icono: 'map-outline',
    color: '#06b6d4',
    desbloqueada: progreso.rodadas >= 1,
    progresoActual: progreso.rodadas,
    progresoTotal: 1,
  },
  {
    id: 'cien-kilometros',
    nombre: 'Explorador de rutas',
    descripcion: 'Acumulaste 100 kilómetros en tus rodadas.',
    requisito: 'Registra 100 km en la bitácora.',
    icono: 'navigate-outline',
    color: '#10b981',
    desbloqueada: progreso.kilometros >= 100,
    progresoActual: Math.floor(progreso.kilometros),
    progresoTotal: 100,
  },
  {
    id: 'primer-mantenimiento',
    nombre: 'Moto cuidada',
    descripcion: 'Agendaste tu primer servicio de mantenimiento.',
    requisito: 'Agenda un evento de mantenimiento.',
    icono: 'build-outline',
    color: '#ef4444',
    desbloqueada: progreso.mantenimientos >= 1,
    progresoActual: progreso.mantenimientos,
    progresoTotal: 1,
  },
  {
    id: 'comunidad',
    nombre: 'Rider en comunidad',
    descripcion: 'Compartiste tu primera publicación en el foro.',
    requisito: 'Publica en el foro.',
    icono: 'chatbubbles-outline',
    color: '#f97316',
    desbloqueada: progreso.publicaciones >= 1,
    progresoActual: progreso.publicaciones,
    progresoTotal: 1,
  },
  {
    id: 'primera-resena',
    nombre: 'Voz de experiencia',
    descripcion: 'Ayudaste a otros riders con una reseña.',
    requisito: 'Escribe una reseña.',
    icono: 'star-outline',
    color: '#eab308',
    desbloqueada: progreso.resenas >= 1,
    progresoActual: progreso.resenas,
    progresoTotal: 1,
  },
];

export const obtenerResumenInsignias = async (perfilId: string) => {
  const [
    rachaResult,
    checkinsResult,
    rodadasResult,
    motosResult,
    eventosResult,
    publicacionesResult,
    resenasResult,
    perfilResult,
  ] = await Promise.all([
    supabase
      .from('rachas_usuario')
      .select('racha_actual, racha_maxima')
      .eq('perfil_id', perfilId)
      .maybeSingle(),
    supabase
      .from('historial_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfilId),
    supabase
      .from('bitacoras_rodadas')
      .select('distancia_km')
      .eq('perfil_id', perfilId),
    supabase
      .from('motocicletas')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfilId),
    supabase
      .from('eventos')
      .select('tipo, estado')
      .eq('perfil_id', perfilId),
    supabase
      .from('foro_publicaciones')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfilId),
    supabase
      .from('resenas')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', perfilId),
    supabase
      .from('perfiles')
      .select('insignia_favorita_id')
      .eq('id', perfilId)
      .single(),
  ]);

  const results = [
    rachaResult,
    checkinsResult,
    rodadasResult,
    motosResult,
    eventosResult,
    publicacionesResult,
    resenasResult,
    perfilResult,
  ];
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;
  if (!perfilResult.data) throw new Error('No se encontró el perfil para consultar la insignia favorita.');

  const racha = rachaResult.data;
  const eventos = eventosResult.data ?? [];
  const rodadas = rodadasResult.data ?? [];
  const progreso: BadgeProgress = {
    rachaMaxima: Math.max(racha?.racha_maxima ?? 0, racha?.racha_actual ?? 0),
    checkins: checkinsResult.count ?? 0,
    kilometros: rodadas.reduce((total, rodada) => total + Number(rodada.distancia_km ?? 0), 0),
    motocicletas: motosResult.count ?? 0,
    rodadas: rodadas.length,
    mantenimientos: eventos.filter((evento) =>
      evento.tipo === 'mantenimiento' && evento.estado !== 'Cancelada',
    ).length,
    publicaciones: publicacionesResult.count ?? 0,
    resenas: resenasResult.count ?? 0,
  };
  const insignias = crearInsignias(progreso);
  const favoritaId = perfilResult.data.insignia_favorita_id as string | null;
  const favoritaConfigurada = insignias.find((item) => item.id === favoritaId && item.desbloqueada)
    ?? null;
  const favorita = favoritaConfigurada ?? insignias.find((item) => item.desbloqueada) ?? null;

  return { insignias, favorita, favoritaId: favoritaConfigurada?.id ?? null };
};

export const guardarInsigniaFavorita = async (perfilId: string, insigniaId: string) => {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ insignia_favorita_id: insigniaId })
    .eq('id', perfilId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se encontró el perfil para guardar la insignia favorita.');
};
