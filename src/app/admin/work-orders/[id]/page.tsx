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
import { Pencil, Plus, FileText, ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ConsumptionForm } from '@/components/materials/consumption-form'
import { recordConsumption } from '@/lib/actions/materials'
import type { WorkOrder, WoStatus, WoType } from '@/lib/database.types'
import type { BatchOption } from '@/components/materials/consumption-form'

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

const STATUS_VARIANT: Record<WoStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

type ConsumptionRow = {
  id: string
  quantity_used: number
  used_date: string
  material_batches: {
    id: string
    batch_number: string
    heat_number: string | null
    supplier: string | null
    mtr_file_path: string | null
    materials: { description: string; unit_of_measure: string }
  }
  mtrUrl: string | null
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: rawWO }, { data: rawConsumptions }, { data: rawBatches }, { data: rawStock }] =
    await Promise.all([
      supabase
        .from('work_orders')
        .select('*, customers(name)')
        .eq('id', id)
        .single(),
      supabase
        .from('material_consumption')
        .select(`
          id, quantity_used, used_date,
          material_batches!inner(
            id, batch_number, heat_number, supplier, mtr_file_path,
            materials!inner(description, unit_of_measure)
          )
        `)
        .eq('work_order_id', id)
        .order('used_date', { ascending: false }),
      supabase
        .from('material_batches')
        .select('id, batch_number, heat_number, material_id, materials!inner(id, description, unit_of_measure)'),
      supabase.from('v_batch_stock').select('batch_id, available'),
    ])

  if (!rawWO) notFound()

  const wo = rawWO as WorkOrder & { customers: { name: string } | null }

  // Build signed URLs for MTR files in consumptions
  const consumptions: ConsumptionRow[] = await Promise.all(
    ((rawConsumptions ?? []) as ConsumptionRow[]).map(async (c) => {
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

  // Build batch options for consumption form
  const stockMap: Record<string, number> = {}
  for (const s of rawStock ?? []) stockMap[s.batch_id] = Number(s.available)

  const batchOptions: BatchOption[] = ((rawBatches ?? []) as {
    id: string
    batch_number: string
    heat_number: string | null
    material_id: string
    materials: { id: string; description: string; unit_of_measure: string }
  }[])
    .filter((b) => (stockMap[b.id] ?? 0) > 0)
    .map((b) => ({
      id: b.id,
      batch_number: b.batch_number,
      heat_number: b.heat_number,
      material_id: b.material_id,
      material_description: b.materials.description,
      unit_of_measure: b.materials.unit_of_measure,
      available: stockMap[b.id] ?? 0,
    }))

  const consumptionAction = recordConsumption.bind(null, id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">{wo.wo_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
            <span className="text-sm text-muted-foreground">{WO_TYPE_LABELS[wo.wo_type]}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{wo.customers?.name ?? '—'}</span>
          </div>
        </div>
        <Link
          href={`/admin/work-orders/${id}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      {(wo.start_date || wo.end_date || wo.notes) && (
        <div className="grid gap-4 md:grid-cols-3">
          {wo.start_date && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium">{wo.start_date}</p>
              </CardContent>
            </Card>
          )}
          {wo.end_date && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Fin</p>
                <p className="font-medium">{wo.end_date}</p>
              </CardContent>
            </Card>
          )}
          {wo.notes && (
            <Card className="md:col-span-3">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm">{wo.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Consumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Materiales Consumidos ({consumptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Colada (Heat)</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Fecha Uso</TableHead>
                <TableHead>MTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm font-medium">
                    {c.material_batches?.materials?.description}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{c.material_batches?.batch_number}</TableCell>
                  <TableCell className="font-mono text-sm">{c.material_batches?.heat_number ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.material_batches?.supplier ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(c.quantity_used).toFixed(3)} {c.material_batches?.materials?.unit_of_measure}
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
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!consumptions.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin consumos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record consumption */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Consumo de Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batchOptions.length > 0 ? (
            <ConsumptionForm action={consumptionAction} batches={batchOptions} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay lotes con stock disponible.{' '}
              <Link href="/admin/materials" className="underline">
                Registrar un lote
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="text-sm">
        <Link href={`/admin/traceability?wo=${id}`} className="text-primary hover:underline">
          Ver trazabilidad completa de esta OT →
        </Link>
      </div>
    </div>
  )
}
