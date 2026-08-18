-- Private evidence bucket. Objects are served via short-lived signed URLs.

update storage.buckets
set public = false
where id = 'evidencias';

drop policy if exists "evidencias_select_authenticated" on storage.objects;
drop policy if exists "evidencias_select_scoped" on storage.objects;

create policy "evidencias_select_scoped"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      public.is_hub()
      or exists (
        select 1
        from public.task_attachments ta
        join public.tasks t on t.id = ta.task_id
        where ta.file_path = name
          and t.client_id = public.current_client_id()
      )
    )
  );
