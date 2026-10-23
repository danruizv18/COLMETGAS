-- Work orders and equipment / calibration tracking

create table work_orders (
  id          uuid primary key default gen_random_uuid(),
  wo_number   text not null unique,
  customer_id uuid not null references customers(id),
  location_id uuid references locations(id),
  asset_id    uuid references assets(id),
  wo_type     wo_type_enum not null,
  status      wo_status_enum not null default 'draft',
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_work_orders_updated_at
  before update on work_orders
  for each row execute function set_updated_at();

create index idx_work_orders_customer_id on work_orders(customer_id);
create index idx_work_orders_asset_id    on work_orders(asset_id);
create index idx_work_orders_status      on work_orders(status);

-- Add deferred FK from material_consumption → work_orders
alter table material_consumption
  add constraint fk_material_consumption_work_order
  foreign key (work_order_id) references work_orders(id);

-- -------------------------------------------------------

create table equipment (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  serial_number         text,
  equipment_type        text,
  last_calibration_date date,
  next_calibration_due  date,
  status                equipment_status_enum not null default 'active',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_equipment_updated_at
  before update on equipment
  for each row execute function set_updated_at();

create index idx_equipment_status              on equipment(status);
create index idx_equipment_next_calibration_due on equipment(next_calibration_due);
