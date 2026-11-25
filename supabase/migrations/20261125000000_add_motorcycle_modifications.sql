create table if not exists public.modificaciones_motocicleta (
  id uuid primary key default gen_random_uuid(),
  motocicleta_id uuid not null
    references public.motocicletas(id) on delete cascade,
  perfil_id uuid not null
    references public.perfiles(id) on delete cascade,
  nombre text not null
    check (char_length(btrim(nombre)) between 1 and 120),
  categoria text not null
    check (categoria in ('accesorio', 'modificacion')),
  marca text
    check (marca is null or char_length(btrim(marca)) <= 100),
  fecha_instalacion date not null,
  garantia text
    check (garantia is null or char_length(btrim(garantia)) <= 120),
  costo numeric(12, 2) not null default 0
    check (costo >= 0),
  notas text
    check (notas is null or char_length(btrim(notas)) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists modificaciones_motocicleta_owner_date_idx
  on public.modificaciones_motocicleta (perfil_id, motocicleta_id, fecha_instalacion desc);

alter table public.modificaciones_motocicleta enable row level security;
revoke all on table public.modificaciones_motocicleta from public, anon, authenticated;
grant select, insert, update, delete on table public.modificaciones_motocicleta to authenticated;

drop policy if exists "RidersMX users can read their motorcycle modifications"
  on public.modificaciones_motocicleta;
create policy "RidersMX users can read their motorcycle modifications"
  on public.modificaciones_motocicleta
  for select
  to authenticated
  using (perfil_id = (select auth.uid()));

drop policy if exists "RidersMX users can create their motorcycle modifications"
  on public.modificaciones_motocicleta;
create policy "RidersMX users can create their motorcycle modifications"
  on public.modificaciones_motocicleta
  for insert
  to authenticated
  with check (
    perfil_id = (select auth.uid())
    and exists (
      select 1
      from public.motocicletas m
      where m.id = motocicleta_id
        and m.perfil_id = (select auth.uid())
    )
  );

drop policy if exists "RidersMX users can update their motorcycle modifications"
  on public.modificaciones_motocicleta;
create policy "RidersMX users can update their motorcycle modifications"
  on public.modificaciones_motocicleta
  for update
  to authenticated
  using (perfil_id = (select auth.uid()))
  with check (
    perfil_id = (select auth.uid())
    and exists (
      select 1
      from public.motocicletas m
      where m.id = motocicleta_id
        and m.perfil_id = (select auth.uid())
    )
  );

drop policy if exists "RidersMX users can delete their motorcycle modifications"
  on public.modificaciones_motocicleta;
create policy "RidersMX users can delete their motorcycle modifications"
  on public.modificaciones_motocicleta
  for delete
  to authenticated
  using (perfil_id = (select auth.uid()));
