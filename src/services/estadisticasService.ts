import { supabase } from './supabase';

export interface KmPorMesData {
  mes: string;
  kilometros: number;
}

export interface GastosDesgloseData {
  rutas: number;
  mantenimiento: number;
}

export interface TerrenoDistribucionData {
  terreno: string;
  total: number;
}

// 1. Obtener kilómetros agrupados por mes
export const obtenerKilometrosPorMes = async (perfilId: string, motoId?: string | null): Promise<KmPorMesData[]> => {
  const hoy = new Date();
  const inicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
  let query = supabase
    .from('bitacoras_rodadas')
    .select('created_at, distancia_km')
    .eq('perfil_id', perfilId)
    .gte('created_at', inicioPeriodo.toISOString());

  if (motoId) {
    query = query.eq('motocicleta_id', motoId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const mesesNom = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const acumuladoMeses: { [key: string]: number } = {};

  // La clave incluye el año para no mezclar el mismo mes de años distintos.
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    acumuladoMeses[clave] = 0;
  }

  (data || []).forEach((row) => {
    if (!row.created_at) return;
    const fecha = new Date(row.created_at);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (acumuladoMeses[clave] !== undefined) {
      acumuladoMeses[clave] += Number(row.distancia_km || 0);
    }
  });

  return Object.entries(acumuladoMeses).map(([clave, kilometros]) => {
    const mes = Number(clave.slice(5, 7)) - 1;
    return {
      mes: mesesNom[mes],
      kilometros,
    };
  });
};

// 2. Obtener comparativa de gastos: Gastos en Ruta vs Mantenimientos
export const obtenerDesgloseGastos = async (perfilId: string, motoId?: string | null): Promise<GastosDesgloseData> => {
  let queryRutas = supabase.from('bitacoras_rodadas').select('gastos_ruta').eq('perfil_id', perfilId);
  let queryMotos = supabase.from('motocicletas').select('id').eq('perfil_id', perfilId);

  if (motoId) {
    queryRutas = queryRutas.eq('motocicleta_id', motoId);
    queryMotos = queryMotos.eq('id', motoId);
  }

  const [resRutas, resMotos] = await Promise.all([queryRutas, queryMotos]);
  if (resRutas.error) throw resRutas.error;
  if (resMotos.error) throw resMotos.error;

  const motocicletaIds = (resMotos.data || []).map((moto) => moto.id);
  const resMant = motocicletaIds.length > 0
    ? await supabase.from('mantenimientos').select('costo').in('motocicleta_id', motocicletaIds)
    : { data: [], error: null };
  if (resMant.error) throw resMant.error;

  const totalRutas = (resRutas.data || []).reduce((acc, row) => acc + Number(row.gastos_ruta || 0), 0);
  const totalMant = (resMant.data || []).reduce((acc, row) => acc + Number(row.costo || 0), 0);

  return {
    rutas: totalRutas,
    mantenimiento: totalMant,
  };
};

// 3. Obtener distribución de tipos de terreno recorridos
export const obtenerTerrenosFrecuentes = async (perfilId: string, motoId?: string | null): Promise<TerrenoDistribucionData[]> => {
  let query = supabase.from('bitacoras_rodadas').select('tipo_terreno').eq('perfil_id', perfilId);

  if (motoId) {
    query = query.eq('motocicleta_id', motoId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const conteo: { [key: string]: number } = {};
  (data || []).forEach((row) => {
    const terreno = row.tipo_terreno?.trim() || 'No especificado';
    conteo[terreno] = (conteo[terreno] || 0) + 1;
  });

  return Object.keys(conteo).map((terreno) => ({
    terreno,
    total: conteo[terreno],
  }));
};