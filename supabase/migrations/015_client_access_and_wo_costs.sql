-- 015: Acceso de clientes con credenciales temporales + costos por orden de trabajo.
-- SOLO AGREGA: no modifica ni elimina nada existente (solo ADD COLUMN IF NOT EXISTS y tablas nuevas).
-- Requiere: 006, 007, 012, 013.

-- ─────────────────────────────────────────────────────────────
-- 1) Perfiles: control de contraseña temporal (1 hora) y datos personales
-- ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists phone                     text;
alter table profiles add column if not exists must_change_password      boolean not null default false;
alter table profiles add column if not exists temp_password_expires_at  timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 2) Órdenes de trabajo: campo de reporte (imprevistos)
-- ─────────────────────────────────────────────────────────────
alter table work_orders add column if not exists incident_report text;

-- ─────────────────────────────────────────────────────────────
-- 3) Materiales usados en la OT (con precio)
-- ─────────────────────────────────────────────────────────────
create table if not exists work_order_materials (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  description   text not null,
  unit          text,
  quantity      numeric(14, 3) not null default 1 check (quantity >= 0),
  unit_price    numeric(14, 2) not null default 0 check (unit_price >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_work_order_materials_updated_at
  before update on work_order_materials
  for each row execute function set_updated_at();

create index if not exists idx_work_order_materials_wo on work_order_materials(work_order_id);

-- ─────────────────────────────────────────────────────────────
-- 4) Viáticos de la OT
-- ─────────────────────────────────────────────────────────────
create table if not exists work_order_expenses (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  description   text not null,
  amount        numeric(14, 2) not null default 0 check (amount >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_work_order_expenses_updated_at
  before update on work_order_expenses
  for each row execute function set_updated_at();

create index if not exists idx_work_order_expenses_wo on work_order_expenses(work_order_id);

-- ─────────────────────────────────────────────────────────────
-- 5) Trabajadores de la OT (días trabajados y pago por día)
-- ─────────────────────────────────────────────────────────────
create table if not exists work_order_workers (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  personnel_id  uuid references personnel(id) on delete set null,
  worker_name   text not null,
  days_worked   numeric(8, 2)  not null default 1 check (days_worked >= 0),
  daily_rate    numeric(14, 2) not null default 0 check (daily_rate >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_work_order_workers_updated_at
  before update on work_order_workers
  for each row execute function set_updated_at();

create index if not exists idx_work_order_workers_wo on work_order_workers(work_order_id);

-- ─────────────────────────────────────────────────────────────
-- 6) RLS (mismo criterio que work_orders: admin todo, engineer sin borrar, technician solo lectura,
--    client sin acceso). La app escribe con el service client; esto protege el acceso directo.
-- ─────────────────────────────────────────────────────────────
do $$
declare tbl text;
begin
  foreach tbl in array array['work_order_materials','work_order_expenses','work_order_workers'] loop
    execute format('alter table %I enable row level security', tbl);

    execute format($f$create policy "%1$s_admin" on %1$I
      for all to authenticated
      using (get_my_role() = 'admin') with check (get_my_role() = 'admin')$f$, tbl);

    execute format($f$create policy "%1$s_engineer_select" on %1$I
      for select to authenticated using (get_my_role() = 'engineer')$f$, tbl);

    execute format($f$create policy "%1$s_engineer_insert" on %1$I
      for insert to authenticated with check (get_my_role() = 'engineer')$f$, tbl);

    execute format($f$create policy "%1$s_engineer_update" on %1$I
      for update to authenticated
      using (get_my_role() = 'engineer') with check (get_my_role() = 'engineer')$f$, tbl);

    execute format($f$create policy "%1$s_technician_select" on %1$I
      for select to authenticated using (get_my_role() = 'technician')$f$, tbl);
  end loop;
end;
$$;
