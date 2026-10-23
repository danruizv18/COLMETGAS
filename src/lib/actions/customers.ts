'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient as createClient } from '@/lib/supabase/server'

const CustomerSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  tax_id: z.string().min(5, 'NIT requerido'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
})

export type CustomerFormState = {
  errors?: Record<string, string[]>
  message?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = CustomerSchema.safeParse(raw)

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = (await createClient()) as DB
  const { error } = await supabase.from('customers').insert({
    ...parsed.data,
    contact_email: parsed.data.contact_email || null,
  })

  if (error) {
    return { message: error.message }
  }

  revalidatePath('/admin/customers')
  return { message: 'ok' }
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const raw = Object.fromEntries(formData)
  const parsed = CustomerSchema.safeParse(raw)

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = (await createClient()) as DB
  const { error } = await supabase
    .from('customers')
    .update({ ...parsed.data, contact_email: parsed.data.contact_email || null })
    .eq('id', id)

  if (error) {
    return { message: error.message }
  }

  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${id}`)
  return { message: 'ok' }
}

export async function deleteCustomer(id: string) {
  const supabase = (await createClient()) as DB
  await supabase.from('customers').delete().eq('id', id)
  revalidatePath('/admin/customers')
}
