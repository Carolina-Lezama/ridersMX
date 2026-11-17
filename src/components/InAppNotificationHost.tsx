import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext';
import { supabase } from '../services/supabase';
import { navigate } from '../utils/helper/navigationRef';

type FloatingNotificationKind = 'comentario' | 'reaccion' | 'app';

interface FloatingNotificationData {
  id: string;
  kind: FloatingNotificationKind;
  title: string;
  message: string;
  created_at: string;
  eventId?: string;
}

interface Props {
  children: React.ReactNode;
}

export default function InAppNotificationHost({ children }: Props) {
  const { theme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<FloatingNotificationData[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setNotifications([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`in-app-foro-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'foro_notificaciones',
        filter: `destinatario_id=eq.${userId}`,
      }, (payload) => {
        const notification = payload.new as {
          id?: unknown;
          tipo?: unknown;
          mensaje?: unknown;
          created_at?: unknown;
        };
        if (
          typeof notification.id !== 'string'
          || (notification.tipo !== 'comentario' && notification.tipo !== 'reaccion')
          || typeof notification.mensaje !== 'string'
          || typeof notification.created_at !== 'string'
        ) {
          console.error('Se recibió una notificación del foro con formato no válido.');
          return;
        }

        const item: FloatingNotificationData = {
          id: notification.id,
          kind: notification.tipo,
          title: notification.tipo === 'comentario' ? 'Nuevo comentario' : 'Nueva reacción',
          message: notification.mensaje,
          created_at: notification.created_at,
        };
        setNotifications((current) => [...current, item].slice(-2));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`No se pudo mantener la conexión de notificaciones del foro: ${status}`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      if (!body?.trim()) return;

      const eventId = data?.eventId;
      const item: FloatingNotificationData = {
        id: `${notification.request.identifier}-${Date.now()}`,
        kind: 'app',
        title: title?.trim() || 'Aviso de RidersMX',
        message: body,
        created_at: new Date().toISOString(),
        ...(typeof eventId === 'string' ? { eventId } : {}),
      };
      setNotifications((current) => [...current, item].slice(-2));
    });

    return () => subscription.remove();
  }, []);

  const descartarNotificacion = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);
  const abrirNotificacion = useCallback((notification: FloatingNotificationData) => {
    if (notification.kind === 'comentario' || notification.kind === 'reaccion') {
      navigate('Foro');
    } else if (notification.eventId) {
      navigate('EventoForm', { eventoId: notification.eventId });
    } else {
      navigate('Notificaciones');
    }
  }, []);

  return (
    <View style={styles.root}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.toastStack,
          { top: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 56 : 42 },
        ]}
      >
        {notifications.map((notification) => (
          <FloatingNotification
            key={notification.id}
            notification={notification}
            onDismiss={descartarNotificacion}
            onPress={() => abrirNotificacion(notification)}
          />
        ))}
      </View>
    </View>
  );
}

function FloatingNotification({
  notification,
  onDismiss,
  onPress,
}: {
  notification: FloatingNotificationData;
  onDismiss: (id: string) => void;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);
  const esComentario = notification.kind === 'comentario';
  const esReaccion = notification.kind === 'reaccion';
  const momento = new Date(notification.created_at);
  const hora = Number.isNaN(momento.getTime())
    ? ''
    : momento.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const cerrar = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: -18,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss(notification.id);
    });
  }, [notification.id, onDismiss, opacity, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const timeout = setTimeout(cerrar, 5500);
    return () => clearTimeout(timeout);
  }, [cerrar, opacity, translateY]);

  const styles = createToastStyles(theme);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${notification.title}. ${esComentario || esReaccion ? 'Abrir el foro.' : 'Abrir notificaciones.'}`}
        activeOpacity={0.85}
        onPress={() => {
          onPress();
          cerrar();
        }}
        style={styles.toastContent}
      >
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: esComentario ? theme.infoBg : theme.accentBg },
          ]}
        >
          <Ionicons
            name={esComentario ? 'chatbubble-ellipses' : esReaccion ? 'heart' : 'notifications'}
            size={20}
            color={esComentario ? theme.infoText : esReaccion ? theme.accent : theme.primary}
          />
        </View>
        <View style={styles.messageContent}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>{notification.title}</Text>
            {!!hora && <Text style={styles.time}>{hora}</Text>}
          </View>
          <Text numberOfLines={2} style={styles.message}>{notification.message}</Text>
          <Text style={styles.action}>
            {esComentario || esReaccion ? 'Abrir el foro' : notification.eventId ? 'Ver evento' : 'Ver notificaciones'}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cerrar notificación"
        hitSlop={10}
        onPress={cerrar}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toastStack: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
  },
});

const createToastStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    padding: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  toastContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageContent: { flex: 1, paddingRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  time: { color: theme.textSecondary, fontSize: 11, marginLeft: 8 },
  message: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  action: { color: theme.primary, fontSize: 11, fontWeight: '700', marginTop: 5 },
  closeButton: { padding: 4, alignSelf: 'flex-start' },
});
