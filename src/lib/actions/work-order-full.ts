'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const BaseSchema = z.object({
  wo_number: z.string().trim().min(1, 'Número de OT requerido'),
  customer_id: z.string().uuid('Cliente requerido'),
  wo_type: z.enum(['maintenance', 'installation', 'manufacture', 'fabrication']),
  status: z.enum(['draft', 'in_progress', 'completed', 'cancelled']).default('draft'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  incident_report: z.string().optional(),
})

const PayloadSchema = z.object({
  materials: z.array(
    z.object({
      description: z.string().trim().min(1, 'Cada material necesita descripción'),
      unit: z.string().trim().default(''),
      quantity: z.coerce.number().min(0, 'Cantidad inválida'),
      unit_price: z.coerce.number().min(0, 'Precio inválido'),
    }),
  ),
  expenses: z.array(
    z.object({
      description: z.string().trim().min(1, 'Cada viático necesita descripción'),
      amount: z.coerce.number().min(0, 'Valor de viático inválido'),
    }),
  ),
  workers: z.array(
    z.object({
      worker_name: z.string().trim().min(1, 'Cada trabajador necesita nombre'),
      personnel_id: z.string().uuid().nullable().default(null),
      days_worked: z.coerce.number().min(0, 'Días inválidos'),
      daily_rate: z.coerce.number().min(0, 'Pago por día inválido'),
    }),
  ),
})

export type WorkOrderFullState = {
  errors?: Record<string, string[]>
  message?: string
}

async function save(id: string | null, formData: FormData): Promise<WorkOrderFullState> {
  const caller = await getProfile()
  if (!caller || (caller.role !== 'admin' && caller.role !== 'engineer')) {
    return { message: 'No tiene permisos para crear o editar órdenes de trabajo.' }
  }

  const { payload: rawPayload, ...rest } = Object.fromEntries(formData) as Record<string, string>

  const base = BaseSchema.safeParse(rest)
  if (!base.success) return { errors: base.error.flatten().fieldErrors }

  let payloadJson: unknown
  try {
    payloadJson = JSON.parse(rawPayload || '{}')
  } catch {
    return { message: 'Datos de materiales/personal inválidos.' }
  }
  const payload = PayloadSchema.safeParse({
    materials: [],
    expenses: [],
    workers: [],
    ...(payloadJson as object),
  })
  if (!payload.success) {
    return { message: payload.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const { start_date, end_date, notes, incident_report, ...fields } = base.data
  const row = {
    ...fields,
    start_date: start_date || null,
    end_date: end_date || null,
    notes: notes || null,
    incident_report: incident_report || null,
  }

  const supabase = (await createClient()) as DB
  let woId = id
  const creating = id === null

  if (creating) {
    const { data, error } = await supabase.from('work_orders').insert(row).select('id').single()
    if (error) return { message: error.message }
    woId = data.id as string
  } else {
    const { error } = await supabase.from('work_orders').update(row).eq('id', id)
    if (error) return { message: error.message }
    // Los renglones se reemplazan completos con lo que viene del formulario.
    await Promise.all([
      supabase.from('work_order_materials').delete().eq('work_order_id', id),
      supabase.from('work_order_expenses').delete().eq('work_order_id', id),
      supabase.from('work_order_workers').delete().eq('work_order_id', id),
    ])
  }

  const { materials, expenses, workers } = payload.data
  const inserts: PromiseLike<{ error: { message: string } | null }>[] = []
  if (materials.length)
    inserts.push(
      supabase
        .from('work_order_materials')
        .insert(materials.map((m) => ({ ...m, unit: m.unit || null, work_order_id: woId }))),
    )
  if (expenses.length)
    inserts.push(
      supabase.from('work_order_expenses').insert(expenses.map((e) => ({ ...e, work_order_id: woId }))),
    )
  if (workers.length)
    inserts.push(
      supabase.from('work_order_workers').insert(workers.map((w) => ({ ...w, work_order_id: woId }))),
    )

  const results = await Promise.all(inserts)
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    // Si estábamos creando, no dejar una OT a medias.
    if (creating) await supabase.from('work_orders').delete().eq('id', woId)
    return { message: failed.error.message }
  }

  revalidatePath('/admin/wo-materials')
  revalidatePath('/admin/wo-details')
  revalidatePath('/admin/work-orders')
  revalidatePath(`/admin/work-orders/${woId}`)
  return { message: 'ok' }
}

export async function createWorkOrderFull(
  _prev: WorkOrderFullState,
  formData: FormData,
): Promise<WorkOrderFullState> {
  return save(null, formData)
}

export async function updateWorkOrderFull(
  id: string,
  _prev: WorkOrderFullState,
  formData: FormData,
): Promise<WorkOrderFullState> {
  return save(id, formData)
}
