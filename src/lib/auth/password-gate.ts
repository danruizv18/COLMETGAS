import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

// Si el usuario entró con credenciales temporales (cliente nuevo) lo manda a
// completar sus datos personales antes de usar la plataforma.
export async function enforcePasswordChange(userId: string): Promise<void> {
  const supabase = (await createServiceClient()) as DB
  const { data } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .single()

  if (data?.must_change_password) redirect('/cambiar-contrasena')
}
