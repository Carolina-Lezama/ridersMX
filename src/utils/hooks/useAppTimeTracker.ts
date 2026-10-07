import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { navigate } from '../helper/navigationRef';
import { obtenerConfigNotificaciones } from '../../services/notificationConfigService';
import { obtenerLimites } from '../../services/limitsService';
import { notificarLimiteTiempoUso } from '../../services/notificationService';

const FECHA_MS = 60_000;
const MINUTOS_MINIMOS_A_GUARDAR = 0.08;

const obtenerFechaLocalISO = (fecha: Date = new Date()) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const claveTiempoPendiente = (userId: string) => `@tiempo_uso_pendiente_${userId}`;

export const useAppTimeTracker = () => {
  const [minutosActuales, setMinutosActuales] = useState(0);
  const [mostrarModalAviso, setMostrarModalAviso] = useState(false);
  const [minutosAvisoActual, setMinutosAvisoActual] = useState(0);

  const appState = useRef(AppState.currentState);
  const inicioSegmentoActivo = useRef(Date.now());
  const evaluandoReglas = useRef(false);
  const guardandoTiempo = useRef(false);
  const estadoDelDia = useRef({
    userId: '',
    fecha: obtenerFechaLocalISO(),
    persistido: false,
    avisoMostrado: false,
    notificacionEvaluada: false,
    limiteIgnorado: false,
    bloqueoAbierto: false,
  });

  const guardarTiempoAcumulado = useCallback(async () => {
    if (guardandoTiempo.current) return;
    guardandoTiempo.current = true;

    const ahora = Date.now();
    const inicio = inicioSegmentoActivo.current;
    inicioSegmentoActivo.current = ahora;
    const minutos = (ahora - inicio) / FECHA_MS;

    try {
      if (minutos <= MINUTOS_MINIMOS_A_GUARDAR) return;

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return;

      const { error } = await supabase.rpc('registrar_tiempo_uso', {
        p_minutos: minutos,
      });
      if (error) throw error;
    } catch (error) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.error('No se pudo guardar el tiempo: no hay una sesión de usuario.', error);
          return;
        }

        const key = claveTiempoPendiente(session.user.id);
        const guardadoPrevio = await AsyncStorage.getItem(key);
        const minutosPrevios = guardadoPrevio ? Number(guardadoPrevio) : 0;
        await AsyncStorage.setItem(key, String(minutosPrevios + minutos));
      } catch (storageError) {
        console.error('No se pudo respaldar localmente el tiempo de uso:', storageError);
      }
    } finally {
      guardandoTiempo.current = false;
    }
  }, []);

  const evaluarReglasDeNegocio = useCallback(async () => {
    if (evaluandoReglas.current || appState.current !== 'active') return;
    evaluandoReglas.current = true;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return;

      const userId = session.user.id;
      const hoy = obtenerFechaLocalISO();
      if (estadoDelDia.current.fecha !== hoy || estadoDelDia.current.userId !== userId) {
        estadoDelDia.current = {
          userId,
          fecha: hoy,
          persistido: false,
          avisoMostrado: false,
          notificacionEvaluada: false,
          limiteIgnorado: false,
          bloqueoAbierto: false,
        };
      }

      if (!estadoDelDia.current.persistido) {
        const flags = await AsyncStorage.multiGet([
          `@aviso_tiempo_mostrado_${userId}_${hoy}`,
          `@notificacion_tiempo_evaluada_${userId}_${hoy}`,
          `@limite_uso_ignorado_${userId}_${hoy}`,
        ]);
        estadoDelDia.current.avisoMostrado = flags[0][1] === 'true';
        estadoDelDia.current.notificacionEvaluada = flags[1][1] === 'true';
        estadoDelDia.current.limiteIgnorado = flags[2][1] === 'true';
        estadoDelDia.current.persistido = true;
      }

      const [limites, config] = await Promise.all([
        obtenerLimites(userId),
        obtenerConfigNotificaciones(userId),
      ]);
      if (!limites) return;

      let minutosPendientes = 0;
      const pendingKey = claveTiempoPendiente(userId);
      const pendingValue = await AsyncStorage.getItem(pendingKey);
      if (pendingValue) {
        const value = Number(pendingValue);
        if (Number.isFinite(value) && value > 0) {
          const { error } = await supabase.rpc('registrar_tiempo_uso', {
            p_minutos: value,
          });
          if (error) {
            minutosPendientes = value;
          } else {
            await AsyncStorage.removeItem(pendingKey);
          }
        } else {
          await AsyncStorage.removeItem(pendingKey);
        }
      }

      const { data, error } = await supabase
        .from('tiempo_uso')
        .select('minutos_usados')
        .eq('fecha', hoy)
        .maybeSingle();
      if (error) throw error;

      const minutosSesion = Math.max(0, (Date.now() - inicioSegmentoActivo.current) / FECHA_MS);
      const minutosTotales =
        Number(data?.minutos_usados ?? 0) +
        minutosPendientes +
        minutosSesion;
      setMinutosActuales(minutosTotales);

      if (
        config.limiteEnabled &&
        limites.limite_notificacion > 0 &&
        minutosTotales >= limites.limite_notificacion &&
        !estadoDelDia.current.avisoMostrado
      ) {
        estadoDelDia.current.avisoMostrado = true;
        void AsyncStorage.setItem(`@aviso_tiempo_mostrado_${userId}_${hoy}`, 'true')
          .catch((error) => console.error('No se pudo guardar el estado del aviso de tiempo:', error));
        setMinutosAvisoActual(limites.limite_notificacion);
        setMostrarModalAviso(true);
      }

      if (
        config.limiteEnabled &&
        limites.limite_notificacion > 0 &&
        minutosTotales >= limites.limite_notificacion &&
        !estadoDelDia.current.notificacionEvaluada
      ) {
        estadoDelDia.current.notificacionEvaluada = true;
        void AsyncStorage.setItem(`@notificacion_tiempo_evaluada_${userId}_${hoy}`, 'true')
          .catch((error) => console.error('No se pudo guardar el estado de la alerta de tiempo:', error));
        try {
          const enviada = await notificarLimiteTiempoUso(limites.limite_notificacion);
          if (!enviada) {
            console.warn('No se envió la alerta: los permisos de notificación no están concedidos.');
          }
        } catch (error) {
          console.error('No se pudo enviar la notificación de límite de uso:', error);
        }
      }

      if (
        limites.limite_bloqueo > 0 &&
        minutosTotales >= limites.limite_bloqueo &&
        !estadoDelDia.current.limiteIgnorado &&
        !estadoDelDia.current.bloqueoAbierto
      ) {
        estadoDelDia.current.bloqueoAbierto = true;
        navigate('LimiteAlcanzado', {
          onIgnorar: () => {
            estadoDelDia.current.limiteIgnorado = true;
            estadoDelDia.current.bloqueoAbierto = false;
            void AsyncStorage.setItem(`@limite_uso_ignorado_${userId}_${hoy}`, 'true')
              .catch((error) => console.error('No se pudo guardar la excepción del límite:', error));
          },
        });
      }
    } catch (error) {
      console.error('Error evaluando reglas del vigilante de tiempo:', error);
    } finally {
      evaluandoReglas.current = false;
    }
  }, []);

  useEffect(() => {
    const timerVigilante = setInterval(() => {
      void evaluarReglasDeNegocio();
    }, FECHA_MS);
    void evaluarReglasDeNegocio();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const estabaEnSegundoPlano = appState.current.match(/inactive|background/);
      if (estabaEnSegundoPlano && nextAppState === 'active') {
        inicioSegmentoActivo.current = Date.now();
        void evaluarReglasDeNegocio();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        void guardarTiempoAcumulado();
      }
      appState.current = nextAppState;
    });

    if (Platform.OS === 'web') {
      const handleBeforeUnload = () => {
        void guardarTiempoAcumulado();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        clearInterval(timerVigilante);
        subscription.remove();
        window.removeEventListener('beforeunload', handleBeforeUnload);
        void guardarTiempoAcumulado();
      };
    }

    return () => {
      clearInterval(timerVigilante);
      subscription.remove();
      void guardarTiempoAcumulado();
    };
  }, [evaluarReglasDeNegocio, guardarTiempoAcumulado]);

  return {
    minutosActuales,
    mostrarModalAviso,
    minutosAvisoActual,
    cerrarModalAviso: () => setMostrarModalAviso(false),
  };
};
