import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { WorkOrderForm } from '@/components/work-orders/work-order-form'
import { updateWorkOrder } from '@/lib/actions/work-orders'
import type { WorkOrder, Customer } from '@/lib/database.types'

export default async function EditWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: rawWO }, { data: rawCustomers }] = await Promise.all([
    supabase.from('work_orders').select('*').eq('id', id).single(),
    supabase.from('customers').select('id, name').order('name'),
  ])

  if (!rawWO) notFound()

  const wo = rawWO as WorkOrder
  const customers = (rawCustomers ?? []) as Pick<Customer, 'id' | 'name'>[]
  const action = updateWorkOrder.bind(null, id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Orden de Trabajo</h1>
        <p className="text-sm text-muted-foreground font-mono">{wo.wo_number}</p>
      </div>
      <WorkOrderForm action={action} defaultValues={wo} customers={customers} submitLabel="Actualizar OT" />
    </div>
  )
}
