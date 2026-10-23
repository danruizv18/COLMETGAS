import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, ChevronRight } from 'lucide-react'
import type { Customer } from '@/lib/database.types'

type CustomerWithCount = Customer & { locations: { id: string }[] }

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: rawCustomers } = await supabase
    .from('customers')
    .select('*, locations(id)')
    .order('name')
  const customers = (rawCustomers ?? []) as unknown as CustomerWithCount[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{customers?.length ?? 0} registrados</p>
        </div>
        <Link href="/admin/customers/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razón Social</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-center">Sedes</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((c) => (
              <TableRow key={c.id} className="group">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.tax_id}</Badge>
                </TableCell>
                <TableCell>{c.contact_name ?? '—'}</TableCell>
                <TableCell>{c.contact_phone ?? '—'}</TableCell>
                <TableCell className="text-center">
                  {c.locations.length}
                </TableCell>
                <TableCell>
                  <Link href={`/admin/customers/${c.id}`} className={buttonVariants({ size: 'icon', variant: 'ghost', className: 'opacity-0 group-hover:opacity-100' })}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!customers?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin clientes registrados.{' '}
                  <Link href="/admin/customers/new" className="underline">
                    Crear uno
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
