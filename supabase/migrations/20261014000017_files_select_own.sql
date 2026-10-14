-- insert ... returning en "files" fallaba: la política de lectura llamaba a can_view_file(), que busca la fila
-- en la misma tabla y todavía no ve la que se está insertando. Quien sube el archivo se reconoce por la columna.

drop policy files_select on public.files;
create policy files_select on public.files for select to authenticated
  using (uploaded_by = (select auth.uid()) or private.can_view_file(id));
