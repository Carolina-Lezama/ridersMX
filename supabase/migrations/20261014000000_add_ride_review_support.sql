create extension if not exists pgcrypto;

alter table eventos
  add column if not exists estado_review text not null default 'pendiente';

create table if not exists bitacoras_rodadas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  perfil_id uuid references perfiles(id) on delete cascade,
  distancia_km numeric default 0,
  duracion_minutos integer default 0,
  calificacion integer,
  comentarios_review text,
  foto_url text,
  created_at timestamptz default now()
);

create index if not exists idx_bitacoras_rodadas_perfil
  on bitacoras_rodadas(perfil_id);

create index if not exists idx_eventos_estado_review
  on eventos(perfil_id, estado_review, fecha);
