-- Asset inspections and supporting documents

create table asset_inspections (
  id               uuid primary key default gen_random_uuid(),
  asset_id         uuid not null references assets(id) on delete cascade,
  inspection_date  date not null,
  inspection_type  inspection_type_enum not null,
  technician_id    uuid references personnel(id),
  result           inspection_result_enum not null,
  next_due_date    date,
  certificate_number text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_asset_inspections_updated_at
  before update on asset_inspections
  for each row execute function set_updated_at();

create index idx_inspections_asset_id      on asset_inspections(asset_id);
create index idx_inspections_technician_id on asset_inspections(technician_id);
create index idx_inspections_next_due_date on asset_inspections(next_due_date);

-- -------------------------------------------------------

create table asset_documents (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  doc_type    text not null,
  file_path   text not null,              -- Supabase Storage path in "documents" bucket
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_asset_documents_updated_at
  before update on asset_documents
  for each row execute function set_updated_at();

create index idx_asset_documents_asset_id on asset_documents(asset_id);
