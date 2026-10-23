-- Storage bucket for all uploaded documents (MTRs, certificates, etc.)
-- Auth-only read and write access.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "authenticated read documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "authenticated update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated delete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');
