-- Material traceability (ASME Section VIII Div 1 requirement)

create table material_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_material_categories_updated_at
  before update on material_categories
  for each row execute function set_updated_at();

-- -------------------------------------------------------

create table materials (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references material_categories(id),
  description      text not null,
  specification    text,                  -- e.g. "ASTM A516 Gr 70"
  unit_of_measure  text not null,
  current_stock    numeric(14, 3) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_materials_updated_at
  before update on materials
  for each row execute function set_updated_at();

create index idx_materials_category_id on materials(category_id);

-- -------------------------------------------------------

create table material_batches (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid not null references materials(id),
  batch_number  text not null,
  heat_number   text,                     -- trazabilidad de colada (ASME)
  supplier      text,
  received_date date,
  quantity      numeric(14, 3) not null,
  mtr_file_path text,                     -- Mill Test Report in Storage
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_material_batches_updated_at
  before update on material_batches
  for each row execute function set_updated_at();

create index idx_material_batches_material_id on material_batches(material_id);

-- -------------------------------------------------------

create table material_consumption (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references material_batches(id),
  work_order_id uuid,                     -- FK added after work_orders table exists
  quantity_used numeric(14, 3) not null,
  used_date     date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_material_consumption_updated_at
  before update on material_consumption
  for each row execute function set_updated_at();

create index idx_material_consumption_batch_id      on material_consumption(batch_id);
create index idx_material_consumption_work_order_id on material_consumption(work_order_id);
