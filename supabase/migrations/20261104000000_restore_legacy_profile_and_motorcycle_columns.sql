-- Temporary compatibility for previously released Android builds.
-- These columns are nullable and have no defaults or constraints so a later
-- migration can remove them after those builds are retired.
alter table public.motocicletas
  add column if not exists placas text null,
  add column if not exists aseguradora text null,
  add column if not exists numero_poliza text null;

alter table public.perfiles
  add column if not exists tipo_sangre text null,
  add column if not exists contacto_emergencia text null,
  add column if not exists numero_licencia text null;

-- After legacy builds are retired, remove the compatibility columns with:
-- alter table public.motocicletas
--   drop column if exists placas,
--   drop column if exists aseguradora,
--   drop column if exists numero_poliza;
-- alter table public.perfiles
--   drop column if exists tipo_sangre,
--   drop column if exists contacto_emergencia,
--   drop column if exists numero_licencia;
