import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/server'
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
import type { Asset, AssetType, AssetStatus } from '@/lib/database.types'
import { buttonVariants } from '@/components/ui/button'
import { CustomerFilter } from '@/components/assets/customer-filter'

type AssetRow = Asset & {
  customers: { name: string } | null
  locations: { name: string } | null
}

export const dynamic = 'force-dynamic'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  tank_stationary: 'Tanque Est.',
  tank_transport: 'Tanque Trans.',
  gas_network: 'Red Gas',
  metal_structure: 'Estructura',
}

const STATUS_VARIANT: Record<AssetStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  out_of_service: 'secondary',
  decommissioned: 'outline',
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Activo',
  out_of_service: 'F. Servicio',
  decommissioned: 'Dado de baja',
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; customer?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('assets')
    .select('*, customers(name), locations(name)')
    .order('tag')

  if (filters.type) query = query.eq('asset_type', filters.type as AssetType)
  if (filters.status) query = query.eq('status', filters.status as AssetStatus)
  if (filters.customer) query = query.eq('customer_id', filters.customer)

  const { data: rawAssets } = await query
  const assets = (rawAssets ?? []) as unknown as AssetRow[]
  const { data: rawCustomers } = await supabase.from('customers').select('id, name').order('name')
  const customers = (rawCustomers ?? []) as { id: string; name: string }[]

  const assetTypes: AssetType[] = ['tank_stationary', 'tank_transport', 'gas_network', 'metal_structure']
  const statuses: AssetStatus[] = ['active', 'out_of_service', 'decommissioned']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activos</h1>
          <p className="text-sm text-muted-foreground">{assets?.length ?? 0} encontrados</p>
        </div>
        <Link href="/admin/assets/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Activo
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/assets">
          <Badge variant={!filters.type && !filters.status && !filters.customer ? 'default' : 'outline'}>
            Todos
          </Badge>
        </Link>
        {assetTypes.map((t) => (
          <Link key={t} href={`/admin/assets?type=${t}`}>
            <Badge variant={filters.type === t ? 'default' : 'outline'}>
              {ASSET_TYPE_LABELS[t]}
            </Badge>
          </Link>
        ))}
        <span className="text-muted-foreground text-sm self-center">|</span>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/assets?status=${s}`}>
            <Badge variant={filters.status === s ? 'default' : 'outline'}>
              {STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
        {customers?.length > 0 && (
          <>
            <span className="text-muted-foreground text-sm self-center">|</span>
            <CustomerFilter customers={customers} value={filters.customer ?? ''} />
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>N° Serie</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets?.map((a) => (
              <TableRow key={a.id} className="group">
                <TableCell className="font-mono text-sm font-medium">{a.tag}</TableCell>
                <TableCell className="text-sm">{ASSET_TYPE_LABELS[a.asset_type]}</TableCell>
                <TableCell className="text-sm">{a.customers?.name ?? '—'}</TableCell>
                <TableCell className="text-sm">{a.locations?.name ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{a.serial_number ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/assets/${a.id}`} className={buttonVariants({ size: 'icon', variant: 'ghost', className: 'opacity-0 group-hover:opacity-100' })}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!assets?.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sin activos con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
