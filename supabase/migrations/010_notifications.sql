-- Notification channel and status enums
create type notification_channel_enum as enum ('email', 'sms', 'whatsapp');
create type notification_status_enum  as enum ('pending', 'sent', 'failed');

-- Audit log of every notification attempt
create table notifications (
  id               uuid primary key default gen_random_uuid(),
  inspection_id    uuid not null references asset_inspections(id) on delete cascade,
  customer_id      uuid not null references customers(id),
  recipient_email  text not null,
  channel          notification_channel_enum not null default 'email',
  subject          text not null,
  body             text not null,
  status           notification_status_enum not null default 'pending',
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_notifications_inspection_id on notifications(inspection_id);
create index idx_notifications_status        on notifications(status);
create index idx_notifications_created_at    on notifications(created_at desc);

-- RLS — same permissive pattern as other tables (tighten later)
alter table notifications enable row level security;

create policy "authenticated_full_access" on notifications
  for all to authenticated using (true) with check (true);
