import { notFound, redirect } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
import { WorkOrderFullForm } from '@/components/work-orders/work-order-full-form'
import { updateWorkOrderFull } from '@/lib/actions/work-order-full'
import type { Customer, WorkOrder } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditWoMaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getProfile()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'engineer')) redirect('/admin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const [{ data: wo }, { data: customers }, { data: personnel }, { data: mats }, { data: exps }, { data: works }] =
    await Promise.all([
      supabase.from('work_orders').select('*').eq('id', id).single(),
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('personnel').select('id, full_name').order('full_name'),
      supabase.from('work_order_materials').select('*').eq('work_order_id', id).order('created_at'),
      supabase.from('work_order_expenses').select('*').eq('work_order_id', id).order('created_at'),
      supabase.from('work_order_workers').select('*').eq('work_order_id', id).order('created_at'),
    ])

  if (!wo) notFound()

  const initial = {
    materials: (mats ?? []).map((m: { description: string; unit: string | null; quantity: number; unit_price: number }) => ({
      description: m.description,
      unit: m.unit ?? '',
      quantity: String(m.quantity),
      unit_price: String(m.unit_price),
    })),
    expenses: (exps ?? []).map((e: { description: string; amount: number }) => ({
      description: e.description,
      amount: String(e.amount),
    })),
    workers: (works ?? []).map((w: { worker_name: string; personnel_id: string | null; days_worked: number; daily_rate: number }) => ({
      worker_name: w.worker_name,
      personnel_id: w.personnel_id,
      days_worked: String(w.days_worked),
      daily_rate: String(w.daily_rate),
    })),
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar {(wo as WorkOrder).wo_number}</h1>
        <p className="text-sm text-muted-foreground">
          Agregue o edite materiales, viáticos, personal y reporte
        </p>
      </div>
      <WorkOrderFullForm
        action={updateWorkOrderFull.bind(null, id)}
        defaultValues={wo}
        customers={(customers ?? []) as Pick<Customer, 'id' | 'name'>[]}
        personnel={(personnel ?? []) as { id: string; full_name: string }[]}
        initial={initial}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
