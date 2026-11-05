alter table bitacoras_rodadas
  add column if not exists motocicleta_id uuid
  references motocicletas(id) on delete set null;
