create extension if not exists pgcrypto;

set local search_path = pg_catalog, extensions, vault, public;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'riders_motocicletas_seguro_key'
  ) then
    perform vault.create_secret(
      pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text,
      'riders_motocicletas_seguro_key',
      'Clave para cifrar datos de seguros de motocicletas'
    );
  end if;
end;
$$;

create table if not exists public.motocicletas_seguros (
  motocicleta_id uuid primary key
    references public.motocicletas(id) on delete cascade,
  aseguradora_cifrada bytea,
  numero_poliza_cifrada bytea
);

alter table public.motocicletas_seguros enable row level security;
revoke all on table public.motocicletas_seguros from public, anon, authenticated;

do $$
declare
  v_key text;
begin
  select decrypted_secret
  into v_key
  from vault.decrypted_secrets
  where name = 'riders_motocicletas_seguro_key';

  if v_key is null then
    raise exception 'No se encontró la clave de cifrado de seguros en Supabase Vault';
  end if;

  insert into public.motocicletas_seguros (
    motocicleta_id,
    aseguradora_cifrada,
    numero_poliza_cifrada
  )
  select
    m.id,
    pgp_sym_encrypt(nullif(btrim(m.aseguradora), ''), v_key, 'cipher-algo=aes256, compress-algo=0'),
    pgp_sym_encrypt(nullif(btrim(m.numero_poliza), ''), v_key, 'cipher-algo=aes256, compress-algo=0')
  from public.motocicletas m
  where nullif(btrim(m.aseguradora), '') is not null
    or nullif(btrim(m.numero_poliza), '') is not null;
end;
$$;

alter table public.motocicletas
  drop column if exists placas,
  drop column if exists aseguradora,
  drop column if exists numero_poliza;

alter table public.perfiles
  drop column if exists tipo_sangre,
  drop column if exists contacto_emergencia,
  drop column if exists numero_licencia;

alter table public.motocicletas enable row level security;

drop policy if exists "RidersMX motorcycle owner guard" on public.motocicletas;
drop policy if exists "RidersMX motorcycle owner select" on public.motocicletas;
drop policy if exists "RidersMX motorcycle owner insert" on public.motocicletas;
drop policy if exists "RidersMX motorcycle owner update" on public.motocicletas;
drop policy if exists "RidersMX motorcycle owner delete" on public.motocicletas;

create policy "RidersMX motorcycle owner guard"
  on public.motocicletas
  as restrictive
  for all
  to public
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

create policy "RidersMX motorcycle owner select"
  on public.motocicletas
  for select
  to authenticated
  using (perfil_id = (select auth.uid()));

create policy "RidersMX motorcycle owner insert"
  on public.motocicletas
  for insert
  to authenticated
  with check (perfil_id = (select auth.uid()));

create policy "RidersMX motorcycle owner update"
  on public.motocicletas
  for update
  to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

create policy "RidersMX motorcycle owner delete"
  on public.motocicletas
  for delete
  to authenticated
  using (perfil_id = (select auth.uid()));

create or replace function public.obtener_seguro_motocicleta(p_motocicleta_id uuid)
returns table (aseguradora text, numero_poliza text)
language plpgsql
security definer
set search_path = pg_catalog, extensions, vault, public
as $$
declare
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.motocicletas
    where id = p_motocicleta_id
      and perfil_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para consultar este seguro'
      using errcode = '42501';
  end if;

  select decrypted_secret
  into v_key
  from vault.decrypted_secrets
  where name = 'riders_motocicletas_seguro_key';

  if v_key is null then
    raise exception 'No se encontró la clave de cifrado de seguros en Supabase Vault';
  end if;

  return query
  select
    case
      when s.aseguradora_cifrada is null then null
      else pgp_sym_decrypt(s.aseguradora_cifrada, v_key)
    end,
    case
      when s.numero_poliza_cifrada is null then null
      else pgp_sym_decrypt(s.numero_poliza_cifrada, v_key)
    end
  from public.motocicletas m
  left join public.motocicletas_seguros s on s.motocicleta_id = m.id
  where m.id = p_motocicleta_id
    and m.perfil_id = (select auth.uid());
end;
$$;

create or replace function public.guardar_motocicleta_segura(
  p_motocicleta_id uuid,
  p_alias text,
  p_tipo text,
  p_marca text,
  p_modelo text,
  p_cilindrada integer,
  p_anio integer,
  p_color text,
  p_kilometraje_actual integer,
  p_tipo_combustible text,
  p_aseguradora text,
  p_numero_poliza text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, extensions, vault, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_motocicleta_id uuid := p_motocicleta_id;
  v_key text;
  v_aseguradora text := nullif(btrim(p_aseguradora), '');
  v_numero_poliza text := nullif(btrim(p_numero_poliza), '');
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada'
      using errcode = '42501';
  end if;

  select decrypted_secret
  into v_key
  from vault.decrypted_secrets
  where name = 'riders_motocicletas_seguro_key';

  if v_key is null then
    raise exception 'No se encontró la clave de cifrado de seguros en Supabase Vault';
  end if;

  if v_motocicleta_id is null then
    insert into public.motocicletas (
      perfil_id,
      alias,
      tipo,
      marca,
      modelo,
      cilindrada,
      anio,
      color,
      kilometraje_actual,
      tipo_combustible
    )
    values (
      v_user_id,
      p_alias,
      p_tipo,
      p_marca,
      p_modelo,
      p_cilindrada,
      p_anio,
      p_color,
      p_kilometraje_actual,
      p_tipo_combustible
    )
    returning id into v_motocicleta_id;
  else
    update public.motocicletas
    set alias = p_alias,
        tipo = p_tipo,
        marca = p_marca,
        modelo = p_modelo,
        cilindrada = p_cilindrada,
        anio = p_anio,
        color = p_color,
        kilometraje_actual = p_kilometraje_actual,
        tipo_combustible = p_tipo_combustible
    where id = v_motocicleta_id
      and perfil_id = v_user_id;

    if not found then
      raise exception 'No tienes permiso para actualizar esta motocicleta'
        using errcode = '42501';
    end if;
  end if;

  insert into public.motocicletas_seguros (
    motocicleta_id,
    aseguradora_cifrada,
    numero_poliza_cifrada
  )
  values (
    v_motocicleta_id,
    case
      when v_aseguradora is null then null
      else pgp_sym_encrypt(v_aseguradora, v_key, 'cipher-algo=aes256, compress-algo=0')
    end,
    case
      when v_numero_poliza is null then null
      else pgp_sym_encrypt(v_numero_poliza, v_key, 'cipher-algo=aes256, compress-algo=0')
    end
  )
  on conflict (motocicleta_id) do update
  set aseguradora_cifrada = excluded.aseguradora_cifrada,
      numero_poliza_cifrada = excluded.numero_poliza_cifrada;

  return v_motocicleta_id;
end;
$$;

revoke all on function public.obtener_seguro_motocicleta(uuid) from public, anon, authenticated;
revoke all on function public.guardar_motocicleta_segura(
  uuid, text, text, text, text, integer, integer, text, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.obtener_seguro_motocicleta(uuid) to authenticated;
grant execute on function public.guardar_motocicleta_segura(
  uuid, text, text, text, text, integer, integer, text, integer, text, text, text
) to authenticated;
