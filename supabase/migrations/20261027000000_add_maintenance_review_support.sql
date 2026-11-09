create table if not exists public.resenas_mantenimiento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references public.eventos(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  motocicleta_id uuid references public.motocicletas(id) on delete set null,
  calificacion integer not null check (calificacion between 1 and 5),
  kilometraje integer check (kilometraje is null or kilometraje >= 0),
  taller text,
  costo numeric check (costo is null or costo >= 0),
  comentarios text not null default '',
  created_at timestamptz not null default now()
);

alter table public.resenas_mantenimiento enable row level security;

create policy "Users can read their own maintenance reviews"
  on public.resenas_mantenimiento
  for select
  using (auth.uid() = perfil_id);

create policy "Users can create their own maintenance reviews"
  on public.resenas_mantenimiento
  for insert
  with check (
    auth.uid() = perfil_id
    and exists (
      select 1
      from public.eventos
      where eventos.id = evento_id
        and eventos.perfil_id = auth.uid()
    )
    and (
      motocicleta_id is null
      or exists (
        select 1
        from public.motocicletas
        where motocicletas.id = motocicleta_id
          and motocicletas.perfil_id = auth.uid()
      )
    )
  );
