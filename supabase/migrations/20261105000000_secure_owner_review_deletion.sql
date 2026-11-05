create table if not exists public.resenas_eliminadas (
  id uuid primary key default gen_random_uuid(),
  moto_id text not null,
  propietario_id uuid not null,
  autor_id uuid,
  calificacion integer,
  comentario text,
  bloqueada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists resenas_eliminadas_moto_idx
  on public.resenas_eliminadas (moto_id, bloqueada);

alter table public.resenas_eliminadas enable row level security;

revoke all on table public.resenas_eliminadas from public, anon, authenticated;
grant select on table public.resenas_eliminadas to authenticated;

drop policy if exists "resenas_eliminadas_leer_propias"
  on public.resenas_eliminadas;

create policy "resenas_eliminadas_leer_propias"
  on public.resenas_eliminadas
  for select
  to authenticated
  using ((select auth.uid()) = propietario_id);

create or replace function public.eliminar_resena_como_dueno(p_resena_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c_limite constant integer := 5;
  v_uid uuid := auth.uid();
  v_resena public.resenas%rowtype;
  v_moto_id uuid;
  v_propietario_id uuid;
  v_total bigint;
  v_bloqueos bigint;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select *
    into v_resena
    from public.resenas
   where id = p_resena_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  if v_resena.tipo_entidad is distinct from 'Moto' then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_moto');
  end if;

  if v_resena.perfil_id = v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'es_propia');
  end if;

  if v_resena.entidad_evaluada !~*
     '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_dueno');
  end if;

  v_moto_id := v_resena.entidad_evaluada::uuid;

  perform pg_advisory_xact_lock(
    hashtextextended(v_moto_id::text, 0)
  );

  select m.perfil_id
    into v_propietario_id
    from public.motos_catalogo as m
   where m.id = v_moto_id
   for share;

  if not found or v_propietario_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_dueno');
  end if;

  select
    count(*) filter (where not bloqueada),
    count(*) filter (where bloqueada)
    into v_total, v_bloqueos
    from public.resenas_eliminadas
   where moto_id = v_moto_id::text;

  if v_total >= c_limite then
    insert into public.resenas_eliminadas (
      moto_id,
      propietario_id,
      autor_id,
      calificacion,
      comentario,
      bloqueada
    )
    values (
      v_moto_id::text,
      v_uid,
      v_resena.perfil_id,
      v_resena.calificacion,
      v_resena.comentario,
      true
    );

    return jsonb_build_object(
      'ok', false,
      'motivo', 'limite',
      'eliminadas', v_total,
      'limite', c_limite,
      'primer_intento', (v_bloqueos = 0)
    );
  end if;

  delete from public.resenas
   where id = p_resena_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  insert into public.resenas_eliminadas (
    moto_id,
    propietario_id,
    autor_id,
    calificacion,
    comentario,
    bloqueada
  )
  values (
    v_moto_id::text,
    v_uid,
    v_resena.perfil_id,
    v_resena.calificacion,
    v_resena.comentario,
    false
  );

  return jsonb_build_object(
    'ok', true,
    'eliminadas', v_total + 1,
    'limite', c_limite,
    'restantes', c_limite - (v_total + 1)
  );
end;
$$;

revoke all on function public.eliminar_resena_como_dueno(uuid)
  from public, anon, authenticated;
grant execute on function public.eliminar_resena_como_dueno(uuid)
  to authenticated;
