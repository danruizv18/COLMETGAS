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
import { buttonVariants } from '@/components/ui/button'
import type { WorkOrder, WoStatus, WoType } from '@/lib/database.types'

type WoRow = WorkOrder & { customers: { name: string } | null }

export const dynamic = 'force-dynamic'

const WO_TYPE_LABELS: Record<WoType, string> = {
  maintenance: 'Mantenimiento',
  installation: 'Instalación',
  manufacture: 'Fab. ASME',
  fabrication: 'Fab. Estructural',
}

const STATUS_LABELS: Record<WoStatus, string> = {
  draft: 'Borrador',
  in_progress: 'En Ejecución',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const STATUS_VARIANT: Record<WoStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const filters = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let query = supabase
    .from('work_orders')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('wo_type', filters.type)

  const { data: rawWOs } = await query
  const workOrders = (rawWOs ?? []) as WoRow[]

  const statuses: WoStatus[] = ['draft', 'in_progress', 'completed', 'cancelled']
  const types: WoType[] = ['maintenance', 'installation', 'manufacture', 'fabrication']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-sm text-muted-foreground">{workOrders.length} encontradas</p>
        </div>
        <Link href="/admin/work-orders/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva OT
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/work-orders">
          <Badge variant={!filters.status && !filters.type ? 'default' : 'outline'}>Todas</Badge>
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/work-orders?status=${s}`}>
            <Badge variant={filters.status === s ? 'default' : 'outline'}>{STATUS_LABELS[s]}</Badge>
          </Link>
        ))}
        <span className="text-muted-foreground text-sm self-center">|</span>
        {types.map((t) => (
          <Link key={t} href={`/admin/work-orders?type=${t}`}>
            <Badge variant={filters.type === t ? 'default' : 'outline'}>{WO_TYPE_LABELS[t]}</Badge>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° OT</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id} className="group">
                <TableCell className="font-mono text-sm font-medium">{wo.wo_number}</TableCell>
                <TableCell className="text-sm">{wo.customers?.name ?? '—'}</TableCell>
                <TableCell className="text-sm">{WO_TYPE_LABELS[wo.wo_type]}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{wo.start_date ?? '—'}</TableCell>
                <TableCell className="text-sm">{wo.end_date ?? '—'}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/work-orders/${wo.id}`}
                    className={buttonVariants({
                      size: 'icon',
                      variant: 'ghost',
                      className: 'opacity-0 group-hover:opacity-100',
                    })}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!workOrders.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sin órdenes de trabajo.{' '}
                  <Link href="/admin/work-orders/new" className="underline">
                    Crear una
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
