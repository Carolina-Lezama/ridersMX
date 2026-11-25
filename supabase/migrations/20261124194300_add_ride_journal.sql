create table if not exists public.diario_rutas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  bitacora_id uuid unique references public.bitacoras_rodadas(id) on delete cascade,
  tipo_registro text not null
    check (tipo_registro in ('ruta', 'gasolinera', 'mirador', 'taller', 'otro')),
  nombre text not null
    check (char_length(btrim(nombre)) between 1 and 120),
  tipo_camino text
    check (tipo_camino is null or tipo_camino in ('curvas', 'terraceria', 'autopista', 'mixto', 'otro')),
  ubicacion_url text,
  latitud numeric(9, 6)
    check (latitud is null or latitud between -90 and 90),
  longitud numeric(9, 6)
    check (longitud is null or longitud between -180 and 180),
  notas_asfalto text,
  notas_clima text,
  created_at timestamptz not null default now(),
  constraint diario_rutas_coordenadas_pareadas
    check ((latitud is null) = (longitud is null)),
  constraint diario_rutas_tipo_referencia
    check (
      (tipo_registro = 'ruta' and bitacora_id is not null)
      or (tipo_registro <> 'ruta' and bitacora_id is null)
    )
);

create index if not exists diario_rutas_perfil_camino_idx
  on public.diario_rutas (perfil_id, tipo_camino, created_at desc);

alter table public.diario_rutas enable row level security;

revoke all on table public.diario_rutas from public, anon, authenticated;
grant select, insert, update, delete on table public.diario_rutas to authenticated;

drop policy if exists "RidersMX users can read their own route journal"
  on public.diario_rutas;
create policy "RidersMX users can read their own route journal"
  on public.diario_rutas
  for select
  to authenticated
  using (perfil_id = (select auth.uid()));

drop policy if exists "RidersMX users can create their own route journal entries"
  on public.diario_rutas;
create policy "RidersMX users can create their own route journal entries"
  on public.diario_rutas
  for insert
  to authenticated
  with check (
    perfil_id = (select auth.uid())
    and (
      bitacora_id is null
      or exists (
        select 1
        from public.bitacoras_rodadas b
        where b.id = bitacora_id
          and b.perfil_id = (select auth.uid())
      )
    )
  );

drop policy if exists "RidersMX users can update their own route journal entries"
  on public.diario_rutas;
create policy "RidersMX users can update their own route journal entries"
  on public.diario_rutas
  for update
  to authenticated
  using (perfil_id = (select auth.uid()))
  with check (
    perfil_id = (select auth.uid())
    and (
      bitacora_id is null
      or exists (
        select 1
        from public.bitacoras_rodadas b
        where b.id = bitacora_id
          and b.perfil_id = (select auth.uid())
      )
    )
  );

drop policy if exists "RidersMX users can delete their own route journal entries"
  on public.diario_rutas;
create policy "RidersMX users can delete their own route journal entries"
  on public.diario_rutas
  for delete
  to authenticated
  using (perfil_id = (select auth.uid()));
