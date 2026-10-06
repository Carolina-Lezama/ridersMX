alter table public.perfiles
add column if not exists limite_notificacion integer not null default 0,
add column if not exists limite_bloqueo integer not null default 0;