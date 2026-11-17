create or replace function public.notificar_actividad_foro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  propietario_id uuid;
  nombre_actor text;
  titulo_publicacion text;
  preferencias jsonb;
  tipo_evento text;
  texto_mensaje text;
begin
  select perfil_id, titulo into propietario_id, titulo_publicacion
    from public.foro_publicaciones where id = new.publicacion_id;

  if propietario_id is null or propietario_id = new.perfil_id then
    return new;
  end if;

  select notificaciones_config into preferencias
    from public.perfiles where id = propietario_id;

  if tg_table_name = 'foro_comentarios' then
    if preferencias ->> 'comunidadComentariosEnabled' = 'false' then
      return new;
    end if;
    tipo_evento := 'comentario';
  else
    if preferencias ->> 'comunidadReaccionesEnabled' = 'false' then
      return new;
    end if;
    tipo_evento := 'reaccion';
  end if;

  select coalesce(username, nombre_completo, 'Un rider') into nombre_actor
    from public.perfiles where id = new.perfil_id;
  nombre_actor := coalesce(nombre_actor, 'Un rider');

  if tipo_evento = 'comentario' then
    texto_mensaje := nombre_actor || ' comentó tu publicación: ' || left(new.contenido, 120);
  else
    texto_mensaje := nombre_actor || ' reaccionó a tu publicación: ' || coalesce(titulo_publicacion, '');
  end if;

  insert into public.foro_notificaciones (destinatario_id, actor_id, publicacion_id, tipo, mensaje)
  values (propietario_id, new.perfil_id, new.publicacion_id, tipo_evento, texto_mensaje);
  return new;
end;
$$;
