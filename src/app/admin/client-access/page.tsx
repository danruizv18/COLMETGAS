import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfile } from '@/lib/supabase/get-profile'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientAccessForm } from '@/components/auth/client-access-form'

export const dynamic = 'force-dynamic'

type ClientRow = {
  id: string
  full_name: string | null
  phone: string | null
  must_change_password: boolean
  temp_password_expires_at: string | null
  customers: { name: string } | null
}

export default async function ClientAccessPage() {
  const profile = await getProfile()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'engineer')) redirect('/admin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServiceClient()) as any
  const [{ data: rawCustomers }, { data: rawClients }, usersRes] = await Promise.all([
    supabase.from('customers').select('id, name, contact_email').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, phone, must_change_password, temp_password_expires_at, customers(name)')
      .eq('role', 'client')
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient() as any).auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const emailById = new Map<string, string>()
  for (const u of (usersRes?.data?.users ?? []) as { id: string; email?: string }[]) {
    if (u.email) emailById.set(u.id, u.email)
  }

  const customers = (rawCustomers ?? []) as { id: string; name: string; contact_email: string | null }[]
  const clients = (rawClients ?? []) as ClientRow[]
  const now = Date.now()

  function status(c: ClientRow) {
    if (!c.must_change_password) return { label: 'Activo', variant: 'secondary' as const }
    const expired =
      !!c.temp_password_expires_at && new Date(c.temp_password_expires_at).getTime() < now
    return expired
      ? { label: 'Temporal vencido', variant: 'destructive' as const }
      : { label: 'Temporal vigente', variant: 'default' as const }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acceso de Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Genere un usuario y contraseña temporales (1 hora). El cliente deberá actualizar sus datos
          personales en su primer ingreso.
        </p>
      </div>

      <ClientAccessForm customers={customers} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => {
              const s = status(c)
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{emailById.get(c.id) ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.customers?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {!clients.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aún no hay accesos de clientes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
