import { createServiceClient as createClient } from '@/lib/supabase/server'
import { WorkOrderForm } from '@/components/work-orders/work-order-form'
import { createWorkOrder } from '@/lib/actions/work-orders'
import type { Customer } from '@/lib/database.types'

export default async function NewWorkOrderPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('customers').select('id, name').order('name')
  const customers = (data ?? []) as Pick<Customer, 'id' | 'name'>[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva Orden de Trabajo</h1>
        <p className="text-sm text-muted-foreground">Registra una nueva OT en el sistema</p>
      </div>
      <WorkOrderForm action={createWorkOrder} customers={customers} />
    </div>
  )
}
