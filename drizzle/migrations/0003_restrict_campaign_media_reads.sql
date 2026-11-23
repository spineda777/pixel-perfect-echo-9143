create or replace function public.is_published_campaign_media(_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.campaigns where hero_image_url = 'storage:' || _name)
      or exists (select 1 from public.prizes where image_url = 'storage:' || _name)
$$;

drop policy if exists "Anyone can view campaign media" on storage.objects;

create policy "Admins view all campaign media" on storage.objects for select to authenticated
  using (bucket_id = 'campaign-media' and public.has_role(auth.uid(), 'admin'));

create policy "Visitors view published campaign media" on storage.objects for select to anon, authenticated
  using (bucket_id = 'campaign-media' and public.is_published_campaign_media(name));