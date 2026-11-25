insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moto-galeria',
  'moto-galeria',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.galeria_motocicleta (
  id uuid primary key default gen_random_uuid(),
  motocicleta_id uuid not null
    references public.motocicletas(id) on delete cascade,
  perfil_id uuid not null
    references public.perfiles(id) on delete cascade,
  storage_path text not null unique
    check (char_length(storage_path) <= 500),
  fecha date not null default current_date,
  nota text
    check (nota is null or char_length(btrim(nota)) <= 300),
  created_at timestamptz not null default now(),
  constraint galeria_motocicleta_storage_owner_path
    check (storage_path like perfil_id::text || '/' || motocicleta_id::text || '/%')
);

create index if not exists galeria_motocicleta_owner_date_idx
  on public.galeria_motocicleta (perfil_id, motocicleta_id, fecha desc);

alter table public.galeria_motocicleta enable row level security;
revoke all on table public.galeria_motocicleta from public, anon, authenticated;
grant select, insert, update, delete on table public.galeria_motocicleta to authenticated;

drop policy if exists "RidersMX users can read their motorcycle gallery"
  on public.galeria_motocicleta;
create policy "RidersMX users can read their motorcycle gallery"
  on public.galeria_motocicleta
  for select
  to authenticated
  using (perfil_id = (select auth.uid()));

drop policy if exists "RidersMX users can create their motorcycle gallery photos"
  on public.galeria_motocicleta;
create policy "RidersMX users can create their motorcycle gallery photos"
  on public.galeria_motocicleta
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

drop policy if exists "RidersMX users can update their motorcycle gallery photos"
  on public.galeria_motocicleta;
create policy "RidersMX users can update their motorcycle gallery photos"
  on public.galeria_motocicleta
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

drop policy if exists "RidersMX users can delete their motorcycle gallery photos"
  on public.galeria_motocicleta;
create policy "RidersMX users can delete their motorcycle gallery photos"
  on public.galeria_motocicleta
  for delete
  to authenticated
  using (perfil_id = (select auth.uid()));

drop policy if exists "RidersMX users can read their private motorcycle gallery images"
  on storage.objects;
create policy "RidersMX users can read their private motorcycle gallery images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'moto-galeria'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.motocicletas m
      where m.id::text = (storage.foldername(name))[2]
        and m.perfil_id = (select auth.uid())
    )
  );

drop policy if exists "RidersMX users can upload their private motorcycle gallery images"
  on storage.objects;
create policy "RidersMX users can upload their private motorcycle gallery images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'moto-galeria'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.motocicletas m
      where m.id::text = (storage.foldername(name))[2]
        and m.perfil_id = (select auth.uid())
    )
  );

drop policy if exists "RidersMX users can delete their private motorcycle gallery images"
  on storage.objects;
create policy "RidersMX users can delete their private motorcycle gallery images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'moto-galeria'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.motocicletas m
      where m.id::text = (storage.foldername(name))[2]
        and m.perfil_id = (select auth.uid())
    )
  );
