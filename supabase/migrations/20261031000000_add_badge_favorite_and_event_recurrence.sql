alter table public.perfiles
  add column if not exists insignia_favorita_id text;

alter table public.eventos
  add column if not exists serie_id uuid,
  add column if not exists recurrencia text not null default 'none',
  add column if not exists intervalo_recurrencia integer,
  add column if not exists recurrencia_hasta date;

alter table public.eventos
  add constraint eventos_recurrencia_check
    check (recurrencia in ('none', 'weekly', 'biweekly', 'monthly', 'custom')),
  add constraint eventos_intervalo_recurrencia_check
    check (
      (
        recurrencia = 'custom'
        and intervalo_recurrencia is not null
        and intervalo_recurrencia between 1 and 365
      )
      or (recurrencia <> 'custom' and intervalo_recurrencia is null)
    ),
  add constraint eventos_recurrencia_hasta_check
    check (recurrencia = 'none' or recurrencia_hasta is not null),
  add constraint eventos_serie_recurrencia_check
    check (recurrencia = 'none' or serie_id is not null);

create index if not exists eventos_serie_id_idx
  on public.eventos (serie_id);
