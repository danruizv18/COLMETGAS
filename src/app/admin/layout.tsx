import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
import { AdminSidebar } from '@/components/admin/sidebar'
import { enforcePasswordChange } from '@/lib/auth/password-gate'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check authentication first — if no session, send to login.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile()

  // Authenticated but no profile row: user signed up before migration 012 ran
  // (signup trigger hadn't been created yet). Do NOT redirect to /login — that
  // would loop with the middleware. Show a clear message instead.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm text-center space-y-2">
          <h1 className="text-base font-semibold">Perfil no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Su cuenta no tiene un perfil asignado. Ejecute el SQL de bootstrap en el editor de Supabase y recargue la página.
          </p>
        </div>
      </div>
    )
  }

  // Cliente con credenciales temporales: debe actualizar sus datos antes de continuar.
  await enforcePasswordChange(profile.id)

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar role={profile.role} displayName={profile.full_name ?? undefined} />
      <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
        {children}
      </main>
    </div>
  )
}
