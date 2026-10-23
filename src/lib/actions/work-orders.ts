'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient as createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const WorkOrderSchema = z.object({
  wo_number: z.string().min(1, 'Número de OT requerido'),
  customer_id: z.string().uuid('Cliente requerido'),
  location_id: z.string().uuid().optional().or(z.literal('')),
  asset_id: z.string().uuid().optional().or(z.literal('')),
  wo_type: z.enum(['maintenance', 'installation', 'manufacture', 'fabrication']),
  status: z.enum(['draft', 'in_progress', 'completed', 'cancelled']).default('draft'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
})

export type WorkOrderFormState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createWorkOrder(
  _prev: WorkOrderFormState,
  formData: FormData
): Promise<WorkOrderFormState> {
  const parsed = WorkOrderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const { location_id, asset_id, start_date, end_date, ...rest } = parsed.data
  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('work_orders').insert({
    ...rest,
    location_id: location_id || null,
    asset_id: asset_id || null,
    start_date: start_date || null,
    end_date: end_date || null,
  })
  if (error) return { message: error.message }
  revalidatePath('/admin/work-orders')
  return { message: 'ok' }
}

export async function updateWorkOrder(
  id: string,
  _prev: WorkOrderFormState,
  formData: FormData
): Promise<WorkOrderFormState> {
  const parsed = WorkOrderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const { location_id, asset_id, start_date, end_date, ...rest } = parsed.data
  const supabase = (await createClient()) as DB
  const { error } = await supabase
    .from('work_orders')
    .update({
      ...rest,
      location_id: location_id || null,
      asset_id: asset_id || null,
      start_date: start_date || null,
      end_date: end_date || null,
    })
    .eq('id', id)
  if (error) return { message: error.message }
  revalidatePath('/admin/work-orders')
  revalidatePath(`/admin/work-orders/${id}`)
  return { message: 'ok' }
}
