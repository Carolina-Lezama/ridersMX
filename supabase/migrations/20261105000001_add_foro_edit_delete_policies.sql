create policy "Usuarios pueden editar sus publicaciones"
  on public.foro_publicaciones
  for update
  to authenticated
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id);

create policy "Usuarios pueden borrar sus publicaciones"
  on public.foro_publicaciones
  for delete
  to authenticated
  using (auth.uid() = perfil_id);

create policy "Usuarios pueden editar sus comentarios"
  on public.foro_comentarios
  for update
  to authenticated
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id);
