'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient as createClient } from '@/lib/supabase/server'

const AssetSchema = z.object({
  asset_type: z.enum(['tank_stationary', 'tank_transport', 'gas_network', 'metal_structure']),
  tag: z.string().min(1, 'Tag requerido'),
  customer_id: z.string().uuid('Cliente requerido'),
  location_id: z.string().uuid().optional().or(z.literal('')),
  serial_number: z.string().optional(),
  install_date: z.string().optional(),
  capacity_value: z.string().optional(),
  capacity_unit: z.string().optional(),
  manufacturer: z.string().optional(),
  manufacture_date: z.string().optional(),
  status: z.enum(['active', 'out_of_service', 'decommissioned']).default('active'),
  notes: z.string().optional(),
})

export type AssetFormState = {
  errors?: Record<string, string[]>
  message?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function createAsset(
  _prev: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = AssetSchema.safeParse(raw)

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { capacity_value, location_id, ...rest } = parsed.data
  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('assets').insert({
    ...rest,
    location_id: location_id || null,
    capacity_value: capacity_value ? parseFloat(capacity_value) : null,
  })

  if (error) return { message: error.message }

  revalidatePath('/admin/assets')
  return { message: 'ok' }
}

export async function updateAsset(
  id: string,
  _prev: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = AssetSchema.safeParse(raw)

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { capacity_value, location_id, ...rest } = parsed.data
  const supabase = (await createClient()) as DB
  const { error } = await supabase
    .from('assets')
    .update({
      ...rest,
      location_id: location_id || null,
      capacity_value: capacity_value ? parseFloat(capacity_value) : null,
    })
    .eq('id', id)

  if (error) return { message: error.message }

  revalidatePath('/admin/assets')
  revalidatePath(`/admin/assets/${id}`)
  return { message: 'ok' }
}
