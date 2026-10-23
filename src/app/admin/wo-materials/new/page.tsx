import { redirect } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
import { WorkOrderFullForm } from '@/components/work-orders/work-order-full-form'
import { createWorkOrderFull } from '@/lib/actions/work-order-full'
import type { Customer } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function NewWoMaterialsPage() {
  const profile = await getProfile()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'engineer')) redirect('/admin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const [{ data: customers }, { data: personnel }] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('personnel').select('id, full_name').order('full_name'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva Orden de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Registre la OT con sus materiales, viáticos, personal y reporte
        </p>
      </div>
      <WorkOrderFullForm
        action={createWorkOrderFull}
        customers={(customers ?? []) as Pick<Customer, 'id' | 'name'>[]}
        personnel={(personnel ?? []) as { id: string; full_name: string }[]}
      />
    </div>
  )
}
