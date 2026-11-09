create table if not exists public.foro_asistencias (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.foro_publicaciones(id) on delete cascade,
  perfil_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint foro_asistencias_publicacion_perfil_unique unique (publicacion_id, perfil_id)
);

create index if not exists foro_asistencias_publicacion_idx
  on public.foro_asistencias (publicacion_id);

alter table public.foro_asistencias enable row level security;

create policy "Cualquiera puede ver las asistencias de rodadas"
  on public.foro_asistencias for select
  using (true);

create policy "Usuarios pueden confirmar su propia asistencia"
  on public.foro_asistencias for insert to authenticated
  with check (auth.uid() = perfil_id);

create policy "Usuarios pueden cancelar su propia asistencia"
  on public.foro_asistencias for delete to authenticated
  using (auth.uid() = perfil_id);

create or replace function public.validar_cupo_asistencia_foro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limite integer;
  ocupados integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.publicacion_id::text, 0));
  select substring(contenido from 'Cupo: *([0-9]+)')::integer
    into limite from public.foro_publicaciones where id = new.publicacion_id;
  if limite is null then return new; end if;

  select count(*) into ocupados from public.foro_asistencias where publicacion_id = new.publicacion_id;
  if ocupados >= limite then
    raise exception 'El cupo de esta rodada ya está completo.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists foro_validar_cupo_asistencia on public.foro_asistencias;
create trigger foro_validar_cupo_asistencia
  before insert on public.foro_asistencias
  for each row execute function public.validar_cupo_asistencia_foro();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'foro_asistencias'
     ) then
    alter publication supabase_realtime add table public.foro_asistencias;
  end if;
end;
$$;

notify pgrst, 'reload schema';
