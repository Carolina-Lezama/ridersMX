alter table public.eventos
  add column if not exists rodada_punto_reunion text,
  add column if not exists rodada_destino text,
  add column if not exists rodada_distancia_km numeric,
  add column if not exists rodada_dificultad text,
  add column if not exists mantenimiento_servicio text,
  add column if not exists mantenimiento_taller text,
  add column if not exists mantenimiento_kilometraje integer,
  add column if not exists mantenimiento_costo_estimado numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'eventos_rodada_distancia_check'
  ) then
    alter table public.eventos
      add constraint eventos_rodada_distancia_check
      check (rodada_distancia_km is null or rodada_distancia_km >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'eventos_rodada_dificultad_check'
  ) then
    alter table public.eventos
      add constraint eventos_rodada_dificultad_check
      check (
        rodada_dificultad is null
        or rodada_dificultad in ('Tranquila', 'Intermedia', 'Exigente')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'eventos_mantenimiento_kilometraje_check'
  ) then
    alter table public.eventos
      add constraint eventos_mantenimiento_kilometraje_check
      check (mantenimiento_kilometraje is null or mantenimiento_kilometraje >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'eventos_mantenimiento_costo_check'
  ) then
    alter table public.eventos
      add constraint eventos_mantenimiento_costo_check
      check (mantenimiento_costo_estimado is null or mantenimiento_costo_estimado >= 0);
  end if;
end;
$$;
