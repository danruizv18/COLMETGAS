import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
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
import { Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  expensesTotal,
  formatCOP,
  materialsTotal,
  workersTotal,
  type ExpenseLine,
  type MaterialLine,
  type WorkerLine,
} from '@/lib/work-orders/costs'
import type { WorkOrder, WoStatus, WoType } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const WO_TYPE_LABELS: Record<WoType, string> = {
  maintenance: 'Mantenimiento',
  installation: 'Instalación',
  manufacture: 'Fabricación ASME',
  fabrication: 'Fabricación Estructural',
}

const STATUS_LABELS: Record<WoStatus, string> = {
  draft: 'Borrador',
  in_progress: 'En Ejecución',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

type WoRow = WorkOrder & { customers: { name: string } | null; incident_report: string | null }

export default async function WoDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>
}) {
  const profile = await getProfile()
  if (!profile || profile.role === 'client') redirect('/admin')

  const { q = '', id } = await searchParams
  // Se limpian los caracteres que rompen la sintaxis de filtros de PostgREST.
  const term = q.replace(/[,()%*\\]/g, ' ').trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // ── Búsqueda ────────────────────────────────────────────
  let results: WoRow[] = []
  if (term) {
    const { data: custs } = await supabase.from('customers').select('id').ilike('name', `%${term}%`)
    const custIds = ((custs ?? []) as { id: string }[]).map((c) => c.id)
    const filters = [`wo_number.ilike.%${term}%`, `notes.ilike.%${term}%`]
    if (custIds.length) filters.push(`customer_id.in.(${custIds.join(',')})`)

    const { data } = await supabase
      .from('work_orders')
      .select('*, customers(name)')
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(25)
    results = (data ?? []) as WoRow[]
  }

  // ── Detalle ─────────────────────────────────────────────
  let wo: WoRow | null = null
  let materials: MaterialLine[] = []
  let expenses: ExpenseLine[] = []
  let workers: WorkerLine[] = []

  if (id) {
    const [{ data: rawWO }, { data: m }, { data: e }, { data: w }] = await Promise.all([
      supabase.from('work_orders').select('*, customers(name)').eq('id', id).single(),
      supabase.from('work_order_materials').select('*').eq('work_order_id', id).order('created_at'),
      supabase.from('work_order_expenses').select('*').eq('work_order_id', id).order('created_at'),
      supabase.from('work_order_workers').select('*').eq('work_order_id', id).order('created_at'),
    ])
    wo = (rawWO as WoRow | null) ?? null
    materials = (m ?? []) as MaterialLine[]
    expenses = (e ?? []) as ExpenseLine[]
    workers = (w ?? []) as WorkerLine[]
  }

  const matTotal = materialsTotal(materials)
  const expTotal = expensesTotal(expenses)
  const workTotal = workersTotal(workers)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Detalles de Órdenes de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Consulte una OT: descripción, gastos de materiales, viáticos y personal, y su reporte
        </p>
      </div>

      <form method="get" className="flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por N° de OT, cliente o descripción"
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" className={buttonVariants()}>
          <Search className="mr-2 h-4 w-4" />
          Buscar
        </button>
      </form>

      {term && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° OT</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.id} className={r.id === id ? 'bg-muted/50' : undefined}>
                  <TableCell className="font-mono text-sm font-medium">{r.wo_number}</TableCell>
                  <TableCell className="text-sm">{r.customers?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{WO_TYPE_LABELS[r.wo_type]}</TableCell>
                  <TableCell className="text-sm">{STATUS_LABELS[r.status]}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/wo-details?q=${encodeURIComponent(q)}&id=${r.id}`}
                      className={buttonVariants({ size: 'sm', variant: 'outline' })}
                    >
                      Ver detalle
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!results.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No se encontraron órdenes de trabajo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {id && !wo && <p className="text-sm text-muted-foreground">No se encontró la orden seleccionada.</p>}

      {wo && (
        <div className="space-y-4">
          <div>
            <h2 className="font-mono text-xl font-bold">{wo.wo_number}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{STATUS_LABELS[wo.status]}</Badge>
              <span>{WO_TYPE_LABELS[wo.wo_type]}</span>
              <span>·</span>
              <span>{wo.customers?.name ?? '—'}</span>
              {(wo.start_date || wo.end_date) && (
                <>
                  <span>·</span>
                  <span>
                    {wo.start_date ?? '—'} → {wo.end_date ?? '—'}
                  </span>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{wo.notes || 'Sin descripción'}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Materiales</p>
                <p className="text-lg font-semibold">{formatCOP(matTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Viáticos</p>
                <p className="text-lg font-semibold">{formatCOP(expTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Personal</p>
                <p className="text-lg font-semibold">{formatCOP(workTotal)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total general</p>
                <p className="text-lg font-bold">{formatCOP(matTotal + expTotal + workTotal)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Materiales ({materials.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{m.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(m.quantity)} {m.unit ?? ''}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCOP(Number(m.unit_price))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCOP(Number(m.quantity) * Number(m.unit_price))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!materials.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Sin materiales
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Viáticos ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCOP(Number(e.amount))}</TableCell>
                    </TableRow>
                  ))}
                  {!expenses.length && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                        Sin viáticos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal ({workers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead className="text-right">Días</TableHead>
                    <TableHead className="text-right">Pago por día</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{w.worker_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{Number(w.days_worked)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCOP(Number(w.daily_rate))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCOP(Number(w.days_worked) * Number(w.daily_rate))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!workers.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Sin personal
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reporte / imprevistos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {wo.incident_report || 'Sin reporte registrado'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
