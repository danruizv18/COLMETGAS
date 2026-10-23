-- Materials stock: derived views (zero drift) + over-consumption guard
-- The current_stock column on materials is kept but no longer written by the app.
-- These views are the authoritative source for all stock queries.

-- Per-batch: received minus all consumption = available
create view v_batch_stock as
select
  mb.id                                          as batch_id,
  mb.material_id,
  mb.quantity                                    as received,
  coalesce(sum(mc.quantity_used), 0)             as consumed,
  mb.quantity - coalesce(sum(mc.quantity_used), 0) as available
from material_batches mb
left join material_consumption mc on mc.batch_id = mb.id
group by mb.id, mb.quantity, mb.material_id;

-- Per-material: sum of all batch available quantities
create view v_material_stock as
select
  m.id                              as material_id,
  coalesce(sum(bs.available), 0)    as total_stock
from materials m
left join v_batch_stock bs on bs.material_id = m.id
group by m.id;

-- Prevent over-consumption at the database level.
-- Runs BEFORE INSERT and BEFORE UPDATE on material_consumption.
-- For UPDATE, the current row is excluded from the consumed sum so the new
-- quantity is checked against the remaining capacity of the batch.
create or replace function fn_check_batch_availability()
returns trigger language plpgsql as $$
declare
  avail numeric;
begin
  select mb.quantity - coalesce(sum(mc.quantity_used), 0)
  into   avail
  from   material_batches mb
  left join material_consumption mc
         on mc.batch_id = mb.id
        and (tg_op = 'INSERT' or mc.id != new.id)
  where  mb.id = new.batch_id
  group  by mb.quantity;

  if avail is null then
    raise exception 'Lote no encontrado: %', new.batch_id;
  end if;

  if new.quantity_used > avail then
    raise exception 'Stock insuficiente en lote. Disponible: %, Solicitado: %',
      avail, new.quantity_used;
  end if;

  return new;
end;
$$;

create trigger trg_check_batch_availability
  before insert or update on material_consumption
  for each row execute function fn_check_batch_availability();
