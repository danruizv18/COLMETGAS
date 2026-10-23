// Admin-only: user management (view all profiles, change roles, assign customer for client role).
// NOTE: This page is UX-gated (only admins see the sidebar link) but the actual
// security is that all writes here use the service-role client which intentionally
// bypasses RLS. Non-admin users who navigate here directly will see an error because
// the layout's getProfile() check and the redirect below will catch them.

import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/get-profile'
import { createServiceClient } from '@/lib/supabase/server'
import { updateUserRole } from '@/lib/actions/users'
import type { UserRole } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const roleLabel: Record<UserRole, string> = {
  admin:      'Administrador',
  engineer:   'Ingeniero',
  technician: 'Técnico',
  client:     'Cliente',
}

const roleBadgeClass: Record<UserRole, string> = {
  admin:      'bg-red-100 text-red-700',
  engineer:   'bg-blue-100 text-blue-700',
  technician: 'bg-amber-100 text-amber-700',
  client:     'bg-green-100 text-green-700',
}

export default async function UsersPage() {
  const profile = await getProfile()

  // Hard guard — only admins may access this page.
  if (!profile || profile.role !== 'admin') {
    redirect('/admin')
  }

  const supabase = await createServiceClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*, customers(name)')
    .order('created_at', { ascending: true }) as unknown as {
      data: (import('@/lib/database.types').Profile & { customers: { name: string } | null })[] | null
      error: import('@supabase/supabase-js').PostgrestError | null
    }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-destructive">Error al cargar usuarios: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de roles y acceso. Solo visible para administradores.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol actual</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente asociado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cambiar rol</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {profiles?.map((p) => {
              return (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass[p.role]}`}>
                      {roleLabel[p.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.customers?.name ?? (p.role === 'client' ? 'Sin asignar' : '—')}
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateUserRole}>
                      <input type="hidden" name="userId" value={p.id} />
                      <div className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={p.role}
                          className="rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="admin">Administrador</option>
                          <option value="engineer">Ingeniero</option>
                          <option value="technician">Técnico</option>
                          <option value="client">Cliente</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
