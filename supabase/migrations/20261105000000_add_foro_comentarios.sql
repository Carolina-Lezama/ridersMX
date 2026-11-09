create table if not exists public.foro_comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.foro_publicaciones(id) on delete cascade,
  perfil_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null check (char_length(trim(contenido)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists foro_comentarios_publicacion_created_idx
  on public.foro_comentarios (publicacion_id, created_at);

alter table public.foro_comentarios enable row level security;

create policy "Anyone can read forum comments"
  on public.foro_comentarios for select
  using (true);

create policy "Users can add their own forum comments"
  on public.foro_comentarios for insert to authenticated
  with check (auth.uid() = perfil_id);

create policy "Users can delete their own forum comments"
  on public.foro_comentarios for delete to authenticated
  using (auth.uid() = perfil_id);

create unique index if not exists foro_likes_publicacion_perfil_unique
  on public.foro_likes (publicacion_id, perfil_id)
  where publicacion_id is not null and perfil_id is not null;

alter table public.foro_likes enable row level security;

create policy "Anyone can read forum likes"
  on public.foro_likes for select
  using (true);

create policy "Users can add their own forum likes"
  on public.foro_likes for insert to authenticated
  with check (auth.uid() = perfil_id);

create policy "Users can remove their own forum likes"
  on public.foro_likes for delete to authenticated
  using (auth.uid() = perfil_id);
