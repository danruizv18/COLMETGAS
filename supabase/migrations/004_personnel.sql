-- Personnel and certifications

create table personnel (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  role        personnel_role_enum not null,
  national_id text not null unique,
  hire_date   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_personnel_updated_at
  before update on personnel
  for each row execute function set_updated_at();

-- -------------------------------------------------------

create table personnel_certifications (
  id                   uuid primary key default gen_random_uuid(),
  personnel_id         uuid not null references personnel(id) on delete cascade,
  certification_name   text not null,
  issuing_body         text,
  issued_date          date,
  expires_date         date,
  certificate_file_path text,              -- Supabase Storage path
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_personnel_certifications_updated_at
  before update on personnel_certifications
  for each row execute function set_updated_at();

create index idx_personnel_certifications_personnel_id on personnel_certifications(personnel_id);
create index idx_personnel_certifications_expires_date on personnel_certifications(expires_date);
