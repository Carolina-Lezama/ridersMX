drop policy if exists "RidersMX users can update their own profile" on public.perfiles;

create policy "RidersMX users can update their own profile"
  on public.perfiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
