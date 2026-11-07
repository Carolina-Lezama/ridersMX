create extension if not exists pgcrypto;

set local search_path = pg_catalog, extensions, vault, public;

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

  insert into public.motocicletas_seguros as seguro_guardado (
    motocicleta_id,
    aseguradora_cifrada,
    numero_poliza_cifrada
  )
  select
    m.id,
    case
      when nullif(btrim(m.aseguradora), '') is null then null
      else pgp_sym_encrypt(nullif(btrim(m.aseguradora), ''), v_key, 'cipher-algo=aes256, compress-algo=0')
    end,
    case
      when nullif(btrim(m.numero_poliza), '') is null then null
      else pgp_sym_encrypt(nullif(btrim(m.numero_poliza), ''), v_key, 'cipher-algo=aes256, compress-algo=0')
    end
  from public.motocicletas m
  where nullif(btrim(m.aseguradora), '') is not null
    or nullif(btrim(m.numero_poliza), '') is not null
  on conflict (motocicleta_id) do update
  set aseguradora_cifrada = coalesce(excluded.aseguradora_cifrada, seguro_guardado.aseguradora_cifrada),
      numero_poliza_cifrada = coalesce(excluded.numero_poliza_cifrada, seguro_guardado.numero_poliza_cifrada);
end;
$$;

alter table public.motocicletas_seguros enable row level security;
revoke all on table public.motocicletas_seguros from public, anon, authenticated;

create or replace function public.guardar_seguro_motocicleta(
  p_motocicleta_id uuid,
  p_aseguradora text,
  p_numero_poliza text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, extensions, vault, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_aseguradora text := nullif(btrim(p_aseguradora), '');
  v_numero_poliza text := nullif(btrim(p_numero_poliza), '');
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.motocicletas
    where id = p_motocicleta_id
      and perfil_id = v_user_id
  ) then
    raise exception 'No tienes permiso para actualizar el seguro de esta motocicleta'
      using errcode = '42501';
  end if;

  if v_aseguradora is null and v_numero_poliza is null then
    delete from public.motocicletas_seguros
    where motocicleta_id = p_motocicleta_id;
    return;
  end if;

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
  values (
    p_motocicleta_id,
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
end;
$$;

revoke all on function public.guardar_seguro_motocicleta(uuid, text, text) from public, anon, authenticated;
grant execute on function public.guardar_seguro_motocicleta(uuid, text, text) to authenticated;

alter table public.motocicletas
  drop column if exists placas,
  drop column if exists aseguradora,
  drop column if exists numero_poliza;

alter table public.perfiles
  drop column if exists tipo_sangre,
  drop column if exists contacto_emergencia,
  drop column if exists numero_licencia;
