'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchInspectionNotification } from '@/lib/notifications/service'

const InspectionSchema = z.object({
  asset_id: z.string().uuid('Activo requerido'),
  inspection_date: z.string().min(1, 'Fecha requerida'),
  inspection_type: z.enum(['visual', 'ultrasound', 'hydrostatic', 'full_maintenance']),
  technician_id: z.string().uuid().optional().or(z.literal('')),
  result: z.enum(['pass', 'fail', 'conditional']),
  next_due_date: z.string().optional(),
  certificate_number: z.string().optional(),
  notes: z.string().optional(),
})

export type InspectionFormState = {
  errors?: Record<string, string[]>
  message?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function createInspection(
  _prev: InspectionFormState,
  formData: FormData,
): Promise<InspectionFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = InspectionSchema.safeParse(raw)

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { technician_id, next_due_date, ...rest } = parsed.data
  const supabase = (await createServiceClient()) as DB

  const { data: inspection, error } = await supabase
    .from('asset_inspections')
    .insert({
      ...rest,
      technician_id: technician_id || null,
      next_due_date: next_due_date || null,
    })
    .select('id')
    .single()

  if (error) return { message: error.message }

  // Fire-and-forget — a notification failure must never crash the inspection save
  dispatchInspectionNotification({
    inspectionId: inspection.id,
    assetId: rest.asset_id,
    result: rest.result,
    inspectionDate: rest.inspection_date,
    inspectionType: rest.inspection_type,
    nextDueDate: next_due_date ?? null,
  }).catch((err: unknown) => console.error('[notification] unhandled dispatch error:', err))

  revalidatePath(`/admin/assets/${rest.asset_id}`)
  return { message: 'ok' }
}
