alter table eventos
  add column if not exists recordar_despues_de timestamptz;
