import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Plus } from 'lucide-react'
import { formatCOP } from '@/lib/work-orders/costs'
import type { WorkOrder, WoStatus, WoType } from '@/lib/database.types'

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

type WoRow = WorkOrder & { customers: { name: string } | null }

export default async function WoMaterialsPage() {
  const profile = await getProfile()
  if (!profile || profile.role === 'client') redirect('/admin')
  const canEdit = profile.role === 'admin' || profile.role === 'engineer'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const [{ data: rawWOs }, { data: mats }, { data: exps }, { data: works }] = await Promise.all([
    supabase.from('work_orders').select('*, customers(name)').order('created_at', { ascending: false }),
    supabase.from('work_order_materials').select('work_order_id, quantity, unit_price'),
    supabase.from('work_order_expenses').select('work_order_id, amount'),
    supabase.from('work_order_workers').select('work_order_id, days_worked, daily_rate'),
  ])

  const totals = new Map<string, number>()
  const add = (id: string, v: number) => totals.set(id, (totals.get(id) ?? 0) + v)
  for (const m of (mats ?? []) as { work_order_id: string; quantity: number; unit_price: number }[])
    add(m.work_order_id, Number(m.quantity) * Number(m.unit_price))
  for (const e of (exps ?? []) as { work_order_id: string; amount: number }[])
    add(e.work_order_id, Number(e.amount))
  for (const w of (works ?? []) as { work_order_id: string; days_worked: number; daily_rate: number }[])
    add(w.work_order_id, Number(w.days_worked) * Number(w.daily_rate))

  const workOrders = (rawWOs ?? []) as WoRow[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de Trabajo y Materiales</h1>
          <p className="text-sm text-muted-foreground">
            Cliente, materiales con precio, viáticos, personal y reporte en un solo lugar
          </p>
        </div>
        {canEdit && (
          <Link href="/admin/wo-materials/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva OT
          </Link>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° OT</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id}>
                <TableCell className="font-mono text-sm font-medium">{wo.wo_number}</TableCell>
                <TableCell className="text-sm">{wo.customers?.name ?? '—'}</TableCell>
                <TableCell className="text-sm">{WO_TYPE_LABELS[wo.wo_type]}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCOP(totals.get(wo.id) ?? 0)}
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <Link
                      href={`/admin/wo-materials/${wo.id}/edit`}
                      className={buttonVariants({ size: 'icon', variant: 'ghost' })}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!workOrders.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin órdenes de trabajo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
