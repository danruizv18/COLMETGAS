'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const Schema = z
  .object({
    full_name: z.string().trim().min(3, 'Ingrese su nombre completo'),
    phone: z.string().trim().min(7, 'Ingrese un teléfono válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

export type FirstLoginState = { error?: string }

// El cliente con credenciales temporales completa sus datos y define su contraseña personal.
export async function completeFirstLogin(
  _prev: FirstLoginState,
  formData: FormData,
): Promise<FirstLoginState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = (await createServiceClient()) as DB
  const { data: profile } = await service
    .from('profiles')
    .select('must_change_password, temp_password_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile?.must_change_password) redirect('/admin')

  if (
    profile.temp_password_expires_at &&
    new Date(profile.temp_password_expires_at).getTime() < Date.now()
  ) {
    return { error: 'Las credenciales temporales vencieron. Solicite un nuevo acceso a COLMETGAS.' }
  }

  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { error: pwError } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (pwError) return { error: pwError.message }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      must_change_password: false,
      temp_password_expires_at: null,
    })
    .eq('id', user.id)
  if (profileError) return { error: profileError.message }

  redirect('/admin')
}
