-- Role-based RLS policies.
-- Drops the temporary "authenticated_full_access" policies from 008_rls.sql and
-- 010_notifications.sql, then creates fine-grained per-role policies.
-- Requires: 012_profiles.sql (get_my_role, get_my_customer_id).

-- ─────────────────────────────────────────────────────────────
-- Drop old permissive policies from all tables
-- ─────────────────────────────────────────────────────────────
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'customers','locations','assets','asset_inspections','asset_documents',
    'personnel','personnel_certifications',
    'material_categories','materials','material_batches','material_consumption',
    'work_orders','equipment','notifications'
  ] loop
    -- DROP POLICY IF EXISTS only guards against a missing policy, not a missing table.
    -- Guard against the table not existing (e.g. fresh DEV DB where earlier migrations
    -- haven't been applied yet).
    if exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = tbl
    ) then
      execute format('drop policy if exists "authenticated_full_access" on %I', tbl);
    end if;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Policy reference
-- ─────────────────────────────────────────────────────────────
-- admin      : full read/write on all tables; manages profiles via service client.
-- engineer   : read/write on operational tables; no deletes; cannot write profiles.
-- technician : read on most tables; insert/update on inspections & consumption only;
--              no deletes; cannot write customers, material catalog, or profiles.
-- client     : SELECT only, restricted to rows belonging to their own customer_id;
--              no access to personnel, materials, work orders, or notifications (except
--              their own customer's notifications).
--
-- NOTE: These policies are the security enforcement layer.
-- UI hiding (sidebar items, disabled buttons) is UX convenience only — never rely on it.

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────
create policy "customers_admin" on customers
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "customers_engineer_select" on customers
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "customers_engineer_insert" on customers
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "customers_engineer_update" on customers
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "customers_technician_select" on customers
  for select to authenticated
  using (get_my_role() = 'technician');

-- Client sees only their own customer row.
create policy "customers_client_select" on customers
  for select to authenticated
  using (
    get_my_role() = 'client'
    and id = get_my_customer_id()
  );

-- ─────────────────────────────────────────────────────────────
-- LOCATIONS
-- ─────────────────────────────────────────────────────────────
create policy "locations_admin" on locations
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "locations_engineer_select" on locations
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "locations_engineer_insert" on locations
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "locations_engineer_update" on locations
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "locations_technician_select" on locations
  for select to authenticated
  using (get_my_role() = 'technician');

create policy "locations_client_select" on locations
  for select to authenticated
  using (
    get_my_role() = 'client'
    and customer_id = get_my_customer_id()
  );

-- ─────────────────────────────────────────────────────────────
-- ASSETS
-- ─────────────────────────────────────────────────────────────
create policy "assets_admin" on assets
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "assets_engineer_select" on assets
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "assets_engineer_insert" on assets
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "assets_engineer_update" on assets
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "assets_technician_select" on assets
  for select to authenticated
  using (get_my_role() = 'technician');

create policy "assets_client_select" on assets
  for select to authenticated
  using (
    get_my_role() = 'client'
    and customer_id = get_my_customer_id()
  );

-- ─────────────────────────────────────────────────────────────
-- ASSET INSPECTIONS
-- ─────────────────────────────────────────────────────────────
create policy "asset_inspections_admin" on asset_inspections
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "asset_inspections_engineer_select" on asset_inspections
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "asset_inspections_engineer_insert" on asset_inspections
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "asset_inspections_engineer_update" on asset_inspections
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

-- Technicians can record and update inspections, but NOT delete.
create policy "asset_inspections_technician_select" on asset_inspections
  for select to authenticated
  using (get_my_role() = 'technician');

create policy "asset_inspections_technician_insert" on asset_inspections
  for insert to authenticated
  with check (get_my_role() = 'technician');

create policy "asset_inspections_technician_update" on asset_inspections
  for update to authenticated
  using  (get_my_role() = 'technician')
  with check (get_my_role() = 'technician');

-- Client sees inspections for their own customer's assets only.
create policy "asset_inspections_client_select" on asset_inspections
  for select to authenticated
  using (
    get_my_role() = 'client'
    and asset_id in (
      select id from assets where customer_id = get_my_customer_id()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- ASSET DOCUMENTS
-- ─────────────────────────────────────────────────────────────
create policy "asset_documents_admin" on asset_documents
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "asset_documents_engineer_select" on asset_documents
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "asset_documents_engineer_insert" on asset_documents
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "asset_documents_engineer_update" on asset_documents
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

-- Technicians can upload documents (insert) but not delete.
create policy "asset_documents_technician_select" on asset_documents
  for select to authenticated
  using (get_my_role() = 'technician');

create policy "asset_documents_technician_insert" on asset_documents
  for insert to authenticated
  with check (get_my_role() = 'technician');

create policy "asset_documents_client_select" on asset_documents
  for select to authenticated
  using (
    get_my_role() = 'client'
    and asset_id in (
      select id from assets where customer_id = get_my_customer_id()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- PERSONNEL
-- ─────────────────────────────────────────────────────────────
create policy "personnel_admin" on personnel
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "personnel_engineer_select" on personnel
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "personnel_engineer_insert" on personnel
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "personnel_engineer_update" on personnel
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "personnel_technician_select" on personnel
  for select to authenticated
  using (get_my_role() = 'technician');

-- Clients have no access to personnel records.

-- ─────────────────────────────────────────────────────────────
-- PERSONNEL CERTIFICATIONS
-- ─────────────────────────────────────────────────────────────
create policy "personnel_certifications_admin" on personnel_certifications
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "personnel_certifications_engineer_select" on personnel_certifications
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "personnel_certifications_engineer_insert" on personnel_certifications
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "personnel_certifications_engineer_update" on personnel_certifications
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "personnel_certifications_technician_select" on personnel_certifications
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- MATERIAL CATEGORIES
-- ─────────────────────────────────────────────────────────────
-- Technicians can read the catalog but not modify it.
create policy "material_categories_admin" on material_categories
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "material_categories_engineer_select" on material_categories
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "material_categories_engineer_insert" on material_categories
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "material_categories_engineer_update" on material_categories
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "material_categories_technician_select" on material_categories
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- MATERIALS
-- ─────────────────────────────────────────────────────────────
create policy "materials_admin" on materials
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "materials_engineer_select" on materials
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "materials_engineer_insert" on materials
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "materials_engineer_update" on materials
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "materials_technician_select" on materials
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- MATERIAL BATCHES
-- ─────────────────────────────────────────────────────────────
create policy "material_batches_admin" on material_batches
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "material_batches_engineer_select" on material_batches
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "material_batches_engineer_insert" on material_batches
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "material_batches_engineer_update" on material_batches
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "material_batches_technician_select" on material_batches
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- MATERIAL CONSUMPTION
-- ─────────────────────────────────────────────────────────────
create policy "material_consumption_admin" on material_consumption
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "material_consumption_engineer_select" on material_consumption
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "material_consumption_engineer_insert" on material_consumption
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "material_consumption_engineer_update" on material_consumption
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

-- Technicians can record consumption (insert/update) but NOT delete.
create policy "material_consumption_technician_select" on material_consumption
  for select to authenticated
  using (get_my_role() = 'technician');

create policy "material_consumption_technician_insert" on material_consumption
  for insert to authenticated
  with check (get_my_role() = 'technician');

create policy "material_consumption_technician_update" on material_consumption
  for update to authenticated
  using  (get_my_role() = 'technician')
  with check (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- WORK ORDERS
-- ─────────────────────────────────────────────────────────────
create policy "work_orders_admin" on work_orders
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "work_orders_engineer_select" on work_orders
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "work_orders_engineer_insert" on work_orders
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "work_orders_engineer_update" on work_orders
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "work_orders_technician_select" on work_orders
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- EQUIPMENT
-- ─────────────────────────────────────────────────────────────
create policy "equipment_admin" on equipment
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "equipment_engineer_select" on equipment
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "equipment_engineer_insert" on equipment
  for insert to authenticated
  with check (get_my_role() = 'engineer');

create policy "equipment_engineer_update" on equipment
  for update to authenticated
  using  (get_my_role() = 'engineer')
  with check (get_my_role() = 'engineer');

create policy "equipment_technician_select" on equipment
  for select to authenticated
  using (get_my_role() = 'technician');

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
create policy "notifications_admin" on notifications
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "notifications_engineer_select" on notifications
  for select to authenticated
  using (get_my_role() = 'engineer');

create policy "notifications_engineer_insert" on notifications
  for insert to authenticated
  with check (get_my_role() = 'engineer');

-- Client sees notifications for their own customer only.
create policy "notifications_client_select" on notifications
  for select to authenticated
  using (
    get_my_role() = 'client'
    and customer_id = get_my_customer_id()
  );

-- ─────────────────────────────────────────────────────────────
-- STORAGE — documents bucket
-- ─────────────────────────────────────────────────────────────
-- Replace the single authenticated policy with role-based ones.

-- Drop old permissive storage policies (created in 009_storage.sql).
drop policy if exists "authenticated read documents"   on storage.objects;
drop policy if exists "authenticated upload documents" on storage.objects;
drop policy if exists "authenticated update documents" on storage.objects;
drop policy if exists "authenticated delete documents" on storage.objects;

-- Admin: full access to documents bucket.
create policy "storage_admin_all" on storage.objects
  for all to authenticated
  using  (bucket_id = 'documents' and get_my_role() = 'admin')
  with check (bucket_id = 'documents' and get_my_role() = 'admin');

-- Engineer: read, upload, update.
create policy "storage_engineer_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and get_my_role() = 'engineer');

create policy "storage_engineer_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and get_my_role() = 'engineer');

create policy "storage_engineer_update" on storage.objects
  for update to authenticated
  using  (bucket_id = 'documents' and get_my_role() = 'engineer')
  with check (bucket_id = 'documents' and get_my_role() = 'engineer');

-- Technician: read and upload (no delete, no update of others' files).
create policy "storage_technician_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and get_my_role() = 'technician');

create policy "storage_technician_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and get_my_role() = 'technician');

-- Client: read-only access to documents bucket.
create policy "storage_client_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and get_my_role() = 'client');
