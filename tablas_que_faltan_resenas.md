-- =====================================================================
--  Pantalla de Reseñas: lo que FALTA en la base de datos
--  Pégalo en Supabase → SQL Editor y ejecútalo (puedes hacerlo por bloques).
--
--  Lo que YA existe y la pantalla ya usa:
--    · resenas   (perfil_id, entidad_evaluada, tipo_entidad, calificacion, comentario)
--    · perfiles  (username)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) TABLA FALTANTE: motos_catalogo
--    Catálogo público de motos que se muestra en la pantalla y donde se
--    guardan las motos que publica la gente con "Publicar mi moto".
--    (No se reutiliza `motocicletas` porque esa es el garage PRIVADO del
--    usuario: placas, kilometraje, póliza, etc.)
-- ---------------------------------------------------------------------
create table if not exists public.motos_catalogo (
  id          uuid primary key default uuid_generate_v4(),
  perfil_id   uuid references public.perfiles(id) on delete set null,  -- quién la publicó
  nombre      text    not null,
  marca       text    not null,
  modelo      integer not null,            -- año (ej. 2025)
  tipo        text,                        -- Deportiva, Urbana, Naked, Chopper, Trabajo...
  cilindrada  integer,                     -- en cc
  precio      numeric,                     -- en pesos
  descripcion text,
  imagen_url  text,                        -- URL pública de la foto (Storage)
  propietario text,                        -- nombre que se muestra: "Publicada por ..."
  created_at  timestamptz default timezone('utc'::text, now())
);

create index if not exists motos_catalogo_marca_idx on public.motos_catalogo (marca);

alter table public.motos_catalogo enable row level security;

drop policy if exists "motos_catalogo_leer"       on public.motos_catalogo;
drop policy if exists "motos_catalogo_insertar"   on public.motos_catalogo;
drop policy if exists "motos_catalogo_actualizar" on public.motos_catalogo;
drop policy if exists "motos_catalogo_borrar"     on public.motos_catalogo;

-- Todos los usuarios con sesión pueden ver el catálogo
create policy "motos_catalogo_leer" on public.motos_catalogo
  for select to authenticated using (true);

-- Cada quien solo publica / edita / borra sus propias motos
create policy "motos_catalogo_insertar" on public.motos_catalogo
  for insert to authenticated with check (auth.uid() = perfil_id);
create policy "motos_catalogo_actualizar" on public.motos_catalogo
  for update to authenticated using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "motos_catalogo_borrar" on public.motos_catalogo
  for delete to authenticated using (auth.uid() = perfil_id);


-- ---------------------------------------------------------------------
-- 2) BUCKET FALTANTE (Storage): motos
--    Aquí se suben las fotos de "Publicar mi moto". Público para lectura.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('motos', 'motos', true)
on conflict (id) do nothing;

drop policy if exists "motos_fotos_leer"   on storage.objects;
drop policy if exists "motos_fotos_subir"  on storage.objects;
drop policy if exists "motos_fotos_borrar" on storage.objects;

create policy "motos_fotos_leer" on storage.objects
  for select using (bucket_id = 'motos');

-- Cada usuario sube a su propia carpeta:  motos/<su-uuid>/archivo.jpg
create policy "motos_fotos_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'motos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "motos_fotos_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'motos' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------
-- 3) AJUSTES A `resenas` (la tabla ya existe; esto la endurece)
--    · La pantalla guarda el id de la moto en `entidad_evaluada` (texto)
--      y 'moto' en `tipo_entidad`, así que NO hace falta agregar columnas.
-- ---------------------------------------------------------------------

-- Calificación entre 1 y 5 (la pantalla solo manda enteros 1..5)
alter table public.resenas
  drop constraint if exists resenas_calificacion_rango;
alter table public.resenas
  add constraint resenas_calificacion_rango check (calificacion between 1 and 5);

-- Una sola reseña por persona y por moto (igual que "Ya escribiste una reseña")
-- ⚠️ Si ya tienes reseñas duplicadas, este índice fallará: bórralas antes.
create unique index if not exists resenas_una_por_usuario_moto
  on public.resenas (perfil_id, entidad_evaluada)
  where tipo_entidad = 'moto';

-- Políticas RLS. Si ya tienes políticas en `resenas`, revisa que no se dupliquen.
alter table public.resenas enable row level security;

drop policy if exists "resenas_leer"       on public.resenas;
drop policy if exists "resenas_insertar"   on public.resenas;
drop policy if exists "resenas_actualizar" on public.resenas;
drop policy if exists "resenas_borrar"     on public.resenas;

create policy "resenas_leer" on public.resenas
  for select to authenticated using (true);
create policy "resenas_insertar" on public.resenas
  for insert to authenticated with check (auth.uid() = perfil_id);
create policy "resenas_actualizar" on public.resenas
  for update to authenticated using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
create policy "resenas_borrar" on public.resenas
  for delete to authenticated using (auth.uid() = perfil_id);


-- ---------------------------------------------------------------------
-- 4) OPCIONAL: vista `perfiles_publicos`
--    Úsala SOLO si en la app ves "Usuario" en lugar del nombre real en
--    reseñas de otras personas. Pasa porque `perfiles` solo deja leer tu
--    propia fila (y esa tabla tiene datos sensibles: teléfono, tipo de
--    sangre, contacto de emergencia). La vista expone únicamente lo seguro.
--    Después, en ResenasScreen.tsx cambia:  TABLA_PERFILES = 'perfiles_publicos'
-- ---------------------------------------------------------------------
create or replace view public.perfiles_publicos as
  select id, username, avatar_url
  from public.perfiles;

grant select on public.perfiles_publicos to authenticated;