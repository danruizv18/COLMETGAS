import { createServiceClient as createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink, Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsumptionByWO = {
  id: string
  quantity_used: number
  used_date: string
  mtrUrl: string | null
  material_batches: {
    id: string
    batch_number: string
    heat_number: string | null
    supplier: string | null
    mtr_file_path: string | null
    materials: {
      description: string
      specification: string | null
      unit_of_measure: string
      material_categories: { name: string }
    }
  }
}

type BatchByHeat = {
  id: string
  batch_number: string
  heat_number: string | null
  supplier: string | null
  mtr_file_path: string | null
  mtrUrl: string | null
  materials: { description: string; specification: string | null }
  material_consumption: {
    id: string
    quantity_used: number
    used_date: string
    work_orders: { id: string; wo_number: string } | null
  }[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ wo?: string; heat?: string }>
}) {
  const { wo: woId, heat: heatFilter } = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, wo_number, customers(name)')
    .order('wo_number')

  // ── By work order ──────────────────────────────────────────────────────────
  let consumptionsByWO: ConsumptionByWO[] = []
  let selectedWO: { id: string; wo_number: string; customers: { name: string } | null } | null = null

  if (woId) {
    selectedWO = (workOrders ?? []).find((w: { id: string }) => w.id === woId) ?? null

    const { data: rawCons } = await supabase
      .from('material_consumption')
      .select(`
        id, quantity_used, used_date,
        material_batches!inner(
          id, batch_number, heat_number, supplier, mtr_file_path,
          materials!inner(
            description, specification, unit_of_measure,
            material_categories!inner(name)
          )
        )
      `)
      .eq('work_order_id', woId)
      .order('used_date', { ascending: false })

    consumptionsByWO = await Promise.all(
      ((rawCons ?? []) as ConsumptionByWO[]).map(async (c) => {
        let mtrUrl: string | null = null
        if (c.material_batches?.mtr_file_path) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(c.material_batches.mtr_file_path, 3600)
          mtrUrl = data?.signedUrl ?? null
        }
        return { ...c, mtrUrl }
      })
    )
  }

  // ── By heat number ─────────────────────────────────────────────────────────
  let batchesByHeat: BatchByHeat[] = []

  if (heatFilter) {
    const { data: rawBatches } = await supabase
      .from('material_batches')
      .select(`
        id, batch_number, heat_number, supplier, mtr_file_path,
        materials!inner(description, specification),
        material_consumption(
          id, quantity_used, used_date,
          work_orders(id, wo_number)
        )
      `)
      .ilike('heat_number', `%${heatFilter}%`)

    batchesByHeat = await Promise.all(
      ((rawBatches ?? []) as BatchByHeat[]).map(async (b) => {
        let mtrUrl: string | null = null
        if (b.mtr_file_path) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(b.mtr_file_path, 3600)
          mtrUrl = data?.signedUrl ?? null
        }
        return { ...b, mtrUrl }
      })
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trazabilidad de Materiales</h1>
        <p className="text-sm text-muted-foreground">
          Consulta la cadena de trazabilidad ASME: de la orden al lote, al heat number y al MTR
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Filter: by work order */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              Por Orden de Trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="GET">
              <div className="flex gap-2">
                <select
                  name="wo"
                  defaultValue={woId ?? ''}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccionar OT...</option>
                  {(workOrders ?? []).map((w: { id: string; wo_number: string; customers: { name: string } | null }) => (
                    <option key={w.id} value={w.id}>
                      {w.wo_number} – {w.customers?.name ?? ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Buscar
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filter: by heat number */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              Por Número de Colada (Heat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="GET">
              <div className="flex gap-2">
                <input
                  name="heat"
                  defaultValue={heatFilter ?? ''}
                  placeholder="H-2026-001"
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Buscar
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results: by work order */}
      {woId && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">
                OT: {selectedWO?.wo_number ?? woId}
              </CardTitle>
              {selectedWO?.customers && (
                <p className="text-sm text-muted-foreground">{selectedWO.customers.name}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Especificación</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Colada (Heat)</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>MTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptionsByWO.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">
                      {c.material_batches?.materials?.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.material_batches?.materials?.specification ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.material_batches?.materials?.material_categories?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.material_batches?.batch_number}</TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {c.material_batches?.heat_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{c.material_batches?.supplier ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(c.quantity_used).toFixed(3)}{' '}
                      {c.material_batches?.materials?.unit_of_measure}
                    </TableCell>
                    <TableCell className="text-sm">{c.used_date}</TableCell>
                    <TableCell>
                      {c.mtrUrl ? (
                        <a
                          href={c.mtrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          MTR
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin MTR</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!consumptionsByWO.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Esta OT no tiene consumos de material registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Results: by heat number */}
      {heatFilter && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Resultados para colada: <span className="font-mono">{heatFilter}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {batchesByHeat.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron lotes con ese número de colada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colada (Heat)</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead className="text-right">Cantidad Usada</TableHead>
                    <TableHead>Fecha Uso</TableHead>
                    <TableHead>MTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchesByHeat.map((b) =>
                    b.material_consumption?.length ? (
                      b.material_consumption.map((mc) => (
                        <TableRow key={mc.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {b.heat_number}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{b.batch_number}</TableCell>
                          <TableCell className="text-sm">{b.materials?.description}</TableCell>
                          <TableCell className="text-sm">{b.supplier ?? '—'}</TableCell>
                          <TableCell>
                            {mc.work_orders ? (
                              <a
                                href={`/admin/work-orders/${mc.work_orders.id}`}
                                className="font-mono text-sm text-primary hover:underline"
                              >
                                {mc.work_orders.wo_number}
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {Number(mc.quantity_used).toFixed(3)}
                          </TableCell>
                          <TableCell className="text-sm">{mc.used_date}</TableCell>
                          <TableCell>
                            {b.mtrUrl ? (
                              <a
                                href={b.mtrUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                MTR
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin MTR</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-sm font-medium">{b.heat_number}</TableCell>
                        <TableCell className="font-mono text-sm">{b.batch_number}</TableCell>
                        <TableCell className="text-sm">{b.materials?.description}</TableCell>
                        <TableCell className="text-sm">{b.supplier ?? '—'}</TableCell>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Sin consumos registrados
                        </TableCell>
                        <TableCell>
                          {b.mtrUrl ? (
                            <a
                              href={b.mtrUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              MTR
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin MTR</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!woId && !heatFilter && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona una orden de trabajo o ingresa un número de colada para consultar la cadena de trazabilidad</p>
        </div>
      )}
    </div>
  )
}
