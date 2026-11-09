import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Modal,
  Image as RNImage,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';

export default function ForoScreen({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  const styles = createStyles(theme);

  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Record<string, any[]>>({});
  const [comentarioNuevo, setComentarioNuevo] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<Record<string, boolean>>({});
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [proporcionesImagen, setProporcionesImagen] = useState<Record<string, number>>({});
  const [edicion, setEdicion] = useState<{
    tipo: 'publicacion' | 'comentario'; id: string; titulo: string; contenido: string;
    sufijo?: string; categoria?: string; moto?: string; punto?: string; fecha?: string; hora?: string; cupo?: string; imagenUrl?: string | null;
  } | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [asistencias, setAsistencias] = useState<Record<string, { count: number; confirmada: boolean }>>({});
  const [busqueda, setBusqueda] = useState('');
  const [usuariosSugeridos, setUsuariosSugeridos] = useState<any[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any | null>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [modalNotificaciones, setModalNotificaciones] = useState(false);
  const categorias = ['Todas', 'Rutas', 'Mecánica', 'Compra/Venta', 'Off-Topic'];
  const publicacionesFiltradas = (categoriaActiva === 'Todas'
    ? publicaciones
    : publicaciones.filter((post) => (post.categoria || 'General') === categoriaActiva))
    .filter((post) => !usuarioSeleccionado || post.perfil_id === usuarioSeleccionado.id)
    .filter((post) => !busqueda.trim() || `${post.titulo || ''} ${post.contenido || ''}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));

  const separarContenido = (contenido: string) => {
    const marcador = contenido.lastIndexOf('\n\n📍 ');
    if (marcador < 0) return { descripcion: contenido, detalles: [] as { etiqueta: string; valor: string }[] };

    const descripcion = contenido.slice(0, marcador).trim();
    const extras = contenido.slice(marcador + '\n\n📍 '.length);
    const detalles = extras.split('|').map((parte) => {
      const separador = parte.indexOf(':');
      if (separador < 0) return null;
      const etiqueta = parte.slice(0, separador).trim();
      const valor = parte.slice(separador + 1).trim();
      if (!valor || !['Moto', 'Punto', 'Fecha', 'Hora', 'Cupo'].includes(etiqueta)) return null;
      const etiquetas: Record<string, string> = { Moto: 'Moto', Punto: 'Punto de encuentro', Fecha: 'Fecha de rodada', Hora: 'Hora de salida', Cupo: 'Cupo máximo' };
      return { etiqueta: etiquetas[etiqueta], valor };
    }).filter((detalle): detalle is { etiqueta: string; valor: string } => detalle !== null);

    return { descripcion: descripcion || contenido, detalles };
  };

  const obtenerPublicaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('foro_publicaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicaciones(data || []);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      setUsuarioId(userId);
      const ids = (data || []).map((post: any) => post.id);
      if (!ids.length) { setComentarios({}); return; }
      const creatorIds = [...new Set((data || []).map((post: any) => post.perfil_id).filter(Boolean))];
      let creatorNames: Record<string, string> = {};
      if (creatorIds.length) {
        const { data: profiles, error: profileError } = await supabase
          .from('perfiles')
          .select('id, username, nombre_completo')
          .in('id', creatorIds);
        if (profileError) {
          console.warn('No se pudieron cargar los autores de las publicaciones:', profileError.message);
        } else {
          creatorNames = Object.fromEntries((profiles || []).map((profile: any) => [
            profile.id,
            profile.username || profile.nombre_completo || 'Usuario',
          ]));
        }
      }

      const { data: likes, error: likesError } = await supabase
        .from('foro_likes')
        .select('publicacion_id, perfil_id')
        .in('publicacion_id', ids);
      if (likesError) throw likesError;
      const likesByPost = new Map<string, { count: number; liked: boolean }>();
      (likes || []).forEach((like: any) => {
        const entry = likesByPost.get(like.publicacion_id) || { count: 0, liked: false };
        entry.count += 1;
        if (userId && like.perfil_id === userId) entry.liked = true;
        likesByPost.set(like.publicacion_id, entry);
      });
      setPublicaciones((data || []).map((post: any) => ({
        ...post,
        autor: creatorNames[post.perfil_id] || 'Usuario',
        esMio: post.perfil_id === userId,
        like_count: likesByPost.get(post.id)?.count || 0,
        liked_by_me: likesByPost.get(post.id)?.liked || false,
      })));

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('foro_asistencias').select('publicacion_id, perfil_id').in('publicacion_id', ids);
      if (attendanceError && attendanceError.code !== 'PGRST205') throw attendanceError;
      const attendanceByPost: Record<string, { count: number; confirmada: boolean }> = {};
      (attendanceData || []).forEach((row: any) => {
        const entry = attendanceByPost[row.publicacion_id] || { count: 0, confirmada: false };
        entry.count += 1;
        if (row.perfil_id === userId) entry.confirmada = true;
        attendanceByPost[row.publicacion_id] = entry;
      });
      setAsistencias(attendanceByPost);

      // Los comentarios son opcionales mientras la tabla no exista en Supabase.
      let comments: any[] = [];
      const { data: commentsData, error: commentsError } = await supabase
        .from('foro_comentarios')
        .select('id, publicacion_id, perfil_id, contenido, created_at')
        .in('publicacion_id', ids)
        .order('created_at');
      if (commentsError) {
        if (commentsError.code !== 'PGRST205') throw commentsError;
        console.info('La tabla foro_comentarios aún no existe; se omite la carga de comentarios.');
      } else {
        comments = commentsData || [];
      }
      const commenterIds = [...new Set(comments.map((comment: any) => comment.perfil_id).filter(Boolean))];
      let usernamesById: Record<string, string> = {};
      if (commenterIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('perfiles')
          .select('id, username, nombre_completo')
          .in('id', commenterIds);
        if (profilesError) throw profilesError;
        usernamesById = Object.fromEntries((profiles || []).map((profile: any) => [
          profile.id,
          profile.username || profile.nombre_completo || 'Usuario',
        ]));
      }
      const byPost: Record<string, any[]> = {};
      comments.forEach((comment: any) => {
        (byPost[comment.publicacion_id] ||= []).push({
          ...comment,
          autor: usernamesById[comment.perfil_id] || 'Usuario',
          esMio: comment.perfil_id === userId,
        });
      });
      setComentarios(byPost);
    } catch (error) {
      console.error('Error al cargar publicaciones:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const avisar = (titulo: string, mensaje: string) => Platform.OS === 'web'
    ? window.alert(`${titulo}: ${mensaje}`) : Alert.alert(titulo, mensaje);

  const confirmar = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
    return new Promise<boolean>((resolve) => Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Borrar', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
  };

  const editarPublicacion = (post: any) => {
    const marcador = post.contenido.lastIndexOf('\n\n📍 ');
    const detalles = separarContenido(post.contenido || '').detalles;
    setEdicion({
      tipo: 'publicacion',
      id: post.id,
      titulo: post.titulo || '',
      contenido: marcador < 0 ? post.contenido : post.contenido.slice(0, marcador),
      categoria: post.categoria || 'Rutas',
      moto: detalles.find((detalle) => detalle.etiqueta === 'Moto')?.valor || '',
      punto: detalles.find((detalle) => detalle.etiqueta === 'Punto de encuentro')?.valor || '',
      fecha: detalles.find((detalle) => detalle.etiqueta === 'Fecha de rodada')?.valor || '',
      hora: detalles.find((detalle) => detalle.etiqueta === 'Hora de salida')?.valor || '',
      cupo: detalles.find((detalle) => detalle.etiqueta === 'Cupo máximo')?.valor || '',
      imagenUrl: post.imagen_url || null,
    });
  };

  const elegirImagenEdicion = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { avisar('Permiso requerido', 'Permite acceder a la galería para elegir una foto.'); return; }
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!resultado.canceled && edicion) setEdicion({ ...edicion, imagenUrl: resultado.assets[0].uri });
  };

  const editarComentario = (comment: any) => setEdicion({
    tipo: 'comentario', id: comment.id, titulo: '', contenido: comment.contenido || '',
  });

  const guardarEdicion = async () => {
    if (!edicion || !usuarioId) return;
    if (!edicion.contenido.trim() || (edicion.tipo === 'publicacion' && !edicion.titulo.trim())) {
      avisar('Faltan datos', 'Completa el título y el contenido antes de guardar.');
      return;
    }
    setGuardandoEdicion(true);
    try {
      let result;
      if (edicion.tipo === 'publicacion') {
        const extras = [
          edicion.moto?.trim() ? `Moto: ${edicion.moto.trim()}` : '',
          edicion.punto?.trim() ? `Punto: ${edicion.punto.trim()}` : '',
          edicion.fecha?.trim() ? `Fecha: ${edicion.fecha.trim()}` : '',
          edicion.hora?.trim() ? `Hora: ${edicion.hora.trim()}` : '',
          edicion.cupo?.trim() ? `Cupo: ${edicion.cupo.trim()}` : '',
        ].filter(Boolean);
        let imagenUrl = edicion.imagenUrl || null;
        if (imagenUrl && !/^https?:\/\//i.test(imagenUrl)) {
          const response = await fetch(imagenUrl);
          const archivo = await response.arrayBuffer();
          const ext = imagenUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
          const ruta = `${usuarioId}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('foro-imagenes').upload(ruta, archivo, {
            contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false,
          });
          if (uploadError) throw uploadError;
          imagenUrl = supabase.storage.from('foro-imagenes').getPublicUrl(ruta).data.publicUrl;
        }
        result = await supabase.from('foro_publicaciones').update({
          titulo: edicion.titulo.trim(),
          contenido: `${edicion.contenido.trim()}${extras.length ? `\n\n📍 ${extras.join(' | ')}` : ''}`,
          categoria: edicion.categoria,
          imagen_url: imagenUrl,
        }).eq('id', edicion.id).eq('perfil_id', usuarioId);
      } else {
        result = await supabase.from('foro_comentarios').update({ contenido: edicion.contenido.trim() })
          .eq('id', edicion.id).eq('perfil_id', usuarioId);
      }
      if (result.error) throw result.error;
      setEdicion(null);
      await obtenerPublicaciones();
    } catch (error: any) {
      avisar('No se pudo guardar', error.message || 'Intenta de nuevo.');
    } finally { setGuardandoEdicion(false); }
  };

  const borrarContenido = async (tipo: 'publicacion' | 'comentario', id: string) => {
    if (!usuarioId) return;
    const ok = await confirmar('Borrar contenido', tipo === 'publicacion'
      ? '¿Quieres borrar esta publicación? También se eliminarán sus comentarios.'
      : '¿Quieres borrar este comentario?');
    if (!ok) return;
    try {
      const table = tipo === 'publicacion' ? 'foro_publicaciones' : 'foro_comentarios';
      const { error } = await supabase.from(table).delete().eq('id', id).eq('perfil_id', usuarioId);
      if (error) throw error;
      await obtenerPublicaciones();
    } catch (error: any) {
      avisar('No se pudo borrar', error.message || 'Intenta de nuevo.');
    }
  };

  const reaccionar = async (post: any) => {
    if (!usuarioId) { avisar('Inicia sesión', 'Debes iniciar sesión para reaccionar.'); return; }
    if (procesando[post.id]) return;
    setProcesando((prev) => ({ ...prev, [post.id]: true }));
    try {
      if (post.liked_by_me) {
        const { error } = await supabase.from('foro_likes').delete()
          .eq('publicacion_id', post.id).eq('perfil_id', usuarioId);
        if (error) throw error;
      } else {
        // El usuario puede tener ya un like aunque el estado local esté desactualizado.
        // Ignorar la duplicación evita el error de la restricción única.
        const { error } = await supabase.from('foro_likes').upsert(
          { publicacion_id: post.id, perfil_id: usuarioId },
          { onConflict: 'publicacion_id,perfil_id', ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      await obtenerPublicaciones();
    } catch (error: any) {
      avisar('No se pudo guardar la reacción', error.message || 'Intenta de nuevo.');
    } finally { setProcesando((prev) => ({ ...prev, [post.id]: false })); }
  };

  const cambiarAsistencia = async (post: any) => {
    if (!usuarioId) { avisar('Inicia sesión', 'Debes iniciar sesión para confirmar asistencia.'); return; }
    if (procesando[`attendance-${post.id}`]) return;
    setProcesando((prev) => ({ ...prev, [`attendance-${post.id}`]: true }));
    try {
      if (asistencias[post.id]?.confirmada) {
        const { error } = await supabase.from('foro_asistencias').delete()
          .eq('publicacion_id', post.id).eq('perfil_id', usuarioId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('foro_asistencias').insert({ publicacion_id: post.id, perfil_id: usuarioId });
        if (error) throw error;
      }
      await obtenerPublicaciones();
    } catch (error: any) {
      avisar('No se pudo actualizar la asistencia', error.message || 'Puede que el cupo esté completo.');
    } finally { setProcesando((prev) => ({ ...prev, [`attendance-${post.id}`]: false })); }
  };

  const comentar = async (postId: string) => {
    const contenido = (comentarioNuevo[postId] || '').trim();
    if (!contenido) return;
    if (!usuarioId) { avisar('Inicia sesión', 'Debes iniciar sesión para comentar.'); return; }
    setProcesando((prev) => ({ ...prev, [`comment-${postId}`]: true }));
    try {
      const { error } = await supabase.from('foro_comentarios').insert({
        publicacion_id: postId, perfil_id: usuarioId, contenido,
      });
      if (error) throw error;
      setComentarioNuevo((prev) => ({ ...prev, [postId]: '' }));
      await obtenerPublicaciones();
    } catch (error: any) {
      avisar('No se pudo publicar el comentario', error.message || 'Revisa que la migración esté aplicada.');
    } finally { setProcesando((prev) => ({ ...prev, [`comment-${postId}`]: false })); }
  };

  useEffect(() => {
    obtenerPublicaciones();
  }, []);

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) { setUsuariosSugeridos([]); return; }
    let cancelado = false;
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.from('perfiles')
        .select('id, username, nombre_completo, avatar_url')
        .ilike('username', `%${termino}%`)
        .limit(6);
      if (cancelado) return;
      if (error) {
        console.warn('No se pudieron buscar usuarios del foro:', error.message);
        setUsuariosSugeridos([]);
        return;
      }
      setUsuariosSugeridos((data || []).filter((profile: any) => profile.id !== usuarioId));
    }, 250);
    return () => { cancelado = true; clearTimeout(timeout); };
  }, [busqueda, usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    const cargarNotificaciones = async () => {
      const { data, error } = await supabase.from('foro_notificaciones').select('*')
        .eq('destinatario_id', usuarioId).order('created_at', { ascending: false }).limit(30);
      if (error) {
        if (error.code !== 'PGRST205') console.warn('No se pudieron cargar notificaciones del foro:', error.message);
        return;
      }
      setNotificaciones(data || []);
    };
    cargarNotificaciones();
    const channel = supabase.channel(`foro-notificaciones-${usuarioId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'foro_notificaciones',
        filter: `destinatario_id=eq.${usuarioId}`,
      }, (payload) => setNotificaciones((prev) => [payload.new, ...prev].slice(0, 30)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuarioId]);

  const marcarNotificacionLeida = async (notificacion: any) => {
    if (notificacion.leida) return;
    const { error } = await supabase.from('foro_notificaciones').update({ leida: true })
      .eq('id', notificacion.id).eq('destinatario_id', usuarioId);
    if (!error) setNotificaciones((prev) => prev.map((item) => item.id === notificacion.id ? { ...item, leida: true } : item));
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* ENCABEZADO CON ESPACIADOR EN LUGAR DEL BOTÓN SUPERIOR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Foro de Riders</Text>
        <TouchableOpacity style={styles.notificationButton} onPress={() => setModalNotificaciones(true)} accessibilityLabel="Notificaciones del foro">
          <Ionicons name="notifications-outline" size={22} color={theme.iconPrimary} />
          {notificaciones.some((item) => !item.leida) && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      </View>

      {/* FEED DE PUBLICACIONES */}
      {cargando ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={publicacionesFiltradas}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => {
                setRefrescando(true);
                obtenerPublicaciones();
              }}
              colors={[theme.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={(
            <View>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={19} color={theme.textSecondary} />
                <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar publicaciones o usuarios..."
                  placeholderTextColor={theme.textSecondary} style={styles.searchInput} returnKeyType="search" />
                {!!busqueda && <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={19} color={theme.textSecondary} /></TouchableOpacity>}
              </View>
              {usuariosSugeridos.length > 0 && !usuarioSeleccionado && (
                <View style={styles.userSuggestions}>
                  <Text style={styles.suggestionsTitle}>Personas</Text>
                  {usuariosSugeridos.map((profile) => (
                    <TouchableOpacity key={profile.id} style={styles.userSuggestion}
                      onPress={() => { setUsuarioSeleccionado(profile); setBusqueda(''); setUsuariosSugeridos([]); }}>
                      <Ionicons name="person-circle-outline" size={24} color={theme.primary} />
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionUsername}>@{profile.username}</Text>
                        {!!profile.nombre_completo && <Text style={styles.suggestionName}>{profile.nombre_completo}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!!usuarioSeleccionado && (
                <TouchableOpacity style={styles.selectedUserFilter} onPress={() => setUsuarioSeleccionado(null)}>
                  <Ionicons name="person-circle" size={18} color={theme.primary} />
                  <Text style={styles.selectedUserText}>Publicaciones de @{usuarioSeleccionado.username}</Text>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={styles.filtersSection}>
                <Text style={styles.filtersTitle}>Explorar por categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categorias.map((categoria) => {
                  const activa = categoriaActiva === categoria;
                  return (
                    <TouchableOpacity
                      key={categoria}
                      style={[styles.filterChip, activa && styles.filterChipActive]}
                      onPress={() => setCategoriaActiva(categoria)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activa }}
                    >
                      <Text style={[styles.filterChipText, activa && styles.filterChipTextActive]}>
                        {categoria}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                </ScrollView>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {(() => {
                const contenido = separarContenido(item.contenido || '');
                return <>
              <View style={styles.cardHeader}>
                <Text style={styles.categoriaBadge}>{item.categoria || 'General'}</Text>
                <Text style={styles.fechaText}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
              <View style={styles.postAuthorRow}>
                <Ionicons name="person-circle-outline" size={17} color={theme.textSecondary} />
                <Text style={styles.postAuthor}>{item.autor}</Text>
                {item.esMio && <Text style={styles.ownCommentBadge}>Tú</Text>}
                {item.esMio && <View style={styles.ownerActions}>
                  <TouchableOpacity onPress={() => editarPublicacion(item)} accessibilityLabel="Editar publicación">
                    <Ionicons name="create-outline" size={19} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => borrarContenido('publicacion', item.id)} accessibilityLabel="Borrar publicación">
                    <Ionicons name="trash-outline" size={19} color="#e5484d" />
                  </TouchableOpacity>
                </View>}
              </View>
              <Text style={styles.tituloText}>{item.titulo}</Text>
              {!!contenido.descripcion && <Text style={styles.contenidoText}>{contenido.descripcion}</Text>}
              {contenido.detalles.length > 0 && (
                <View style={styles.detailsBox}>
                  {contenido.detalles.map((detalle, index) => (
                    <View key={`${detalle.etiqueta}-${index}`} style={styles.detailRow}>
                      <Ionicons
                        name={detalle.etiqueta === 'Moto' ? 'bicycle-outline' : 'location-outline'}
                        size={16}
                        color={theme.primary}
                      />
                      <Text style={styles.detailLabel}>{detalle.etiqueta}</Text>
                      <Text style={styles.detailValue}>{detalle.valor}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!item.imagen_url && (
                <Image
                  source={{ uri: item.imagen_url }}
                  style={[styles.publicationImage, { aspectRatio: proporcionesImagen[item.id] || 4 / 3 }]}
                  resizeMode="contain"
                  onLoad={(event) => {
                    const nativeSource = event?.nativeEvent?.source;
                    const webTarget = (event as any)?.target;
                    const width = nativeSource?.width ?? webTarget?.naturalWidth;
                    const height = nativeSource?.height ?? webTarget?.naturalHeight;
                    if (width > 0 && height > 0) {
                      const ratio = width / height;
                      setProporcionesImagen((prev) => prev[item.id] === ratio ? prev : { ...prev, [item.id]: ratio });
                    }
                  }}
                  accessibilityLabel={`Imagen de la publicación ${item.titulo || ''}`}
                />
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => reaccionar(item)} disabled={!!procesando[item.id]}>
                  <Ionicons name={item.liked_by_me ? 'heart' : 'heart-outline'} size={21} color={item.liked_by_me ? '#e5484d' : theme.textSecondary} />
                  <Text style={styles.actionText}>{item.like_count || 0} Me gusta</Text>
                </TouchableOpacity>
                <Text style={styles.actionText}>{(comentarios[item.id] || []).length} comentarios</Text>
              </View>
              {(() => {
                const capacidad = Number(contenido.detalles.find((detalle) => detalle.etiqueta === 'Cupo máximo')?.valor) || null;
                if (item.categoria !== 'Rutas' && !capacidad) return null;
                return <View style={styles.attendanceRow}>
                  <View style={styles.attendanceSummary}>
                    <Ionicons name="people-outline" size={18} color={theme.primary} />
                    <Text style={styles.attendanceText}>
                      {asistencias[item.id]?.count || 0} confirmados{capacidad ? ` de ${capacidad}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.attendanceButton, asistencias[item.id]?.confirmada && styles.attendanceButtonActive]}
                    onPress={() => cambiarAsistencia(item)}
                    disabled={!!procesando[`attendance-${item.id}`] || (!!capacidad && (asistencias[item.id]?.count || 0) >= capacidad && !asistencias[item.id]?.confirmada)}
                  >
                    {procesando[`attendance-${item.id}`]
                      ? <ActivityIndicator size="small" color={theme.primary} />
                      : <Text style={styles.attendanceButtonText}>{asistencias[item.id]?.confirmada ? 'Cancelar asistencia' : 'Confirmar asistencia'}</Text>}
                  </TouchableOpacity>
                </View>;
              })()}
              {(comentarios[item.id] || []).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAuthorRow}>
                    <Text style={styles.commentAuthor}>{comment.autor}</Text>
                    {comment.esMio && <Text style={styles.ownCommentBadge}>Tú</Text>}
                    <Text style={styles.commentDate}>
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleString('es-MX', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.commentBodyRow}>
                    <Text style={styles.commentText}>{comment.contenido}</Text>
                    {comment.esMio && <View style={styles.ownerActions}>
                      <TouchableOpacity onPress={() => editarComentario(comment)} accessibilityLabel="Editar comentario">
                        <Ionicons name="create-outline" size={17} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => borrarContenido('comentario', comment.id)} accessibilityLabel="Borrar comentario">
                        <Ionicons name="trash-outline" size={17} color="#e5484d" />
                      </TouchableOpacity>
                    </View>}
                  </View>
                </View>
              ))}
              <View style={styles.commentComposer}>
                <TextInput
                  value={comentarioNuevo[item.id] || ''}
                  onChangeText={(value) => setComentarioNuevo((prev) => ({ ...prev, [item.id]: value }))}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={theme.textSecondary}
                  style={styles.commentInput}
                  multiline
                />
                <TouchableOpacity onPress={() => comentar(item.id)} disabled={!!procesando[`comment-${item.id}`]}>
                  {procesando[`comment-${item.id}`] ? <ActivityIndicator color={theme.primary} /> : <Ionicons name="send" size={20} color={theme.primary} />}
                </TouchableOpacity>
              </View>
                </>;
              })()}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>No hay publicaciones aún.</Text>
              <Text style={styles.emptySubtext}>Sé el primero en crear una rodada o duda.</Text>
            </View>
          }
        />
      )}

      {/* ÚNICO BOTÓN FLOTANTE (FAB) PARA CREAR */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ForoCrearPublicacion')}
      >
        <Ionicons name="create-outline" size={26} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={!!edicion} transparent animationType="fade" onRequestClose={() => setEdicion(null)}>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>{edicion?.tipo === 'publicacion' ? 'Editar publicación' : 'Editar comentario'}</Text>
            {edicion?.tipo === 'publicacion' && (
              <>
                <TextInput
                  value={edicion.titulo}
                  onChangeText={(titulo) => setEdicion((prev) => prev ? { ...prev, titulo } : prev)}
                  placeholder="Título"
                  placeholderTextColor={theme.textSecondary}
                  style={styles.editInput}
                />
                <Text style={styles.editSectionLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editCategories}>
                  {categorias.filter((category) => category !== 'Todas').map((category) => (
                    <TouchableOpacity key={category}
                      style={[styles.editCategoryChip, edicion.categoria === category && styles.editCategoryChipActive]}
                      onPress={() => setEdicion((prev) => prev ? { ...prev, categoria: category } : prev)}>
                      <Text style={[styles.editCategoryText, edicion.categoria === category && styles.editCategoryTextActive]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TextInput
              value={edicion?.contenido || ''}
              onChangeText={(contenido) => setEdicion((prev) => prev ? { ...prev, contenido } : prev)}
              placeholder={edicion?.tipo === 'publicacion' ? 'Descripción' : 'Comentario'}
              placeholderTextColor={theme.textSecondary}
              style={[styles.editInput, styles.editMultiline]}
              multiline
              textAlignVertical="top"
            />
            {edicion?.tipo === 'publicacion' && (
              <>
                <Text style={styles.editSectionLabel}>Detalles de la rodada</Text>
                <TextInput value={edicion.moto} onChangeText={(moto) => setEdicion((prev) => prev ? { ...prev, moto } : prev)} placeholder="Moto (opcional)" placeholderTextColor={theme.textSecondary} style={styles.editInput} />
                <TextInput value={edicion.punto} onChangeText={(punto) => setEdicion((prev) => prev ? { ...prev, punto } : prev)} placeholder="Punto de encuentro (opcional)" placeholderTextColor={theme.textSecondary} style={styles.editInput} />
                <TextInput value={edicion.fecha} onChangeText={(fecha) => setEdicion((prev) => prev ? { ...prev, fecha } : prev)} placeholder="Fecha (AAAA-MM-DD, opcional)" placeholderTextColor={theme.textSecondary} style={styles.editInput} />
                <TextInput value={edicion.hora} onChangeText={(hora) => setEdicion((prev) => prev ? { ...prev, hora } : prev)} placeholder="Hora (HH:MM, opcional)" placeholderTextColor={theme.textSecondary} style={styles.editInput} />
                <TextInput value={edicion.cupo} onChangeText={(cupo) => setEdicion((prev) => prev ? { ...prev, cupo: cupo.replace(/[^0-9]/g, '') } : prev)} placeholder="Cupo máximo (opcional)" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" style={styles.editInput} />
                <TouchableOpacity style={styles.editPhotoButton} onPress={elegirImagenEdicion}>
                  <Ionicons name="image-outline" size={18} color={theme.primary} />
                  <Text style={styles.editPhotoText}>{edicion.imagenUrl ? 'Cambiar foto' : 'Agregar foto'}</Text>
                </TouchableOpacity>
                {!!edicion.imagenUrl && (
                  <View style={styles.editPhotoPreviewWrap}>
                    <RNImage source={{ uri: edicion.imagenUrl }} style={styles.editPhotoPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeEditPhoto} onPress={() => setEdicion((prev) => prev ? { ...prev, imagenUrl: null } : prev)}>
                      <Ionicons name="close-circle" size={24} color="#e5484d" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setEdicion(null)}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={guardarEdicion} disabled={guardandoEdicion}>
                {guardandoEdicion ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveEditText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalNotificaciones} transparent animationType="slide" onRequestClose={() => setModalNotificaciones(false)}>
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationPanel}>
            <View style={styles.notificationHeader}>
              <Text style={styles.editTitle}>Notificaciones del foro</Text>
              <TouchableOpacity onPress={() => setModalNotificaciones(false)}><Ionicons name="close" size={24} color={theme.textPrimary} /></TouchableOpacity>
            </View>
            <FlatList
              data={notificaciones}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.noNotifications}>Aún no tienes notificaciones.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.notificationItem, !item.leida && styles.unreadNotification]}
                  onPress={() => marcarNotificacionLeida(item)}>
                  <Text style={styles.notificationMessage}>{item.mensaje}</Text>
                  <Text style={styles.notificationDate}>{new Date(item.created_at).toLocaleString('es-MX')}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 15,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
    notificationButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
    notificationDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5484d' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 46, marginBottom: 12, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    searchInput: { flex: 1, color: theme.textPrimary, paddingVertical: 10 },
    userSuggestions: { marginTop: -5, marginBottom: 12, padding: 10, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
    suggestionsTitle: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginHorizontal: 6, marginBottom: 5 },
    userSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: theme.divider },
    suggestionTextWrap: { flex: 1 },
    suggestionUsername: { color: theme.textPrimary, fontWeight: '700', fontSize: 13 },
    suggestionName: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
    selectedUserFilter: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: theme.card, marginBottom: 10 },
    selectedUserText: { color: theme.textPrimary, fontSize: 12, fontWeight: '600' },
    filtersSection: { marginBottom: 12, padding: 12, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
    filtersTitle: { fontSize: 12, color: theme.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, marginRight: 8, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border },
    filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    filterChipText: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
    filterChipTextActive: { color: '#ffffff' },
    listContent: { padding: 20 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    postAuthor: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
    ownerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' },
    commentBodyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    categoriaBadge: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
    },
    fechaText: { fontSize: 12, color: theme.textSecondary },
    tituloText: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 6 },
    contenidoText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    detailsBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: theme.background, gap: 9 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    detailLabel: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
    detailValue: { flex: 1, color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    publicationImage: {
      width: '100%',
      maxWidth: 900,
      alignSelf: 'center',
      borderRadius: 14,
      marginTop: 12,
      backgroundColor: theme.background,
    },
    actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, marginTop: 14, paddingTop: 10 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    actionText: { color: theme.textSecondary, fontSize: 13 },
    attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, padding: 11, borderRadius: 12, backgroundColor: theme.background },
    attendanceSummary: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    attendanceText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    attendanceButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.primary },
    attendanceButtonActive: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
    attendanceButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    commentItem: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: theme.background },
    commentAuthor: { fontWeight: '700', color: theme.textPrimary, fontSize: 12, marginBottom: 3 },
    commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
    ownCommentBadge: { color: theme.primary, fontSize: 11, fontWeight: '700' },
    commentDate: { marginLeft: 'auto', color: theme.textSecondary, fontSize: 11 },
    commentText: { color: theme.textSecondary, fontSize: 13 },
    commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12 },
    commentInput: { flex: 1, minHeight: 42, maxHeight: 100, paddingVertical: 9, color: theme.textPrimary },
    editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    editModal: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 20, borderRadius: 18, backgroundColor: theme.card },
    editTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
    editSectionLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 7, textTransform: 'uppercase' },
    editCategories: { flexGrow: 0, marginBottom: 12 },
    editCategoryChip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 7, borderRadius: 16, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border },
    editCategoryChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    editCategoryText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
    editCategoryTextActive: { color: '#fff' },
    editPhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 10, borderColor: theme.border, borderWidth: 1, marginBottom: 10 },
    editPhotoText: { color: theme.textPrimary, fontWeight: '600' },
    editPhotoPreviewWrap: { position: 'relative', marginBottom: 12 },
    editPhotoPreview: { width: '100%', height: 150, borderRadius: 10, backgroundColor: theme.background },
    removeEditPhoto: { position: 'absolute', top: 6, right: 6, backgroundColor: theme.card, borderRadius: 14 },
    editInput: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, color: theme.textPrimary, backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
    editMultiline: { minHeight: 130 },
    editButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelEditButton: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.background },
    cancelEditText: { color: theme.textPrimary, fontWeight: '600' },
    saveEditButton: { minWidth: 90, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.primary },
    saveEditText: { color: '#ffffff', fontWeight: '700' },
    notificationOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    notificationPanel: { maxHeight: '75%', padding: 18, backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    notificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    noNotifications: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 30 },
    notificationItem: { padding: 13, borderRadius: 12, marginTop: 9, backgroundColor: theme.background },
    unreadNotification: { borderWidth: 1, borderColor: theme.primary },
    notificationMessage: { color: theme.textPrimary, fontSize: 14 },
    notificationDate: { color: theme.textSecondary, fontSize: 11, marginTop: 5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginTop: 12 },
    emptySubtext: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    fab: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      backgroundColor: theme.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
  });
