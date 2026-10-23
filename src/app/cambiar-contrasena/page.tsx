import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { FirstLoginForm } from '@/components/auth/first-login-form'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = (await createServiceClient()) as any
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, must_change_password, temp_password_expires_at')
    .eq('id', user.id)
    .single()

  // Ya completó sus datos (o no es un acceso temporal): nada que hacer aquí.
  if (!profile?.must_change_password) redirect('/admin')

  const expired =
    !!profile.temp_password_expires_at &&
    new Date(profile.temp_password_expires_at).getTime() < Date.now()

  const email = user.email ?? ''
  const defaultName = profile.full_name && profile.full_name !== email ? profile.full_name : ''

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">COLMETGAS</h1>
          <p className="text-xs text-muted-foreground">INGENIERÍA SAS</p>
        </div>

        {expired ? (
          <div className="space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
            <h2 className="text-base font-semibold">Credenciales vencidas</h2>
            <p className="text-sm text-muted-foreground">
              Su acceso temporal (válido por 1 hora) ya venció. Comuníquese con COLMETGAS para que
              le generen uno nuevo.
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Para continuar debe actualizar sus datos personales y definir su propia contraseña.
              La próxima vez ingresará con ella.
            </p>
            <FirstLoginForm email={email} defaultName={defaultName} />
          </>
        )}
      </div>
    </div>
  )
}
