-- Core tables: customers, locations, assets

create table customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tax_id        text not null unique,       -- NIT colombiano
  contact_name  text,
  contact_phone text,
  contact_email text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on column customers.tax_id is 'NIT (Número de Identificación Tributaria) del cliente';

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- -------------------------------------------------------

create table locations (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name        text not null,
  address     text,
  city        text,
  department  text,
  gps_lat     numeric(10, 7),
  gps_lng     numeric(10, 7),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

create index idx_locations_customer_id on locations(customer_id);

-- -------------------------------------------------------

create table assets (
  id               uuid primary key default gen_random_uuid(),
  asset_type       asset_type_enum not null,
  serial_number    text,
  tag              text not null,
  customer_id      uuid not null references customers(id),
  location_id      uuid references locations(id),
  install_date     date,
  capacity_value   numeric(12, 3),
  capacity_unit    text,                    -- e.g. "galones", "m3", "kg"
  manufacturer     text,
  manufacture_date date,
  status           asset_status_enum not null default 'active',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

create index idx_assets_customer_id  on assets(customer_id);
create index idx_assets_location_id  on assets(location_id);
create index idx_assets_status       on assets(status);
create index idx_assets_asset_type   on assets(asset_type);
