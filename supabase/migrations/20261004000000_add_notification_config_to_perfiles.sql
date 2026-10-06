alter table public.perfiles
add column if not exists notificaciones_config jsonb not null
default '{"checkInEnabled":true,"limiteEnabled":true,"checkInTime":"19:00"}'::jsonb;
