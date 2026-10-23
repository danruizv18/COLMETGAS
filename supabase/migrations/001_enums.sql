-- Postgres enums for all domain discriminators

create type asset_type_enum as enum (
  'tank_stationary',
  'tank_transport',
  'gas_network',
  'metal_structure'
);

create type asset_status_enum as enum (
  'active',
  'out_of_service',
  'decommissioned'
);

create type inspection_type_enum as enum (
  'visual',
  'ultrasound',
  'hydrostatic',
  'full_maintenance'
);

create type inspection_result_enum as enum (
  'pass',
  'fail',
  'conditional'
);

create type wo_type_enum as enum (
  'maintenance',
  'installation',
  'manufacture',
  'fabrication'
);

create type wo_status_enum as enum (
  'draft',
  'in_progress',
  'completed',
  'cancelled'
);

create type personnel_role_enum as enum (
  'welder',
  'technician',
  'engineer',
  'supervisor'
);

create type equipment_status_enum as enum (
  'active',
  'out_of_service',
  'under_calibration'
);
