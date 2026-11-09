create table if not exists public.foro_notificaciones (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  publicacion_id uuid references public.foro_publicaciones(id) on delete cascade,
  tipo text not null check (tipo in ('comentario', 'reaccion')),
  mensaje text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists foro_notificaciones_destinatario_fecha_idx
  on public.foro_notificaciones (destinatario_id, created_at desc);

alter table public.foro_notificaciones enable row level security;

create policy "Usuarios pueden leer sus notificaciones del foro"
  on public.foro_notificaciones for select to authenticated
  using (auth.uid() = destinatario_id);

create policy "Usuarios pueden marcar sus notificaciones del foro"
  on public.foro_notificaciones for update to authenticated
  using (auth.uid() = destinatario_id)
  with check (auth.uid() = destinatario_id);

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
  tipo_evento text;
  texto_mensaje text;
begin
  select perfil_id, titulo into propietario_id, titulo_publicacion
    from public.foro_publicaciones where id = new.publicacion_id;

  if propietario_id is null or propietario_id = new.perfil_id then
    return new;
  end if;

  select coalesce(username, nombre_completo, 'Un rider') into nombre_actor
    from public.perfiles where id = new.perfil_id;
  nombre_actor := coalesce(nombre_actor, 'Un rider');

  if tg_table_name = 'foro_comentarios' then
    tipo_evento := 'comentario';
    texto_mensaje := nombre_actor || ' comentó tu publicación: ' || left(new.contenido, 120);
  else
    tipo_evento := 'reaccion';
    texto_mensaje := nombre_actor || ' reaccionó a tu publicación: ' || coalesce(titulo_publicacion, '');
  end if;

  insert into public.foro_notificaciones (destinatario_id, actor_id, publicacion_id, tipo, mensaje)
  values (propietario_id, new.perfil_id, new.publicacion_id, tipo_evento, texto_mensaje);
  return new;
end;
$$;

drop trigger if exists foro_comentario_notificacion on public.foro_comentarios;
create trigger foro_comentario_notificacion
  after insert on public.foro_comentarios
  for each row execute function public.notificar_actividad_foro();

drop trigger if exists foro_like_notificacion on public.foro_likes;
create trigger foro_like_notificacion
  after insert on public.foro_likes
  for each row execute function public.notificar_actividad_foro();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'foro_notificaciones'
     ) then
    alter publication supabase_realtime add table public.foro_notificaciones;
  end if;
end;
$$;

notify pgrst, 'reload schema';
