-- Hard delete for list-view bulk actions. Archive stays as archived_at / person status.

create policy "tasks_delete_scoped"
  on public.tasks for delete
  to authenticated
  using (public.is_hub() or client_id = public.current_client_id());

create policy "clients_delete_hub"
  on public.clients for delete
  to authenticated
  using (public.is_hub() and kind = 'client');

create policy "categories_delete_hub"
  on public.categories for delete
  to authenticated
  using (public.is_hub());

create policy "invitations_delete_hub"
  on public.invitations for delete
  to authenticated
  using (public.is_hub());

create policy "comments_delete_scoped"
  on public.comments for delete
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

create policy "task_attachments_delete_scoped"
  on public.task_attachments for delete
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

create policy "evidencias_delete_hub"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidencias' and public.is_hub());
