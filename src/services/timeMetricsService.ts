import { supabase } from './supabase'; // Ajusta la ruta a tu cliente

export interface BarDataPoint {
  value: number;
  label: string;
  frontColor: string;
}

export interface MetricasTiempo {
  tiempoHoy: number;
  promedioSemanal: number;
  barData: BarDataPoint[];
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const obtenerFechaLocalISO = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const obtenerMetricasSemanales = async (
  limiteBloqueo: number,
  themePrimary: string,
  themeDanger: string
): Promise<MetricasTiempo> => {
  try {
    // 1. Obtener datos de Supabase de los últimos 7 días
    const { data, error } = await supabase.rpc('obtener_tiempo_ultimos_7_dias');
    
    // Fallback: Si no usas RPC, puedes hacer la consulta directa:
    /*
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    const { data, error } = await supabase
      .from('tiempo_uso')
      .select('fecha, minutos_usados')
      .gte('fecha', hace7Dias.toISOString().split('T')[0]);
    */

    if (error) throw error;

    // Crear un mapa de fecha (YYYY-MM-DD) -> minutos
    const mapaRegistros: { [fecha: string]: number } = {};
    (data || []).forEach((row: { fecha: string; minutos_usados: number }) => {
      const minutos = Number(row.minutos_usados);
      mapaRegistros[row.fecha] = Number.isFinite(minutos) ? Math.max(0, Math.round(minutos)) : 0;
    });

    // 2. Construir el arreglo continuo de los últimos 7 días (de hace 6 días hasta hoy)
    const barData: BarDataPoint[] = [];
    let sumaTotalMinutos = 0;
    let minutosHoy = 0;

    const hoy = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoy.getDate() - i);
      
      // Formato YYYY-MM-DD para comparar con la BD
      const fechaIso = obtenerFechaLocalISO(d);
      const minutos = mapaRegistros[fechaIso] || 0;
      const etiquetaDia = DIAS_SEMANA[d.getDay()];

      sumaTotalMinutos += minutos;

      if (i === 0) {
        minutosHoy = minutos;
      }

      // 3. Formateo para react-native-gifted-charts
      const superoLimite = limiteBloqueo > 0 && minutos >= limiteBloqueo;
      barData.push({
        value: minutos,
        label: etiquetaDia,
        frontColor: superoLimite ? themeDanger : themePrimary,
      });
    }

    // 4. Cálculo del promedio semanal
    const promedioSemanal = Math.round(sumaTotalMinutos / 7);

    return {
      tiempoHoy: minutosHoy,
      promedioSemanal,
      barData,
    };
  } catch (error) {
    console.error('Error calculando métricas de tiempo:', error);
    throw error;
  }
};