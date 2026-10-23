-- Audit trail: created_by columns + inspection_audit_log table.
-- created_by on asset_inspections, material_consumption, notifications: records the
--   auth user who created the row (auto-populated by trigger).
-- inspection_audit_log: full before/after JSONB snapshots of every inspection change,
--   required for ASME Section VIII traceability (tamper-evident compliance record).

-- ─────────────────────────────────────────────────────────────
-- created_by columns
-- ─────────────────────────────────────────────────────────────
alter table asset_inspections   add column if not exists created_by uuid references auth.users(id);
alter table material_consumption add column if not exists created_by uuid references auth.users(id);
alter table notifications        add column if not exists created_by uuid references auth.users(id);

-- Trigger function: stamp created_by = auth.uid() on INSERT when not already set.
-- SECURITY DEFINER so it can read auth.uid() even when called from restricted contexts.
create or replace function set_created_by()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trg_asset_inspections_created_by
  before insert on asset_inspections
  for each row execute function set_created_by();

create trigger trg_material_consumption_created_by
  before insert on material_consumption
  for each row execute function set_created_by();

create trigger trg_notifications_created_by
  before insert on notifications
  for each row execute function set_created_by();

-- ─────────────────────────────────────────────────────────────
-- Inspection audit log
-- ─────────────────────────────────────────────────────────────
-- WHY a dedicated table (not just created_by): inspections are compliance records
-- under ASME Section VIII. Any modification — result change, date edit, certificate
-- number correction — must be permanently traceable. old_values/new_values capture
-- the full row snapshot so nothing can be silently altered.
create table inspection_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  -- No FK back to asset_inspections: audit records must survive inspection deletion.
  -- ON DELETE CASCADE would silently erase the compliance trail — exactly wrong.
  inspection_id uuid        not null,
  action        text        not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_by    uuid        references auth.users(id),
  changed_at    timestamptz not null default now(),
  old_values    jsonb,   -- null on INSERT
  new_values    jsonb    -- null on DELETE
);

create index idx_inspection_audit_inspection_id on inspection_audit_log(inspection_id);
create index idx_inspection_audit_changed_at    on inspection_audit_log(changed_at desc);

-- Capture INSERT / UPDATE / DELETE on asset_inspections.
create or replace function audit_inspection_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into inspection_audit_log (inspection_id, action, changed_by, new_values)
    values (new.id, 'INSERT', auth.uid(), to_jsonb(new));

  elsif tg_op = 'UPDATE' then
    insert into inspection_audit_log (inspection_id, action, changed_by, old_values, new_values)
    values (new.id, 'UPDATE', auth.uid(), to_jsonb(old), to_jsonb(new));

  elsif tg_op = 'DELETE' then
    insert into inspection_audit_log (inspection_id, action, changed_by, old_values)
    values (old.id, 'DELETE', auth.uid(), to_jsonb(old));
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_audit_inspection_changes
  after insert or update or delete on asset_inspections
  for each row execute function audit_inspection_change();

-- ─────────────────────────────────────────────────────────────
-- RLS on inspection_audit_log
-- ─────────────────────────────────────────────────────────────
alter table inspection_audit_log enable row level security;

-- Admin: full access (can review and investigate any change).
create policy "audit_log_admin_all" on inspection_audit_log
  for all to authenticated
  using  (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- Engineer & technician: read-only (can see the audit trail for their work).
create policy "audit_log_staff_select" on inspection_audit_log
  for select to authenticated
  using (get_my_role() in ('engineer', 'technician'));

-- Clients have no access to the audit log.
