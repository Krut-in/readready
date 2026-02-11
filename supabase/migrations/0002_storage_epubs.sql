insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'epubs',
  'epubs',
  false,
  104857600,
  array['application/epub+zip', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own EPUBs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'epubs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own EPUBs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'epubs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own EPUBs"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'epubs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'epubs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own EPUBs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'epubs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
