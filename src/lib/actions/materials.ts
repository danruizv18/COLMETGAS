'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { assertCanConsume } from '@/lib/materials/stock'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

// ─── Categories ──────────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
})

export type CategoryFormState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const parsed = CategorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('material_categories').insert(parsed.data)
  if (error) return { message: error.message }
  revalidatePath('/admin/materials')
  return { message: 'ok' }
}

// ─── Materials ────────────────────────────────────────────────────────────────

const MaterialSchema = z.object({
  category_id: z.string().uuid('Categoría requerida'),
  description: z.string().min(1, 'Descripción requerida'),
  specification: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unidad de medida requerida'),
})

export type MaterialFormState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createMaterial(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = MaterialSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('materials').insert({
    ...parsed.data,
    specification: parsed.data.specification || null,
    current_stock: 0,
  })
  if (error) return { message: error.message }
  revalidatePath('/admin/materials')
  return { message: 'ok' }
}

export async function updateMaterial(
  id: string,
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = MaterialSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
  const supabase = (await createClient()) as DB
  const { error } = await supabase
    .from('materials')
    .update({ ...parsed.data, specification: parsed.data.specification || null })
    .eq('id', id)
  if (error) return { message: error.message }
  revalidatePath('/admin/materials')
  revalidatePath(`/admin/materials/${id}`)
  return { message: 'ok' }
}

// ─── Batches ──────────────────────────────────────────────────────────────────

const BatchSchema = z.object({
  material_id: z.string().uuid('Material requerido'),
  batch_number: z.string().min(1, 'Número de lote requerido'),
  heat_number: z.string().optional(),
  supplier: z.string().optional(),
  received_date: z.string().optional(),
  quantity: z.string().min(1, 'Cantidad requerida'),
  mtr_file_path: z.string().optional(),
  notes: z.string().optional(),
})

export type BatchFormState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createBatch(
  _prev: BatchFormState,
  formData: FormData
): Promise<BatchFormState> {
  const parsed = BatchSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const qty = parseFloat(parsed.data.quantity)
  if (isNaN(qty) || qty <= 0) return { errors: { quantity: ['Cantidad debe ser mayor a cero'] } }

  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('material_batches').insert({
    material_id: parsed.data.material_id,
    batch_number: parsed.data.batch_number,
    heat_number: parsed.data.heat_number || null,
    supplier: parsed.data.supplier || null,
    received_date: parsed.data.received_date || null,
    quantity: qty,
    mtr_file_path: parsed.data.mtr_file_path || null,
    notes: parsed.data.notes || null,
  })
  if (error) return { message: error.message }
  revalidatePath(`/admin/materials/${parsed.data.material_id}`)
  return { message: 'ok' }
}

// ─── Consumption ──────────────────────────────────────────────────────────────

const ConsumptionSchema = z.object({
  batch_id: z.string().uuid('Lote requerido'),
  quantity_used: z.string().min(1, 'Cantidad requerida'),
  used_date: z.string().min(1, 'Fecha requerida'),
})

export type ConsumptionFormState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function recordConsumption(
  workOrderId: string,
  _prev: ConsumptionFormState,
  formData: FormData
): Promise<ConsumptionFormState> {
  const parsed = ConsumptionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const qty = parseFloat(parsed.data.quantity_used)
  if (isNaN(qty) || qty <= 0) return { errors: { quantity_used: ['Cantidad debe ser mayor a cero'] } }

  const supabase = (await createClient()) as DB

  // App-level pre-check (DB trigger is the authoritative guard)
  const { data: batchStock } = await supabase
    .from('v_batch_stock')
    .select('available')
    .eq('batch_id', parsed.data.batch_id)
    .single()

  if (batchStock) {
    try {
      assertCanConsume(qty, Number(batchStock.available))
    } catch (e) {
      return { message: (e as Error).message }
    }
  }

  const { error } = await supabase.from('material_consumption').insert({
    batch_id: parsed.data.batch_id,
    work_order_id: workOrderId,
    quantity_used: qty,
    used_date: parsed.data.used_date,
  })

  if (error) {
    // Surface the DB trigger's Spanish error message directly
    return { message: error.message }
  }

  revalidatePath(`/admin/work-orders/${workOrderId}`)
  revalidatePath('/admin/traceability')
  return { message: 'ok' }
}
