'use server'

import { randomInt } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfile } from '@/lib/supabase/get-profile'
import { sendEmail } from '@/lib/notifications/gmail'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const TEMP_HOURS = 1
// Sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de transcribir.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 12): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

const Schema = z.object({
  customer_id: z.string().uuid('Seleccione un cliente'),
  email: z.string().trim().toLowerCase().email('Correo inválido'),
})

export type ClientAccessState = {
  error?: string
  success?: {
    email: string
    password: string
    expiresAt: string
    emailed: boolean
  }
}

async function findUserIdByEmail(admin: DB, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) return null
    const found = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 1000) return null
  }
  return null
}

async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Crea (o regenera) el acceso de un cliente con usuario/contraseña temporales de 1 hora.
export async function createClientAccess(
  _prev: ClientAccessState,
  formData: FormData,
): Promise<ClientAccessState> {
  const caller = await getProfile()
  if (!caller || (caller.role !== 'admin' && caller.role !== 'engineer')) {
    return { error: 'No tiene permisos para crear accesos de clientes.' }
  }

  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const { email, customer_id } = parsed.data

  const admin = createAdminClient() as DB
  const tempPassword = generateTempPassword()
  const expiresAt = new Date(Date.now() + TEMP_HOURS * 60 * 60 * 1000).toISOString()

  let userId: string
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: email },
  })

  if (createError || !created?.user) {
    // ¿Ya existía? Solo se permite regenerar si es un usuario cliente.
    const existingId = await findUserIdByEmail(admin, email)
    if (!existingId) return { error: createError?.message ?? 'No se pudo crear el usuario.' }

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', existingId)
      .single()
    if (existingProfile && existingProfile.role !== 'client') {
      return { error: 'Ese correo pertenece a un usuario interno de COLMETGAS.' }
    }

    const { error: pwError } = await admin.auth.admin.updateUserById(existingId, {
      password: tempPassword,
    })
    if (pwError) return { error: pwError.message }
    userId = existingId
  } else {
    userId = created.user.id
  }

  const profileFields = {
    role: 'client',
    customer_id,
    must_change_password: true,
    temp_password_expires_at: expiresAt,
  }

  const { data: updated, error: profileError } = await admin
    .from('profiles')
    .update(profileFields)
    .eq('id', userId)
    .select('id')
  if (profileError) return { error: profileError.message }

  if (!updated?.length) {
    const { error: insertError } = await admin
      .from('profiles')
      .insert({ id: userId, full_name: email, ...profileFields })
    if (insertError) return { error: insertError.message }
  }

  // Envío por correo (mejor esfuerzo): solo si hay credenciales SMTP configuradas.
  let emailed = false
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const origin = await getOrigin()
      await sendEmail({
        to: email,
        subject: 'COLMETGAS – Acceso temporal a la plataforma',
        body: [
          'Estimado cliente,',
          '',
          'COLMETGAS INGENIERÍA SAS le ha habilitado el acceso a la plataforma.',
          '',
          `  Usuario:    ${email}`,
          `  Contraseña: ${tempPassword}`,
          '',
          `Estas credenciales son temporales y vencen en ${TEMP_HOURS} hora.`,
          'Al ingresar deberá actualizar sus datos personales y definir su propia contraseña.',
          '',
          `Ingrese en: ${origin}/login`,
        ].join('\n'),
      })
      emailed = true
    } catch (e) {
      console.error('[client-access] no se pudo enviar el correo:', e)
    }
  }

  revalidatePath('/admin/client-access')
  return { success: { email, password: tempPassword, expiresAt, emailed } }
}
