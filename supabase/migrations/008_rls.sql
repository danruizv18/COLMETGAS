-- Row Level Security: enable on all tables, permissive policy for authenticated role
-- Tighten per-role policies in a future migration.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'customers','locations','assets','asset_inspections','asset_documents',
    'personnel','personnel_certifications',
    'material_categories','materials','material_batches','material_consumption',
    'work_orders','equipment'
  ] loop
    execute format('alter table %I enable row level security', tbl);

    -- full access for authenticated users (temporary permissive policy)
    execute format(
      'create policy "authenticated_full_access" on %I
       for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;
