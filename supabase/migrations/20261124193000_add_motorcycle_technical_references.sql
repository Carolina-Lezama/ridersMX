alter table public.motocicletas
  add column if not exists referencia_aceite text,
  add column if not exists referencia_filtro_aceite text,
  add column if not exists referencia_llantas text,
  add column if not exists referencia_bujia text,
  add column if not exists referencia_paso_cadena text,
  add column if not exists referencia_bateria text;

comment on column public.motocicletas.referencia_aceite is
  'Referencia tecnica no sensible: aceite de motor recomendado para la motocicleta.';
comment on column public.motocicletas.referencia_filtro_aceite is
  'Referencia tecnica no sensible: codigo o modelo del filtro de aceite.';
comment on column public.motocicletas.referencia_llantas is
  'Referencia tecnica no sensible: medidas de llantas delantera y trasera.';
comment on column public.motocicletas.referencia_bujia is
  'Referencia tecnica no sensible: codigo o modelo de bujia.';
comment on column public.motocicletas.referencia_paso_cadena is
  'Referencia tecnica no sensible: paso o medida de cadena.';
comment on column public.motocicletas.referencia_bateria is
  'Referencia tecnica no sensible: medida o modelo de bateria.';
