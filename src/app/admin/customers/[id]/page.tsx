import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, MapPin, Package } from 'lucide-react'
import type { Customer, Location, Asset } from '@/lib/database.types'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawCustomer } = await supabase.from('customers').select('*').eq('id', id).single()
  const [{ data: rawLocations }, { data: rawAssets }] = await Promise.all([
    supabase.from('locations').select('*').eq('customer_id', id).order('name'),
    supabase.from('assets').select('*').eq('customer_id', id).order('tag'),
  ])
  const customer = rawCustomer as Customer | null
  const locations = (rawLocations ?? []) as Location[]
  const assets = (rawAssets ?? []) as Asset[]

  if (!customer) notFound()

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    out_of_service: 'bg-amber-100 text-amber-800',
    decommissioned: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">NIT {customer.tax_id}</p>
        </div>
        <Link href={`/admin/customers/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {customer.contact_name && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="font-medium">{customer.contact_name}</p>
              {customer.contact_phone && (
                <p className="text-sm text-muted-foreground">{customer.contact_phone}</p>
              )}
              {customer.contact_email && (
                <p className="text-sm text-muted-foreground">{customer.contact_email}</p>
              )}
            </CardContent>
          </Card>
        )}
        {customer.notes && (
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm">{customer.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Sedes ({locations?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {locations?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((loc) => (
                <div key={loc.id} className="rounded-md border p-3">
                  <p className="font-medium text-sm">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {loc.city}, {loc.department}
                  </p>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground">{loc.address}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin sedes registradas</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Activos ({assets?.length ?? 0})</CardTitle>
          </div>
          <Link href={`/admin/assets?customer=${id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>Ver todos</Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número de Serie</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets?.slice(0, 10).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/admin/assets/${a.id}`} className="font-mono text-sm hover:underline">
                      {a.tag}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{a.asset_type.replace('_', ' ')}</TableCell>
                  <TableCell className="font-mono text-xs">{a.serial_number ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[a.status]}`}>
                      {a.status === 'active' ? 'Activo' : a.status === 'out_of_service' ? 'F. Servicio' : 'Dado de baja'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!assets?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Sin activos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
