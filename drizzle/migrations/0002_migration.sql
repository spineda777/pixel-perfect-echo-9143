
create policy "Anyone can view campaign media" on storage.objects for select to anon, authenticated
  using (bucket_id = 'campaign-media');
create policy "Admins upload campaign media" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update campaign media" on storage.objects for update to authenticated
  using (bucket_id = 'campaign-media' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete campaign media" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media' and public.has_role(auth.uid(), 'admin'));
